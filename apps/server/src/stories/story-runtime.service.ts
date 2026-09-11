import {
  BadRequestException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';
import ivm from 'isolated-vm';
import { ConfigService } from 'src/config/config.service';
import {
  type StoryEngineContext,
  type StoryData,
  type StoryPassage,
  parseStorySource,
  applyStoryAction,
  renderStoryText,
  buildInitialVariables,
  detectRenderSpecials,
  StoryRenderSpecials,
} from 'tellory';

type Variables = Record<string, unknown>;

type Passage = StoryPassage;

interface RuntimeState {
  version: 1;
  storyId: string;
  title: string;
  currentPassage: string;
  passages: Passage[];
  functions: Record<string, string>;
  variables: Variables;
  displayedPassages: string[];
}

export interface RuntimeResponse {
  dataset: string;
  passage: string;
  html: string;
  variables: Variables;
  specials?: StoryRenderSpecials;
}

const FUNCTION_TIMEOUT_MS = 50;
const EXPRESSION_TIMEOUT_MS = 25;

@Injectable()
export class StoryRuntimeService {
  start(storyId: string, source: string): RuntimeResponse {
    const parsed = this.parseStory(source);
    const variables: Variables = {
      passage: parsed.startPassage,
      storyTitle: parsed.title,
      prevPassage: '',
    };
    Object.assign(variables, buildInitialVariables(parsed));

    return this.renderAndSeal(
      {
        version: 1,
        storyId,
        title: parsed.title,
        currentPassage: parsed.startPassage,
        passages: parsed.passages,
        functions: this.collectFunctions(parsed.passages),
        variables,
        displayedPassages: [],
      },
      true,
    );
  }

  execute(
    dataset: string,
    target?: string,
    action?: string,
    display?: string,
  ): RuntimeResponse {
    const state = this.decryptDataset(dataset);
    const ctx = this.buildContext(state);
    // decrypt target/action which are expected to be encrypted data-* attribute values
    let decodedAction: string | undefined;
    if (action) {
      decodedAction = this.decryptAttribute(action);
      applyStoryAction(decodedAction, state.variables, ctx);
    }
    if (target) this.changePassage(state, this.decryptAttribute(target));
    if (display) {
      const displayTarget = this.decryptAttribute(display);
      this.getPassage(state, displayTarget);
      if (!state.displayedPassages.includes(displayTarget)) {
        state.displayedPassages.push(displayTarget);
      }
    }
    return this.renderAndSeal(state, Boolean(target), decodedAction);
  }

  private renderAndSeal(
    state: RuntimeState,
    applyEntryEffects: boolean,
    action?: string,
  ): RuntimeResponse {
    state.displayedPassages ??= [];
    const passage = this.getPassage(state, state.currentPassage);
    const ctx = this.buildContext(state);
    const storyData = this.toStoryData(state);

    // Render/detect with a pre-entry snapshot so `(if:)` conditions see the
    // values from before entry-time `(set:)` effects ran. `renderStoryText`
    // applies those effects to the persistent state when applyEntryEffects is
    // true.
    const renderVariables: Variables = JSON.parse(
      JSON.stringify(state.variables),
    );

    // Detect specials first: renderStoryText consumes the point queue.
    const specials = detectRenderSpecials(
      passage.content,
      renderVariables,
      storyData,
      ctx,
      {
        applyEntryEffects,
        ...(action ? { action } : {}),
      },
    );

    const html = renderStoryText(
      passage.content,
      state.variables,
      storyData,
      ctx,
      { applyEntryEffects, renderVariables },
    );

    return {
      dataset: this.encryptDataset(state),
      passage: state.currentPassage,
      html,
      variables: { ...state.variables },
      specials,
    };
  }

  private toStoryData(state: RuntimeState): StoryData {
    return {
      title: state.title,
      startPassage: state.currentPassage,
      passages: state.passages,
    };
  }

  // Builds the shared renderer's dependency-injection context: expression
  // evaluation and function calls run inside the isolated-vm sandbox, and
  // link target/action attributes are AES-256-GCM encrypted before being
  // embedded in rendered HTML (the browser's default context leaves them
  // as-is since it doesn't need to hide them).
  private buildContext(state: RuntimeState): StoryEngineContext {
    return {
      functions: state.functions,
      evaluate: (expression, variables) =>
        this.evaluateInSandbox(expression, variables),
      callFunction: (name, args, variables) => {
        const code = state.functions[name];
        if (!code) return undefined;
        const output = this.runInSandbox(
          `(function () { ${code}\n })()`,
          variables,
          args,
          FUNCTION_TIMEOUT_MS,
        );
        Object.assign(variables, output.variables);
        return output.result;
      },
      encodeAttribute: (value) => this.encryptAttribute(value),
      decodeAttribute: (value) => this.decryptAttribute(value),
      displayPassages: Object.fromEntries(
        state.displayedPassages.map((passage) => [passage, true]),
      ),
    };
  }

  private evaluateInSandbox(expression: string, variables: Variables): unknown {
    const compiled = expression
      .replace(
        /\$([A-Za-z_][A-Za-z0-9_]*)/g,
        (_all, name: string) => `vars[${JSON.stringify(name)}]`,
      )
      .replace(/\bis not\b|\bne\b/gi, '!==')
      .replace(/\bis\b|\beq\b/gi, '===')
      .replace(/\band\b/gi, '&&')
      .replace(/\bor\b/gi, '||')
      .replace(/\bnot\b/gi, '!');
    return this.runInSandbox(
      `(${compiled})`,
      variables,
      [],
      EXPRESSION_TIMEOUT_MS,
    ).result;
  }

  private parseStory(source: string): {
    title: string;
    startPassage: string;
    passages: Passage[];
  } {
    const story = parseStorySource(source);
    return {
      title: story.title,
      startPassage: story.startPassage,
      passages: story.passages,
    };
  }

  private collectFunctions(passages: Passage[]): Record<string, string> {
    const functions: Record<string, string> = {};
    for (const passage of passages) {
      passage.content.replace(
        /\(fn:\s*["']([^"']+)["']\)\s*\[([\s\S]*?)\]/g,
        (_all, name: string, code: string) => {
          functions[name] = code;
          return '';
        },
      );
    }
    return functions;
  }

  private changePassage(state: RuntimeState, target: string): void {
    const next = target.trim();
    this.getPassage(state, next);
    state.variables.prevPassage = state.currentPassage;
    state.currentPassage = next;
    state.variables.passage = next;
  }

  private runInSandbox(
    scriptSource: string,
    variables: Variables,
    args: unknown[],
    timeout: number,
  ): { result: unknown; variables: Variables } {
    const isolate = new ivm.Isolate({ memoryLimit: 8 });
    try {
      const context = isolate.createContextSync();
      context.global.setSync(
        'vars',
        new ivm.ExternalCopy(variables).copyInto(),
      );
      context.global.setSync('args', new ivm.ExternalCopy(args).copyInto());
      const script = isolate.compileScriptSync(
        `const result = ${scriptSource}; ({ result, variables: vars });`,
      );
      return script.runSync(context, { timeout, copy: true }) as {
        result: unknown;
        variables: Variables;
      };
    } catch {
      return { result: undefined, variables };
    } finally {
      isolate.dispose();
    }
  }

  private getPassage(state: RuntimeState, name: string): Passage {
    const passage = state.passages.find((item) => item.name === name);
    if (!passage) throw new BadRequestException(`段落不存在: ${name}`);
    return passage;
  }

  private encryptDataset(state: RuntimeState): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey(), iv);
    const body = Buffer.concat([
      cipher.update(JSON.stringify(state), 'utf8'),
      cipher.final(),
    ]);
    return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64url');
  }

  private encryptAttribute(value: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey(), iv);
    const body = Buffer.concat([
      cipher.update(String(value), 'utf8'),
      cipher.final(),
    ]);
    return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64url');
  }

  private decryptAttribute(encrypted: string): string {
    try {
      const payload = Buffer.from(encrypted, 'base64url');
      if (payload.length < 29) throw new Error('invalid attribute payload');
      const decipher = createDecipheriv(
        'aes-256-gcm',
        this.encryptionKey(),
        payload.subarray(0, 12),
      );
      decipher.setAuthTag(payload.subarray(12, 28));
      const plain = Buffer.concat([
        decipher.update(payload.subarray(28)),
        decipher.final(),
      ]).toString('utf8');
      return plain;
    } catch {
      throw new BadRequestException('无效或已篡改的交互属性');
    }
  }

  // Public helper for controllers/services to decode encrypted data-* attributes
  decodeInteraction(encrypted: string): string {
    try {
      if (!encrypted) return '';
      return this.decryptAttribute(encrypted);
    } catch {
      return encrypted;
    }
  }

  private decryptDataset(dataset: string): RuntimeState {
    try {
      const payload = Buffer.from(dataset, 'base64url');
      if (payload.length < 29) throw new Error('invalid dataset');
      const decipher = createDecipheriv(
        'aes-256-gcm',
        this.encryptionKey(),
        payload.subarray(0, 12),
      );
      decipher.setAuthTag(payload.subarray(12, 28));
      const state = JSON.parse(
        Buffer.concat([
          decipher.update(payload.subarray(28)),
          decipher.final(),
        ]).toString('utf8'),
      ) as RuntimeState;
      if (state.version !== 1) {
        throw new Error('expired dataset');
      }
      return state;
    } catch {
      throw new BadRequestException('无效或已过期的故事 dataset');
    }
  }

  private encryptionKey(): Buffer {
    const configured =
      process.env.STORY_RUNTIME_AES_KEY || ConfigService.get('salt');
    if (!configured) {
      throw new ServiceUnavailableException('STORY_RUNTIME_AES_KEY 未配置');
    }
    if (/^[a-f0-9]{64}$/i.test(configured))
      return Buffer.from(configured, 'hex');
    const decoded = Buffer.from(configured, 'base64');
    if (decoded.length === 32) return decoded;
    return createHash('sha256').update(configured).digest();
  }
}
