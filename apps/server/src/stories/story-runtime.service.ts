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

type Variables = Record<string, unknown>;

interface Passage {
  name: string;
  content: string;
}

interface RuntimeState {
  version: 1;
  expiresAt: number;
  storyId: string;
  title: string;
  currentPassage: string;
  passages: Passage[];
  functions: Record<string, string>;
  variables: Variables;
}

export interface RuntimeResponse {
  dataset: string;
  passage: string;
  html: string;
  variables: Variables;
}

const DATASET_TTL_MS = 60 * 60 * 1000;
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
    for (const passage of parsed.passages) {
      for (const match of passage.content.matchAll(
        /\$([A-Za-z_][A-Za-z0-9_]*)/g,
      )) {
        variables[match[1]] ??= 0;
      }
    }

    return this.renderAndSeal(
      {
        version: 1,
        expiresAt: Date.now() + DATASET_TTL_MS,
        storyId,
        title: parsed.title,
        currentPassage: parsed.startPassage,
        passages: parsed.passages,
        functions: this.collectFunctions(parsed.passages),
        variables,
      },
      true,
    );
  }

  execute(dataset: string, target?: string, action?: string): RuntimeResponse {
    const state = this.decryptDataset(dataset);
    // decrypt target/action which are expected to be encrypted data-* attribute values
    if (action) this.applyAction(state, this.decryptAttribute(action));
    if (target) this.changePassage(state, this.decryptAttribute(target));
    state.expiresAt = Date.now() + DATASET_TTL_MS;
    return this.renderAndSeal(state, Boolean(target));
  }

  private renderAndSeal(
    state: RuntimeState,
    applyEntryEffects: boolean,
  ): RuntimeResponse {
    const passage = this.getPassage(state, state.currentPassage);
    if (applyEntryEffects) this.applySetMacros(passage.content, state);
    return {
      dataset: this.encryptDataset(state),
      passage: state.currentPassage,
      html: this.render(passage.content, state),
      variables: { ...state.variables },
    };
  }

  private parseStory(source: string): {
    title: string;
    startPassage: string;
    passages: Passage[];
  } {
    const normalized = source.replace(/\r\n/g, '\n').trim();
    const title =
      normalized.match(/^\s*标题\s*[:：]\s*(.+)$/m)?.[1]?.trim() ||
      'Interactive Story';
    const passages = normalized
      .split(/\n\s*(?=段落\s+"[^\\"]+"\s*[:：]|::\s*\S)/)
      .flatMap((block) => {
        const match = block
          .trim()
          .match(
            /^(?:段落\s+"([^\\"]+)"\s*[:：]|::\s*([^\n]+))\s*\n?([\s\S]*)$/,
          );
        if (!match) return [];
        const rawName = (match[1] ?? match[2]).trim();
        return [
          {
            name: rawName.replace(/\s*\[.*\]\s*$/, '').trim(),
            content: (match[3] ?? '').trim(),
          },
        ];
      });
    if (!passages.length) {
      passages.push({ name: 'Start', content: normalized || '新故事开始了。' });
    }
    const explicitStart = normalized
      .match(/^\s*(?:起始段落|起始)\s*[:：]\s*(.+)$/m)?.[1]
      ?.trim();
    return { title, startPassage: explicitStart || passages[0].name, passages };
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

  private applyAction(state: RuntimeState, action: string): void {
    const cleaned = action
      .trim()
      .replace(/^\(+|\)+$/g, '')
      .trim();
    const set = cleaned.match(
      /^set:\s*(\$[A-Za-z_][A-Za-z0-9_]*)\s+to\s+([\s\S]+)$/i,
    );
    if (set) {
      state.variables[set[1].slice(1)] = this.evaluate(set[2], state);
      return;
    }
    const call = cleaned.match(/^call:\s*["']([^"']+)["']([\s\S]*)$/i);
    if (call) this.callFunction(state, call[1], this.parseArgs(call[2], state));
  }

  private applySetMacros(content: string, state: RuntimeState): void {
    for (const match of content.matchAll(
      /\(set:\s*(\$[A-Za-z_][A-Za-z0-9_]*)\s+to\s+([\s\S]*?)\)/gi,
    )) {
      state.variables[match[1].slice(1)] = this.evaluate(match[2], state);
    }
  }

  private render(content: string, state: RuntimeState): string {
    // preserve <style> blocks to avoid escaping their contents
    const styleBlocks: string[] = [];
    const working = content.replace(
      /<style\b[^>]*>[\s\S]*?<\/style>/gi,
      (m) => {
        const ph = `$STYLE_BLOCK$${styleBlocks.length}$`;
        styleBlocks.push(m);
        return ph;
      },
    );

    let text = working.replace(
      /\(fn:\s*["'][^"']+["']\)\s*\[([\s\S]*?)\]/g,
      '',
    );
    text = text.replace(
      /\(set:\s*\$[A-Za-z_][A-Za-z0-9_]*\s+to\s+[\s\S]*?\)/gi,
      '',
    );
    text = this.replaceConditions(text, state);
    text = text.replace(
      /\(call:\s*["']([^"']+)["']([\s\S]*?)\)/gi,
      (_all, name: string, args: string) =>
        String(
          // eslint-disable-next-line @typescript-eslint/no-base-to-string
          this.callFunction(state, name, this.parseArgs(args, state)) ?? '',
        ),
    );
    text = text.replace(/\(print:\s*([^)]*?)\)/gi, (_all, expression: string) =>
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      String(this.evaluate(expression, state) ?? ''),
    );

    const links: string[] = [];
    const htmlFragments: string[] = [];
    // support display macro: embed another passage's rendered HTML
    text = text.replace(
      /\(display:\s*["']([^"']+)["']\s*\)/g,
      (_all, targetName: string) => {
        const passage = state.passages.find((p) => p.name === targetName);
        if (!passage) return '';
        const placeholder = `$HTML_FRAGMENT$${htmlFragments.length}$`;
        // render fragment without applying entry effects
        htmlFragments.push(this.render(passage.content, state));
        return placeholder;
      },
    );

    text = text.replace(
      /\[\[([^\]|]+)(?:\|([^\]]+))?\]\](?:\((set:\s*[^)]+|call:\s*[^)]+)\))?/g,
      (_all, label: string, target?: string, action?: string) => {
        const marker = `@@LINK${links.length}@@`;
        links.push(this.link(label.trim(), (target ?? label).trim(), action));
        return marker;
      },
    );

    // Support (link:"label")[(goto:"Target")] style links (Twine-style)
    text = text.replace(
      /\(link:\s*(?:["']([^"']*)["']|([^\\)]*?))\)\s*\[((?:.|\n)*?)\]/g,
      (_all, literalLabel: string, rawLabel: string, actionBlock: string) => {
        const label = (literalLabel || rawLabel || '继续').trim();
        const gotoMatch = (actionBlock || '').match(
          /goto:\s*(?:["']([^"']+)["']|([^\\]\)\s]+))/i,
        );
        const target = (
          gotoMatch ? (gotoMatch[1] ?? gotoMatch[2]) : label
        ).trim();
        const actionMatch = (actionBlock || '').match(
          /(?:set:\s*[^)\]]+|call:\s*[^)\]]+)/i,
        );
        const actionAttr = actionMatch ? actionMatch[0] : undefined;
        links.push(this.link(label, target, actionAttr));
        return `@@LINK${links.length - 1}@@`;
      },
    );

    // apply simple formatting first (do NOT convert newlines here)
    let html = text
      .replace(/''([^']+)''/g, '<strong>$1</strong>')
      .replace(/~~([^~]+)~~/g, '<del>$1</del>');
    // insert links (raw button HTML)
    html = links.reduce(
      (result, link, index) => result.replace(`@@LINK${index}@@`, link),
      html,
    );
    // insert HTML fragments back
    html = html.replace(
      /\$HTML_FRAGMENT\$(\d+)\$/g,
      (_m, idx) => htmlFragments[Number(idx)] ?? '',
    );

    // sanitize allowing certain tags and attributes, preserving text-node newlines correctly
    html = this.sanitizeAllowedHtml(html);

    // wrap in <p> only when result does not already start with a block-level tag
    const startsWithBlock =
      /^\s*<(?:div|p|ul|ol|pre|blockquote|h[1-6]|table|section|header|footer|article|nav|aside)\b/i.test(
        html,
      );
    if (!startsWithBlock) html = `<p>${html}</p>`;

    // restore preserved style blocks
    for (const [i, block] of styleBlocks.entries()) {
      html = html.replace(`$STYLE_BLOCK$${i}$`, block);
    }

    return html;
  }

  private replaceConditions(input: string, state: RuntimeState): string {
    return input.replace(
      /\(if:\s*([^)]*)\)\[([\s\S]*?)\](?:\(else:\)\[([\s\S]*?)\])?/gi,
      (_all, condition: string, truthy: string, falsy?: string) =>
        this.evaluate(condition, state) ? truthy : (falsy ?? ''),
    );
  }

  private link(label: string, target: string, action?: string): string {
    const encTarget = this.encryptAttribute(target);
    const actionAttribute = action
      ? ` data-story-action="${this.escape(this.encryptAttribute(action))}"`
      : '';
    return `<button type="button" class="story-link" data-story-target="${this.escape(encTarget)}"${actionAttribute}>${this.escape(label)}</button>`;
  }

  private evaluate(expression: string, state: RuntimeState): unknown {
    const trimmed = expression.trim();
    const call = trimmed.match(/^\(?call:\s*["']([^"']+)["']([\s\S]*?)\)?$/i);
    if (call)
      return this.callFunction(state, call[1], this.parseArgs(call[2], state));
    const compiled = trimmed
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
      state.variables,
      [],
      EXPRESSION_TIMEOUT_MS,
    ).result;
  }

  private callFunction(
    state: RuntimeState,
    name: string,
    args: unknown[],
  ): unknown {
    const code = state.functions[name];
    if (!code) return undefined;
    const output = this.runInSandbox(
      `(function () { ${code}\n })()`,
      state.variables,
      args,
      FUNCTION_TIMEOUT_MS,
    );
    state.variables = output.variables;
    return output.result;
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

  private parseArgs(segment: string, state: RuntimeState): unknown[] {
    const tokens =
      segment.match(
        /"[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*'|\$[A-Za-z_][A-Za-z0-9_]*|-?\d+(?:\.\d+)?|true|false|null|undefined/g,
      ) ?? [];
    return tokens.map((token: string) => {
      if (token.startsWith('$')) return state.variables[token.slice(1)];
      if (token === 'true') return true;
      if (token === 'false') return false;
      if (token === 'null') return null;
      if (token === 'undefined') return undefined;
      if (/^-?\d/.test(token)) return Number(token);
      return token.slice(1, -1);
    });
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
    } catch (err) {
      throw new BadRequestException('无效或已篡改的交互属性');
    }
  }

  // Public helper for controllers/services to decode encrypted data-* attributes
  decodeInteraction(encrypted: string): string {
    return this.decryptAttribute(encrypted);
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

  private sanitizeAllowedHtml(value: string): string {
    const tagPattern = /<\/?([a-zA-Z0-9]+)(\s+[^>]*)?>/g;
    let lastIndex = 0;
    let result = '';
    const blockTags = new Set([
      'div',
      'p',
      'ul',
      'ol',
      'pre',
      'blockquote',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'table',
      'section',
      'header',
      'footer',
      'article',
      'nav',
      'aside',
    ]);
    let lastWasOpeningBlock = false;
    for (const match of value.matchAll(tagPattern)) {
      const tagText = match[0];
      const tagName = (match[1] || '').toLowerCase();
      const start = match.index ?? 0;
      if (start < lastIndex) continue; // skip tags inside already-consumed ranges
      let before = value.slice(lastIndex, start);
      // if previous was opening block tag, strip leading newlines/spaces to avoid leading <br>
      if (lastWasOpeningBlock) {
        before = before.replace(/^[ \t]*\n+[ \t]*/g, '');
      }
      // if current tag is a closing block tag, strip trailing newlines/spaces to avoid trailing <br>
      const isClosingBlock = /^<\//.test(tagText) && blockTags.has(tagName);
      if (isClosingBlock) {
        before = before.replace(/[ \t]*\n+[ \t]*$/g, '');
      }
      result += this.formatTextNode(before);

      // special-case: preserve entire <style>...</style> blocks without altering their content
      const isOpeningStyle = tagName === 'style' && !/^<\//.test(tagText);
      if (isOpeningStyle) {
        const closeTag = '</style>';
        const closeIdx = value
          .toLowerCase()
          .indexOf(closeTag, start + tagText.length);
        if (closeIdx !== -1) {
          const endIdx = closeIdx + closeTag.length;
          result += value.slice(start, endIdx);
          lastIndex = endIdx;
          continue;
        }
      }

      // special-case: for pre/code/textarea, preserve newlines (escape but do not convert to <br>)
      const preserveNlTags = new Set(['pre', 'code', 'textarea']);
      const isPreserveNl = preserveNlTags.has(tagName) && !/^<\//.test(tagText);
      if (isPreserveNl) {
        const closeTag = `</${tagName}>`;
        const closeIdx = value
          .toLowerCase()
          .indexOf(closeTag, start + tagText.length);
        if (closeIdx !== -1) {
          const openEnd = start + tagText.length;
          const inner = value.slice(openEnd, closeIdx);
          // append sanitized opening tag, escaped inner (without <br> conversion), and closing tag
          result += this.sanitizeTag(tagText, tagName);
          result += this.escape(inner);
          result += `</${tagName}>`;
          lastIndex = closeIdx + closeTag.length;
          continue;
        }
      }

      if (!tagName || !this.allowedHtmlTags().has(tagName)) {
        result += this.escape(tagText);
      } else {
        result += this.sanitizeTag(tagText, tagName);
      }
      lastIndex = start + tagText.length;
      const isOpeningTag = !/^<\//.test(tagText) && blockTags.has(tagName);
      lastWasOpeningBlock = isOpeningTag;
    }

    result += this.formatTextNode(value.slice(lastIndex));
    return result;
  }

  private sanitizeTag(tagText: string, tagName: string): string {
    const closingTag = /^<\//.test(tagText);
    if (closingTag) return `</${tagName}>`;
    const attributes = tagText.slice(tagName.length + 1, -1);
    const safeAttributes: string[] = [];
    const attrRegex = /([a-zA-Z:-]+)\s*=\s*("[^"]*"|'[^']*'|\S+)/g;
    for (const m of attributes.matchAll(attrRegex)) {
      const rawName = m[1];
      const rawValue = m[2];
      const lowerName = rawName.toLowerCase();
      if (lowerName.startsWith('on')) continue;
      const val =
        rawValue.startsWith('"') || rawValue.startsWith("'")
          ? rawValue.slice(1, -1)
          : rawValue;
      if (val.trim().toLowerCase().startsWith('javascript:')) continue;
      if (val.trim().toLowerCase().startsWith('data:')) continue;
      safeAttributes.push(`${rawName}="${this.escape(val)}"`);
    }
    const attributeString = safeAttributes.length
      ? ` ${safeAttributes.join(' ')}`
      : '';
    return `<${tagName}${attributeString}>`;
  }

  private allowedHtmlTags(): Set<string> {
    return new Set([
      'b',
      'strong',
      'i',
      'em',
      'u',
      'a',
      'button',
      'span',
      'p',
      'pre',
      'div',
      'br',
      'ul',
      'ol',
      'li',
      'code',
      'blockquote',
      'small',
      'h1',
      'h2',
      'h3',
      'h4',
      'h5',
      'h6',
      'sup',
      'sub',
      'del',
      'style',
    ]);
  }

  private formatTextNode(text: string): string {
    if (!text) return '';
    const paragraphs = text.split(/\n{2,}/g);
    const parts: string[] = [];
    for (const p of paragraphs) {
      // trim only spaces and tabs, preserve newlines
      const trimmed = p.replace(/^[ \t]+|[ \t]+$/g, '');
      const converted = this.escape(trimmed).replace(/\n/g, '<br>');
      if (!converted) continue;
      parts.push(converted);
    }
    return parts.join('</p><p>');
  }

  private escape(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }
}
