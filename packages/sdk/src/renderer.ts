import type { StoryData, VariableMap } from "./types";
import { readBalancedBlock, extractAndRegisterFunctions } from "./scanner";
import { escapeHtml, sanitizeAllowedHtml } from "./sanitizer";

/** A rendered achievement/ending marker. */
export interface StorySpecialMarker {
  /** Visible label text. */
  name: string;
  /** Optional tooltip text. */
  description?: string;
}

/** Render-time detection result for achievements/endings in one render pass. */
export interface StoryRenderSpecials {
  /** Achievements that would be shown at the top. */
  points: StorySpecialMarker[];
  /** Ending marker shown at the bottom, when valid. */
  ending?: StorySpecialMarker;
}

const POINT_QUEUE_KEY = "__story_point_queue";

/**
 * Platform-specific hooks the shared renderer needs from its host:
 * - `evaluate`/`callFunction` let the browser use `eval`/`Function` while a
 *   server can run the same macro expressions inside a sandbox (e.g. isolated-vm).
 * - `encodeAttribute`/`decodeAttribute` let a server encrypt link target/action
 *   values embedded in rendered HTML; when omitted, values are rendered as-is.
 */
export interface StoryEngineContext {
  /** Registry of raw JS function bodies declared via (fn:"name")[code]. */
  functions: Record<string, string>;
  /**
   * Evaluates a macro expression (with `call:` substitutions already applied).
   *
   * @param expression - The macro expression to evaluate.
   * @param variables - The current story variables.
   * @returns The result of evaluating the expression.
   */
  evaluate: (expression: string, variables: VariableMap) => unknown;
  /**
   * Invokes a previously-registered (fn:) function by name.
   *
   * @param name - The name of the function to call.
   * @param args - The arguments to pass to the function.
   * @param variables - The current story variables.
   * @returns The result of invoking the function.
   */
  callFunction: (
    name: string,
    args: unknown[],
    variables: VariableMap,
  ) => unknown;
  /**
   * Encodes a link target/action value before embedding it in rendered HTML.
   *
   * @param value - The raw attribute value to encode.
   * @returns The encoded value.
   */
  encodeAttribute?: (value: string) => string;
  /**
   * Decodes a value previously produced by `encodeAttribute`.
   * @param value - The encoded attribute value to decode.
   * @returns The decoded value.
   */
  decodeAttribute?: (value: string) => string;
  /**
   * Optional passage-navigation hook threaded through recursive rendering calls.
   *
   * @param target - The target passage to navigate to.
   */
  routeTo?: (target: string) => void;
  /** Passage names that should replace their corresponding display links. */
  displayPassages?: Record<string, boolean>;
}

/**
 * Applies `ctx.encodeAttribute` if provided, otherwise returns `value` unchanged.
 *
 * @param ctx - The active engine context.
 * @param value - The raw attribute value to encode.
 * @returns The encoded value, or `value` itself when no encoder is configured.
 */
export function encodeAttributeValue(
  ctx: StoryEngineContext,
  value: string,
): string {
  return ctx.encodeAttribute ? ctx.encodeAttribute(value) : value;
}

/**
 * Applies `ctx.decodeAttribute` if provided, otherwise returns `value` unchanged.
 *
 * @param ctx - The active engine context.
 * @param value - The encoded attribute value to decode.
 * @returns The decoded value, or `value` itself when no decoder is configured.
 */
export function decodeAttributeValue(
  ctx: StoryEngineContext,
  value: string,
): string {
  return ctx.decodeAttribute ? ctx.decodeAttribute(value) : value;
}

/**
 * Translates `$var` and `is/eq/ne/and/or/not/contains` macro operators into JS-evaluable source.
 *
 * @param expression - The raw macro expression.
 * @returns Equivalent JavaScript source, referencing a `vars` object for `$var` lookups.
 */
export function compileExpressionSource(expression: string): string {
  const compiled = expression
    .replace(
      /\$([A-Za-z_][A-Za-z0-9_]*)/g,
      (_all, name: string) => `vars["${name}"]`,
    )
    .replace(/\bnot\b/gi, "!")
    .replace(/\b(?:is not|ne)\b/gi, "!==")
    .replace(/\b(?:is|eq)\b/gi, "===")
    .replace(/\band\b/gi, "&&")
    .replace(/\bor\b/gi, "||");

  return compiled.replace(
    /([A-Za-z0-9_\]\)"'`.[\]]+)\s+contains\s+("[^"]*"|'[^']*'|[A-Za-z0-9_\]\)"'`.[\]]+)/g,
    "__contains__($1,$2)",
  );
}

/**
 * Default browser-safe evaluator backed by `eval`/`Function`. Intended for client-side use only.
 *
 * @param functions - Registry of raw JS function bodies declared via `(fn:"name")[code]`.
 * @returns A partial `StoryEngineContext` supplying `functions`/`evaluate`/`callFunction`.
 */
export function createDefaultEvaluator(
  functions: Record<string, string>,
): Pick<StoryEngineContext, "functions" | "evaluate" | "callFunction"> {
  return {
    functions,
    evaluate(expression: string, variables: VariableMap): unknown {
      const compiled = compileExpressionSource(expression);
      const vars = variables;
      return (function runInScope() {
        const __contains__ = function (a: any, b: any) {
          try {
            if (a == null) return false;
            if (typeof a === "string") return String(a).includes(b);
            if (Array.isArray(a)) return a.includes(b);
            return false;
          } catch {
            return false;
          }
        };
        return eval(compiled);
      })();
    },
    callFunction(
      name: string,
      args: unknown[],
      variables: VariableMap,
    ): unknown {
      const code = functions[name];
      if (!code) return undefined;
      try {
        const fn = new Function("vars", "args", code);
        return fn(variables, args);
      } catch {
        return undefined;
      }
    },
  };
}

/** Matches `call:"name" arg1 arg2 ...` occurrences embedded inside a larger expression. */
export const CALL_IN_EXPRESSION_PATTERN =
  /call:\s*["']([^"']+)["']((?:\s+(?:"[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*'|\$[A-Za-z_][A-Za-z0-9_]*|-?\d+(?:\.\d+)?|true|false|null|undefined))*)/gi;
/** Matches a single literal argument token (string/`$var`/number/boolean/`null`/`undefined`). */
export const CALL_ARG_TOKEN_PATTERN =
  /"[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*'|\$[A-Za-z_][A-Za-z0-9_]*|-?\d+(?:\.\d+)?|true|false|null|undefined/g;

/**
 * Tokenizes literal argument tokens used in `(call:"name" arg1 arg2 ...)`:
 * quoted strings, `$var` references, numbers, booleans, `null`/`undefined`.
 *
 * @param argsSegment - The raw text following the function name in a `call:` invocation.
 * @param variables - Current variable map, used to resolve `$var` tokens.
 * @returns The parsed, ordered argument values.
 */
export function parseCallArgs(
  argsSegment: string | undefined,
  variables: VariableMap,
): unknown[] {
  if (!argsSegment) return [];

  const args: unknown[] = [];
  for (const match of argsSegment.matchAll(CALL_ARG_TOKEN_PATTERN)) {
    const token = match[0];
    if (
      (token.startsWith('"') && token.endsWith('"')) ||
      (token.startsWith("'") && token.endsWith("'"))
    ) {
      args.push(token.slice(1, -1));
      continue;
    }
    if (token.startsWith("$")) {
      args.push(variables[token.slice(1)]);
      continue;
    }
    if (token === "true") {
      args.push(true);
      continue;
    }
    if (token === "false") {
      args.push(false);
      continue;
    }
    if (token === "null") {
      args.push(null);
      continue;
    }
    if (token === "undefined") {
      args.push(undefined);
      continue;
    }
    args.push(Number(token));
  }
  return args;
}

/**
 * JSON-encodes `value` for splicing back into an expression string (`undefined` for `undefined`).
 *
 * @param value - The value to encode.
 * @returns A JS-literal source representation of `value`.
 */
export function toExpressionLiteral(value: unknown): string {
  if (value === undefined) return "undefined";
  const json = JSON.stringify(value);
  return json === undefined ? "undefined" : json;
}

/**
 * Replaces any `call:"name" args...` occurrences inside `expression` with their evaluated, literal result.
 *
 * @param expression - The raw macro expression, possibly containing embedded `call:` invocations.
 * @param variables - Current variable map.
 * @param ctx - The active engine context, used to invoke registered functions.
 * @returns `expression` with all `call:` invocations replaced by their literal result.
 */
export function replaceCallExpressions(
  expression: string,
  variables: VariableMap,
  ctx: StoryEngineContext,
): string {
  return expression.replace(
    CALL_IN_EXPRESSION_PATTERN,
    (_full: string, name: string, argsSegment?: string) => {
      const args = parseCallArgs(argsSegment, variables);
      return toExpressionLiteral(ctx.callFunction(name, args, variables));
    },
  );
}

/**
 * Evaluates a macro `expression`, first resolving any embedded `call:` invocations.
 *
 * @param expression - The raw macro expression.
 * @param variables - Current variable map.
 * @param ctx - The active engine context.
 * @returns The evaluated result.
 */
export function evaluateExpression(
  expression: string,
  variables: VariableMap,
  ctx: StoryEngineContext,
): unknown {
  const normalized = expression.trim();
  if (!normalized) return 0;
  const withCalls = replaceCallExpressions(normalized, variables, ctx);
  return ctx.evaluate(withCalls, variables);
}

/**
 * Evaluates `condition` as a boolean, coercing the raw expression result.
 *
 * @param condition - The raw macro condition expression.
 * @param variables - Current variable map.
 * @param ctx - The active engine context.
 * @returns The boolean-coerced result.
 */
export function evaluateCondition(
  condition: string,
  variables: VariableMap,
  ctx: StoryEngineContext,
): boolean {
  const normalized = condition.trim();
  if (!normalized) return false;
  return Boolean(evaluateExpression(normalized, variables, ctx));
}

/**
 * Applies a `set: $x to <expr>` or `call:"name" args...` action, mutating `variables`.
 *
 * @param action - The raw action text (e.g. from a link's action attribute).
 * @param variables - Variable map mutated in place by `set:` actions.
 * @param ctx - The active engine context.
 */
export function applyStoryAction(
  action: string,
  variables: VariableMap,
  ctx: StoryEngineContext,
): void {
  const normalized = action.trim();
  const cleaned = normalized.replace(/^\(+|\)+$/g, "").trim();

  function executeCall(name: string, argsRaw?: string): unknown {
    const args = parseCallArgs(argsRaw, variables);
    return ctx.callFunction(name, args, variables);
  }

  const setMatch = cleaned.match(
    /^set:\s*(\$[A-Za-z_][A-Za-z0-9_]*)\s+to\s+(.+)$/i,
  );
  if (setMatch) {
    const variableName = setMatch[1].slice(1);
    const rhs = setMatch[2].trim();
    const callMatch = rhs.match(
      /^\(?call:\s*["']([^"']+)["'](?:\s+(.+?))?\)?$/i,
    );
    if (callMatch) {
      variables[variableName] = executeCall(callMatch[1], callMatch[2]);
      return;
    }
    variables[variableName] = evaluateExpression(rhs, variables, ctx);
    return;
  }

  const callOnlyMatch = cleaned.match(
    /^call:\s*["']([^"']+)["'](?:\s+(.+))?$/i,
  );
  if (callOnlyMatch) {
    executeCall(callOnlyMatch[1], callOnlyMatch[2]);
    return;
  }

  const pointMatch = cleaned.match(/^point:\s*([\s\S]+)$/i);
  if (pointMatch) {
    const marker = parseSpecialMarker(pointMatch[1]);
    if (marker) {
      queuePointMarker(variables, marker);
    }
    return;
  }
}

/**
 * Finds ranges that belong to a link's click action — the `(set: ...)`/
 * `(call: ...)` attached right after `[[label|target]]`, or the whole
 * bracket body of `(link:"label")[...]` — so those macros are only run
 * on click, not while scanning a passage for entry/render-time side effects.
 *
 * @param input - Raw passage content.
 * @returns `[start, end)` index pairs covering each link action's source text.
 */
export function findLinkActionRanges(input: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];

  const linkOpenPattern = /\(link:\s*(?:["'][^"']*["']|[^)]*?)\)\s*\[/g;
  let openMatch: RegExpExecArray | null;
  while ((openMatch = linkOpenPattern.exec(input))) {
    const bracketStart = openMatch.index + openMatch[0].length - 1;
    const block = readBalancedBlock(input, bracketStart, "[", "]");
    if (block) {
      ranges.push([bracketStart, block.endIndex]);
      linkOpenPattern.lastIndex = block.endIndex;
    }
  }

  const linkClosePattern = /\[\[[^\]]*\]\]/g;
  let closeMatch: RegExpExecArray | null;
  while ((closeMatch = linkClosePattern.exec(input))) {
    let afterIndex = closeMatch.index + closeMatch[0].length;
    while (afterIndex < input.length && /\s/.test(input[afterIndex])) {
      afterIndex += 1;
    }
    if (input[afterIndex] === "(") {
      const block = readBalancedBlock(input, afterIndex, "(", ")");
      if (block && /^\s*(?:(?:set|call|point):)/i.test(block.content)) {
        ranges.push([afterIndex, block.endIndex]);
      }
    }
  }

  return ranges;
}

/**
 * @param index - Index to test.
 * @param ranges - `[start, end)` ranges as produced by `findLinkActionRanges`.
 * @returns Whether `index` falls inside any of `ranges`.
 */
export function isWithinRanges(
  index: number,
  ranges: Array<[number, number]>,
): boolean {
  return ranges.some(([start, end]) => index >= start && index < end);
}

/**
 * Executes `(set: $x to <expr>)` side effects and returns content unchanged.
 * Macros attached to a link as its click action (see `findLinkActionRanges`)
 * are left untouched so they only run when the link is actually clicked.
 *
 * @param input - Raw passage content, possibly containing `(set: ...)` macros.
 * @param variables - Variable map mutated in place.
 * @param ctx - The active engine context.
 * @returns `input` unchanged (side effects only).
 */
export function applySetMacros(
  input: string,
  variables: VariableMap,
  ctx: StoryEngineContext,
): string {
  const linkActionRanges = findLinkActionRanges(input);
  let result = "";
  let cursor = 0;
  let searchFrom = 0;

  while (searchFrom < input.length) {
    const setStart = input.indexOf("(set:", searchFrom);
    if (setStart === -1) break;

    if (isWithinRanges(setStart, linkActionRanges)) {
      searchFrom = setStart + 5;
      continue;
    }

    const parsed = readBalancedBlock(input, setStart, "(", ")");
    if (!parsed) {
      searchFrom = setStart + 5;
      continue;
    }

    const setMatch = parsed.content
      .trim()
      .match(/^set:\s*(\$[A-Za-z_][A-Za-z0-9_]*)\s+to\s+([\s\S]+)$/i);
    if (!setMatch) {
      searchFrom = setStart + 5;
      continue;
    }

    const variableName = setMatch[1].slice(1);
    const nextValue = setMatch[2].trim();
    variables[variableName] = evaluateExpression(nextValue, variables, ctx);

    result += input.slice(cursor, setStart);
    cursor = parsed.endIndex;
    searchFrom = parsed.endIndex;
  }

  result += input.slice(cursor);
  return result;
}

/**
 * Removes `(set: ...)` macros from content so they don't appear in rendered HTML.
 * Macros attached to a link as its click action (see `findLinkActionRanges`)
 * are left in place so the link-parsing regexes can still capture them.
 *
 * @param input - Raw passage content.
 * @returns `input` with all standalone `(set: ...)` macros removed.
 */
export function stripSetMacros(input: string): string {
  const linkActionRanges = findLinkActionRanges(input);
  let result = "";
  let cursor = 0;
  let searchFrom = 0;

  while (searchFrom < input.length) {
    const setStart = input.indexOf("(set:", searchFrom);
    if (setStart === -1) break;

    if (isWithinRanges(setStart, linkActionRanges)) {
      searchFrom = setStart + 5;
      continue;
    }

    const parsed = readBalancedBlock(input, setStart, "(", ")");
    if (!parsed) {
      searchFrom = setStart + 5;
      continue;
    }

    const setMatch = parsed.content
      .trim()
      .match(/^set:\s*(\$[A-Za-z_][A-Za-z0-9_]*)\s+to\s+([\s\S]+)$/i);
    if (!setMatch) {
      searchFrom = setStart + 5;
      continue;
    }

    result += input.slice(cursor, setStart);
    cursor = parsed.endIndex;
    searchFrom = parsed.endIndex;
  }

  result += input.slice(cursor);
  return result;
}

export function parseSpecialMarker(raw: string): StorySpecialMarker | null {
  const normalized = raw.trim();
  if (!normalized) return null;
  const divider = normalized.indexOf("|");
  if (divider < 0) {
    return { name: normalized };
  }
  const name = normalized.slice(0, divider).trim();
  const description = normalized.slice(divider + 1).trim();
  if (!name) return null;
  return {
    name,
    description: description || undefined,
  };
}

export function readPointQueue(variables: VariableMap): StorySpecialMarker[] {
  const value = variables[POINT_QUEUE_KEY];
  if (!Array.isArray(value)) return [];
  const markers: StorySpecialMarker[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const name = String((item as { name?: unknown }).name ?? "").trim();
    if (!name) continue;
    const descriptionValue = (item as { description?: unknown }).description;
    const description =
      descriptionValue === undefined || descriptionValue === null
        ? undefined
        : String(descriptionValue);
    markers.push({ name, description: description || undefined });
  }
  return markers;
}

export function writePointQueue(
  variables: VariableMap,
  markers: StorySpecialMarker[],
): void {
  variables[POINT_QUEUE_KEY] = markers;
}

export function queuePointMarker(
  variables: VariableMap,
  marker: StorySpecialMarker,
): void {
  const queue = readPointQueue(variables);
  queue.push(marker);
  writePointQueue(variables, queue);
}

export function consumePointMarkers(
  variables: VariableMap,
): StorySpecialMarker[] {
  const queue = readPointQueue(variables);
  writePointQueue(variables, []);
  return queue;
}

export function peekPointMarkers(variables: VariableMap): StorySpecialMarker[] {
  return readPointQueue(variables);
}

/**
 * Deep-copies a variable map, falling back to a shallow copy when the value
 * cannot be JSON-serialized (e.g. it contains functions or cycles).
 *
 * @param value - The variable map to clone.
 * @returns A fresh, JSON-safe copy.
 */
export function cloneRenderVariables(value: VariableMap): VariableMap {
  try {
    return JSON.parse(JSON.stringify(value)) as VariableMap;
  } catch {
    return { ...value };
  }
}

/**
 * Moves any queued `(point:)` markers from `source` into `target`, then clears
 * the source queue. Used so that entry-time side effects mutate the persistent
 * variables while the current render pass reads a pre-entry snapshot.
 *
 * @param source - The persistent variable map holding the point queue.
 * @param target - The render snapshot that should receive the markers.
 */
export function transferPointQueueToRenderVariables(
  source: VariableMap,
  target: VariableMap,
): void {
  const markers = readPointQueue(source);
  if (markers.length > 0) {
    target[POINT_QUEUE_KEY] = markers;
  }
  source[POINT_QUEUE_KEY] = [];
}

export function findStandaloneSpecialBlocks(
  input: string,
  macroName: "point" | "end",
): Array<{ start: number; end: number; marker: StorySpecialMarker }> {
  const ranges = findLinkActionRanges(input);
  const blocks: Array<{
    start: number;
    end: number;
    marker: StorySpecialMarker;
  }> = [];
  const needle = `(${macroName}:`;
  let searchFrom = 0;
  while (searchFrom < input.length) {
    const start = input.indexOf(needle, searchFrom);
    if (start < 0) break;
    if (isWithinRanges(start, ranges)) {
      searchFrom = start + needle.length;
      continue;
    }
    const parsed = readBalancedBlock(input, start, "(", ")");
    if (!parsed) {
      searchFrom = start + needle.length;
      continue;
    }
    const content = parsed.content.trim();
    const body = content.match(
      new RegExp(`^${macroName}:\s*([\\s\\S]+)$`, "i"),
    );
    if (body) {
      const marker = parseSpecialMarker(body[1]);
      if (marker) {
        blocks.push({ start, end: parsed.endIndex, marker });
      }
    }
    searchFrom = parsed.endIndex;
  }
  return blocks;
}

export function stripStandaloneSpecialBlocks(
  input: string,
  blocks: Array<{ start: number; end: number }>,
): string {
  if (!blocks.length) return input;
  let result = "";
  let cursor = 0;
  for (const block of blocks) {
    result += input.slice(cursor, block.start);
    cursor = block.end;
  }
  result += input.slice(cursor);
  return result;
}

export function resolveIfMacrosForEffects(
  input: string,
  variables: VariableMap,
  ctx: StoryEngineContext,
): string {
  let result = "";
  let cursor = 0;
  let searchFrom = 0;

  while (searchFrom < input.length) {
    const ifStart = input.indexOf("(if:", searchFrom);
    if (ifStart === -1) break;

    const parsed = consumeIfMacro(input, ifStart);
    if (!parsed) {
      searchFrom = ifStart + 4;
      continue;
    }

    result += input.slice(cursor, ifStart);

    let selected = "";
    for (const branch of parsed.branches) {
      if (branch.condition === null) {
        selected = branch.branch;
        break;
      }
      if (evaluateCondition(branch.condition, variables, ctx)) {
        selected = branch.branch;
        break;
      }
    }

    result += resolveIfMacrosForEffects(selected, variables, ctx);
    cursor = parsed.fullEndIndex;
    searchFrom = parsed.fullEndIndex;
  }

  result += input.slice(cursor);
  return result;
}

export function applyPointMacros(
  input: string,
  variables: VariableMap,
): string {
  const blocks = findStandaloneSpecialBlocks(input, "point");
  for (const block of blocks) {
    queuePointMarker(variables, block.marker);
  }
  return input;
}

export function renderPointMarker(marker: StorySpecialMarker): string {
  const title = marker.description
    ? ` title="${escapeHtml(marker.description)}"`
    : "";
  return `<span class="story-point"${title}>${escapeHtml(marker.name)}</span>`;
}

export function renderEndingMarker(marker: StorySpecialMarker): string {
  const title = marker.description
    ? ` title="${escapeHtml(marker.description)}"`
    : "";
  return `<span class="story-end"${title}>${escapeHtml(marker.name)}</span>`;
}

/**
 * Runs a passage's `(set: ...)` side effects when it is entered, ignoring the returned text.
 *
 * @param content - The entered passage's raw content.
 * @param variables - Variable map mutated in place.
 * @param ctx - The active engine context.
 */
export function applyPassageEntryEffects(
  content: string,
  variables: VariableMap,
  ctx: StoryEngineContext,
): void {
  const effectSource = resolveIfMacrosForEffects(content, variables, ctx);
  applySetMacros(effectSource, variables, ctx);
  applyPointMacros(effectSource, variables);
}

/** Tags treated as raw HTML block wrappers by the markdown renderer. */
export const MARKDOWN_RAW_HTML_BLOCK_TAGS = new Set([
  "div",
  "section",
  "article",
  "aside",
  "header",
  "footer",
  "main",
  "nav",
  "pre",
  "blockquote",
  "table",
  "thead",
  "tbody",
  "tfoot",
  "tr",
  "td",
  "th",
  "ul",
  "ol",
  "li",
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
]);

/**
 * Lightweight inline markdown renderer: inline code, bold/italic/del, links.
 *
 * @param input - Raw inline text/HTML mix.
 * @returns HTML with inline markdown syntax converted to tags.
 */
export function renderMarkdownInline(input: string): string {
  const segments = input.split(/(<[^>]+>)/g);

  return segments
    .map((segment) => {
      if (!segment || segment.startsWith("<")) {
        return segment;
      }

      const codePlaceholders: string[] = [];
      let working = segment.replace(/`([^`]+)`/g, (_full, code) => {
        const placeholder = `__INLINE_CODE_${codePlaceholders.length}__`;
        codePlaceholders.push(`<code>${escapeHtml(code)}</code>`);
        return placeholder;
      });

      working = working.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
      working = working.replace(/__([^_]+)__/g, "<strong>$1</strong>");
      working = working.replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
      working = working.replace(/_([^_\n]+)_/g, "<em>$1</em>");
      working = working.replace(/~~([^~]+)~~/g, "<del>$1</del>");
      working = working.replace(
        /\[([^\]]+)\]\(([^)]+)\)/g,
        (_full, label, href) => {
          const safeHref = escapeHtml(String(href).trim());
          return `<a href="${safeHref}" rel="noreferrer noopener">${renderMarkdownInline(String(label))}</a>`;
        },
      );

      working = working.replace(
        /__INLINE_CODE_(\d+)__/g,
        (_full, index: string) => codePlaceholders[Number(index)] ?? "",
      );
      return working;
    })
    .join("");
}

/**
 * Lightweight block-level markdown renderer: headings, lists, quotes, code fences, raw HTML blocks.
 *
 * @param input - Raw text with block-level markdown syntax.
 * @returns HTML with block-level markdown syntax converted to tags.
 */
export function renderMarkdownBlocks(input: string): string {
  const lines = input.replace(/\r\n/g, "\n").split("\n");
  const output: string[] = [];
  const paragraphLines: string[] = [];
  const quoteLines: string[] = [];
  const listItems: string[] = [];
  let listType: "ul" | "ol" | null = null;
  let inCodeBlock = false;
  let codeLines: string[] = [];
  let codeLanguage = "";
  let inRawHtmlBlock = false;
  let rawHtmlTag = "";
  let rawHtmlLines: string[] = [];

  const flushParagraph = () => {
    if (!paragraphLines.length) return;
    output.push(
      `<p>${renderMarkdownInline(paragraphLines.join("<br />"))}</p>`,
    );
    paragraphLines.length = 0;
  };

  const flushQuote = () => {
    if (!quoteLines.length) return;
    output.push(
      `<blockquote>${renderMarkdownInline(quoteLines.join("<br />"))}</blockquote>`,
    );
    quoteLines.length = 0;
  };

  const flushList = () => {
    if (!listItems.length || !listType) return;
    const items = listItems
      .map((item) => `<li>${renderMarkdownInline(item)}</li>`)
      .join("");
    output.push(`<${listType}>${items}</${listType}>`);
    listItems.length = 0;
    listType = null;
  };

  const flushAllBlocks = () => {
    flushParagraph();
    flushQuote();
    flushList();
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const trimmed = line.trim();

    if (inCodeBlock) {
      if (/^```\s*$/.test(trimmed)) {
        output.push(
          `<pre><code${codeLanguage ? ` class="language-${escapeHtml(codeLanguage)}"` : ""}>${escapeHtml(codeLines.join("\n"))}</code></pre>`,
        );
        inCodeBlock = false;
        codeLines = [];
        codeLanguage = "";
      } else {
        codeLines.push(line);
      }
      continue;
    }

    if (inRawHtmlBlock) {
      rawHtmlLines.push(line);
      if (trimmed.toLowerCase() === `</${rawHtmlTag}>`) {
        output.push(rawHtmlLines.join("\n"));
        inRawHtmlBlock = false;
        rawHtmlTag = "";
        rawHtmlLines = [];
      }
      continue;
    }

    if (!trimmed) {
      flushAllBlocks();
      continue;
    }

    const codeFenceMatch = trimmed.match(/^```([A-Za-z0-9_-]+)?\s*$/);
    if (codeFenceMatch) {
      flushAllBlocks();
      inCodeBlock = true;
      codeLanguage = codeFenceMatch[1] ?? "";
      codeLines = [];
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      flushAllBlocks();
      const level = headingMatch[1].length;
      output.push(
        `<h${level}>${renderMarkdownInline(headingMatch[2])}</h${level}>`,
      );
      continue;
    }

    const rawHtmlStartMatch = trimmed.match(/^<([A-Za-z][\w:-]*)(\s[^>]*)?>$/);
    if (
      rawHtmlStartMatch &&
      MARKDOWN_RAW_HTML_BLOCK_TAGS.has(rawHtmlStartMatch[1].toLowerCase())
    ) {
      flushAllBlocks();
      inRawHtmlBlock = true;
      rawHtmlTag = rawHtmlStartMatch[1].toLowerCase();
      rawHtmlLines = [line];
      continue;
    }

    const quoteMatch = trimmed.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      flushParagraph();
      flushList();
      quoteLines.push(quoteMatch[1]);
      continue;
    }

    if (quoteLines.length) {
      flushQuote();
    }

    const unorderedListMatch = trimmed.match(/^[-*+]\s+(.+)$/);
    const orderedListMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (unorderedListMatch || orderedListMatch) {
      flushParagraph();
      const nextType: "ul" | "ol" = unorderedListMatch ? "ul" : "ol";
      if (listType && listType !== nextType) {
        flushList();
      }
      listType = nextType;
      const listItem = unorderedListMatch
        ? unorderedListMatch[1]
        : orderedListMatch?.[1];
      listItems.push((listItem ?? "").trim());
      continue;
    }

    if (listItems.length) {
      flushList();
    }

    paragraphLines.push(line);
  }

  flushAllBlocks();

  if (inCodeBlock) {
    output.push(
      `<pre><code${codeLanguage ? ` class="language-${escapeHtml(codeLanguage)}"` : ""}>${escapeHtml(codeLines.join("\n"))}</code></pre>`,
    );
  }

  if (inRawHtmlBlock && rawHtmlLines.length) {
    output.push(rawHtmlLines.join("\n"));
  }

  return output.join("\n");
}

interface ParsedIfMacroBranch {
  condition: string | null;
  branch: string;
}

interface ParsedIfMacro {
  fullEndIndex: number;
  branches: ParsedIfMacroBranch[];
}

/**
 * Extracts an `(if: ...) [true] (else-if: ...)[...] (else:)[false]` macro chain.
 *
 * @param source - The full source text to scan.
 * @param startIndex - Index of the opening `(` of the `(if: ...)` signature.
 * @returns The parsed branch chain and end index, or `null` if not a valid `if:` macro.
 */
export function consumeIfMacro(
  source: string,
  startIndex: number,
): ParsedIfMacro | null {
  const signature = readBalancedBlock(source, startIndex, "(", ")");
  if (!signature) return null;

  const conditionMatch = signature.content.trim().match(/^if:\s*([\s\S]+)$/i);
  if (!conditionMatch) return null;

  let cursor = signature.endIndex;
  while (cursor < source.length && /\s/.test(source[cursor])) cursor += 1;

  const trueBranchBlock = readBalancedBlock(source, cursor, "[", "]");
  if (!trueBranchBlock) return null;

  cursor = trueBranchBlock.endIndex;
  while (cursor < source.length && /\s/.test(source[cursor])) cursor += 1;

  const branches: ParsedIfMacroBranch[] = [];
  branches.push({
    condition: conditionMatch[1].trim(),
    branch: trueBranchBlock.content,
  });

  while (cursor < source.length) {
    if (source.slice(cursor, cursor + 9).toLowerCase() === "(else-if:") {
      const sig = readBalancedBlock(source, cursor, "(", ")");
      if (!sig) break;
      const m = sig.content.trim().match(/^else[-\s]?if:\s*([\s\S]+)$/i);
      if (!m) {
        cursor = sig.endIndex;
        continue;
      }
      cursor = sig.endIndex;
      while (cursor < source.length && /\s/.test(source[cursor])) cursor += 1;
      const branchBlock = readBalancedBlock(source, cursor, "[", "]");
      if (!branchBlock) return null;
      branches.push({ condition: m[1].trim(), branch: branchBlock.content });
      cursor = branchBlock.endIndex;
      while (cursor < source.length && /\s/.test(source[cursor])) cursor += 1;
      continue;
    }

    if (source.slice(cursor, cursor + 8).toLowerCase() === "(elseif:") {
      const sig = readBalancedBlock(source, cursor, "(", ")");
      if (!sig) break;
      const m = sig.content.trim().match(/^elseif:\s*([\s\S]+)$/i);
      if (!m) {
        cursor = sig.endIndex;
        continue;
      }
      cursor = sig.endIndex;
      while (cursor < source.length && /\s/.test(source[cursor])) cursor += 1;
      const branchBlock = readBalancedBlock(source, cursor, "[", "]");
      if (!branchBlock) return null;
      branches.push({ condition: m[1].trim(), branch: branchBlock.content });
      cursor = branchBlock.endIndex;
      while (cursor < source.length && /\s/.test(source[cursor])) cursor += 1;
      continue;
    }

    if (source.slice(cursor, cursor + 7).toLowerCase() === "(else:)") {
      cursor += 7;
      while (cursor < source.length && /\s/.test(source[cursor])) cursor += 1;
      const elseBlock = readBalancedBlock(source, cursor, "[", "]");
      if (!elseBlock) return null;
      branches.push({ condition: null, branch: elseBlock.content });
      cursor = elseBlock.endIndex;
      while (cursor < source.length && /\s/.test(source[cursor])) cursor += 1;
      break;
    }

    break;
  }

  return {
    fullEndIndex: cursor,
    branches,
  };
}

/**
 * Walks input replacing conditional macros with the rendered branch content.
 *
 * @param input - Raw passage content, possibly containing `(if: ...)` macros.
 * @param variables - Current variable map.
 * @param story - The full story, needed to recursively render selected branches.
 * @param ctx - The active engine context.
 * @returns `input` with all `(if: ...)` macros replaced by their selected, rendered branch.
 */
export function replaceIfMacros(
  input: string,
  variables: VariableMap,
  story: StoryData,
  ctx: StoryEngineContext,
): string {
  let result = "";
  let cursor = 0;
  let searchFrom = 0;

  while (searchFrom < input.length) {
    const ifStart = input.indexOf("(if:", searchFrom);
    if (ifStart === -1) break;

    const parsed = consumeIfMacro(input, ifStart);
    if (!parsed) {
      searchFrom = ifStart + 4;
      continue;
    }

    result += input.slice(cursor, ifStart);

    let selected = "";
    for (const b of parsed.branches) {
      if (b.condition === null) {
        selected = b.branch;
        break;
      }
      if (evaluateCondition(b.condition, variables, ctx)) {
        selected = b.branch;
        break;
      }
    }

    result += renderStoryTextInternal(selected, variables, story, ctx, {
      consumePointQueue: false,
    });

    cursor = parsed.fullEndIndex;
    searchFrom = parsed.fullEndIndex;
  }

  result += input.slice(cursor);
  return result;
}

/**
 * Extracts the target passage name from a `(goto:"Target")` action block, if present.
 *
 * @param actionBlock - Raw action block text (e.g. a `(link:...)`'s body).
 * @returns The target passage name, or `undefined` if no `goto:` is found.
 */
export function extractGotoTarget(actionBlock: string): string | undefined {
  const normalized = actionBlock.trim();
  const gotoMatch = normalized.match(
    /goto:\s*(?:["']([^"']+)["']|([^\]\)]+))/i,
  );
  return (gotoMatch?.[1] ?? gotoMatch?.[2])?.trim();
}

/**
 * Builds a `<button data-story-target=... data-story-action=...>` link, encoding attrs via `ctx`.
 *
 * @param label - Visible link text.
 * @param target - Destination passage name.
 * @param action - Optional `set:`/`call:` action to run before navigating.
 * @param ctx - The active engine context, used to encode attribute values.
 * @returns The rendered `<button>` HTML.
 */
export function buildStoryLink(
  label: string,
  target: string | undefined,
  action: string | undefined,
  ctx: StoryEngineContext,
  displayTarget?: string,
): string {
  const targetAttribute = target
    ? ` data-story-target="${escapeHtml(encodeAttributeValue(ctx, target))}"`
    : "";
  const actionAttribute = action
    ? ` data-story-action="${escapeHtml(encodeAttributeValue(ctx, action))}"`
    : "";
  const displayAttribute = displayTarget
    ? ` data-story-display="${escapeHtml(encodeAttributeValue(ctx, displayTarget))}"`
    : "";
  return `<button type="button" class="story-link"${targetAttribute}${actionAttribute}${displayAttribute}>${escapeHtml(label)}</button>`;
}

/**
 * Expands story macros (links, if/display/print/call, style blocks) into sanitized HTML.
 *
 * @param raw - Raw passage content.
 * @param variables - Current variable map.
 * @param story - The full story, needed to resolve `display:` targets and recursive rendering.
 * @param ctx - The active engine context.
 * @returns Sanitized HTML with all supported macros expanded.
 */
export function replaceTextWithHtml(
  raw: string,
  variables: VariableMap,
  story: StoryData,
  ctx: StoryEngineContext,
  options?: {
    consumePointQueue?: boolean;
    captureSpecials?: StoryRenderSpecials;
  },
): string {
  const consumePointQueue = options?.consumePointQueue ?? false;
  const captureSpecials = options?.captureSpecials;
  const queuedPoints = consumePointQueue
    ? consumePointMarkers(variables)
    : peekPointMarkers(variables);

  const styleBlocks: string[] = [];
  const htmlFragments: string[] = [];
  let working = raw.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, (match) => {
    const placeholder = `$STYLE_BLOCK$${styleBlocks.length}$`;
    styleBlocks.push(match);
    return placeholder;
  });

  working = extractAndRegisterFunctions(working, ctx.functions);
  working = stripSetMacros(working);

  const pointBlocks = findStandaloneSpecialBlocks(working, "point");
  working = stripStandaloneSpecialBlocks(working, pointBlocks);

  const endBlocks = findStandaloneSpecialBlocks(working, "end");
  working = stripStandaloneSpecialBlocks(working, endBlocks);

  const linkPattern =
    /\(link:\s*(?:["']([^"']*)["']|([^)]*?))\)\s*\[((?:.|\n)*?)\]/g;
  working = working.replace(
    linkPattern,
    (
      _full: string,
      literalLabel: string,
      rawLabel: string,
      actionBlock: string,
    ) => {
      const label = literalLabel || rawLabel || "继续";
      const target = extractGotoTarget(actionBlock);
      const actionMatch = (actionBlock || "").match(
        /(?:set:\s*[^)\]]+|call:\s*[^)\]]+|point:\s*[^)\]]+)/i,
      );
      const displayMatch = (actionBlock || "").match(
        /display:\s*["']([^"']+)["']/i,
      );
      if (displayMatch?.[1] && ctx.displayPassages?.[displayMatch[1]]) {
        const displayed = story.passages.find(
          (passage) => passage.name === displayMatch[1],
        );
        return displayed
          ? renderStoryTextInternal(displayed.content, variables, story, ctx, {
              consumePointQueue: false,
            })
          : "";
      }
      return buildStoryLink(
        label,
        displayMatch?.[1] ? undefined : target,
        actionMatch ? actionMatch[0] : undefined,
        ctx,
        displayMatch?.[1],
      );
    },
  );

  working = working.replace(
    /\[\[([^\]|]+)(?:\|([^\]]+))?\]\](?:\(((?:set:\s*[^)]+|call:\s*[^)]+|point:\s*[^)]+))\))?/g,
    (_all, label: string, target?: string, action?: string) => {
      const passageName = label.trim();
      const actualTarget = (target ?? label).trim();
      return buildStoryLink(passageName, actualTarget, action, ctx);
    },
  );

  const callPattern = /\(call:\s*["']([^"']+)["'](?:\s+([^)]*?))?\)/g;
  working = working.replace(
    callPattern,
    (_full: string, name: string, argsRaw?: string) => {
      const args = parseCallArgs(argsRaw, variables);
      const result = ctx.callFunction(name, args, variables);
      return escapeHtml(String(result ?? ""));
    },
  );

  working = replaceIfMacros(working, variables, story, ctx);

  const displayPattern = /\(display:\s*["']([^"']+)["']\s*\)/g;
  working = working.replace(displayPattern, (_all, targetName: string) => {
    const target = story.passages.find(
      (passage) => passage.name === targetName,
    );
    if (!target) return "";
    const placeholder = `$HTML_FRAGMENT$${htmlFragments.length}$`;
    htmlFragments.push(
      renderStoryTextInternal(target.content, variables, story, ctx, {
        consumePointQueue: false,
      }),
    );
    return placeholder;
  });

  const printPattern = /\(print:\s*([^)]*?)\)/g;
  working = working.replace(printPattern, (_all, expression: string) => {
    const resolved = evaluateExpression(expression, variables, ctx);
    return escapeHtml(String(resolved));
  });

  const gotoPattern = /\(goto:\s*["']([^"']+)['"]\s*\)/g;
  working = working.replace(gotoPattern, (_all, targetName: string) =>
    buildStoryLink(targetName, targetName, undefined, ctx),
  );

  working = working.replace(/''([^']+)''/g, "<strong>$1</strong>");
  working = working.replace(/(?<!:)\/\/([^/\n]+?)\/\//g, "<em>$1</em>");
  working = working.replace(/~~([^~]+)~~/g, "<del>$1</del>");
  working = working.replace(/\^\^([^^]+)\^\^/g, "<sup>$1</sup>");
  working = working.replace(/,,([^,]+),,/g, "<sub>$1</sub>");

  working = renderMarkdownBlocks(working);

  working = sanitizeAllowedHtml(working);
  for (const [index, styleBlock] of styleBlocks.entries()) {
    working = working.replace(`$STYLE_BLOCK$${index}$`, styleBlock);
  }
  for (const [index, fragment] of htmlFragments.entries()) {
    working = working.replace(`$HTML_FRAGMENT$${index}$`, fragment);
  }

  const renderedPoints = [...queuedPoints];
  const hasLinkSyntax =
    /\[\[[^\]]+\]\]|\(link:\s*(?:["'][^"']*["']|[^)]*?)\)\s*\[(?:.|\n)*?\]|\(goto:\s*["'][^"']+["']\s*\)/i.test(
      raw,
    );
  const ending =
    endBlocks.length === 1 && !hasLinkSyntax ? endBlocks[0].marker : undefined;

  if (captureSpecials) {
    captureSpecials.points.push(...renderedPoints);
    if (ending) {
      captureSpecials.ending = ending;
    }
  }

  const top = renderedPoints.length
    ? `<div class="story-point-banner">${renderedPoints
        .map((marker) => renderPointMarker(marker))
        .join(" ")}</div>`
    : "";
  const bottom = ending
    ? `<div class="story-end-banner">${renderEndingMarker(ending)}</div>`
    : "";

  working = `${top}${working}${bottom}`;
  return working;
}

export function renderStoryTextInternal(
  input: string,
  variables: VariableMap,
  story: StoryData,
  ctx: StoryEngineContext,
  options?: {
    consumePointQueue?: boolean;
    captureSpecials?: StoryRenderSpecials;
  },
): string {
  return replaceTextWithHtml(input, variables, story, ctx, options);
}

/**
 * Detects whether one render pass would include achievement markers and/or an ending marker.
 *
 * @param input - Raw passage content to render.
 * @param variables - Current variable map.
 * @param story - The full story.
 * @param ctx - The active engine context.
 * @returns Marker payload when present; otherwise `undefined`.
 */
export function detectRenderSpecials(
  input: string,
  variables: VariableMap,
  story: StoryData,
  ctx: StoryEngineContext,
  options?: {
    action?: string;
    includeLinkActions?: boolean;
    applyEntryEffects?: boolean;
  },
): StoryRenderSpecials | undefined {
  try {
    const renderVariables = cloneRenderVariables(variables);
    const shouldApplyEntryEffects = options?.applyEntryEffects ?? true;
    if (shouldApplyEntryEffects) {
      const effectVariables = cloneRenderVariables(variables);
      applyPassageEntryEffects(input, effectVariables, ctx);
      const queuedPoints = readPointQueue(effectVariables);
      if (queuedPoints.length) {
        writePointQueue(renderVariables, queuedPoints);
      }
    }

    const specials: StoryRenderSpecials = { points: [] };
    renderStoryTextInternal(input, renderVariables, story, ctx, {
      consumePointQueue: false,
      captureSpecials: specials,
    });
    // Optionally detect any (point: ...) that are attached to links (deferred until click).
    // Only include them when `options.includeLinkActions` is true, or when a specific
    // `options.action` is provided to simulate that action being executed.
    const includeLinkActions = Boolean(options?.includeLinkActions);
    const simulateAction = options?.action?.trim();
    if (includeLinkActions || simulateAction) {
      const linkOpenPattern =
        /\(link:\s*(?:["'][^"']*["']|[^)]*?)\)\s*\[((?:.|\n)*?)\]/g;
      for (const m of input.matchAll(linkOpenPattern)) {
        const actionBlock = m[1] || "";
        const normalized = actionBlock.trim();
        const actionMatches = Array.from(
          normalized.matchAll(
            /(?:set:\s*[^)\]]+|call:\s*[^)\]]+|point:\s*[^)\]]+)/gi,
          ),
        ).map((r) => String(r[0]).trim());
        if (simulateAction) {
          if (
            !actionMatches.some(
              (a) => a.toLowerCase() === simulateAction.toLowerCase(),
            )
          ) {
            continue;
          }
        }
        for (const pm of actionBlock.matchAll(/point:\s*([^\)\]\n]+)/gi)) {
          const marker = parseSpecialMarker(pm[1]);
          if (marker) specials.points.push(marker);
        }
      }

      // Wiki-style links: [[label|target]]((...action...))
      const bracketLinkPattern =
        /\[\[([^\]|]+)(?:\|([^\]]+))?\]\](?:\(((?:set:\s*[^)]+|call:\s*[^)]+|point:\s*[^)]+))\))?/g;
      for (const m of input.matchAll(bracketLinkPattern)) {
        const action = m[3];
        if (!action) continue;
        const normalized = String(action).trim();
        const actionMatches = Array.from(
          normalized.matchAll(
            /(?:set:\s*[^)]+|call:\s*[^)]+|point:\s*[^)]+)/gi,
          ),
        ).map((r) => String(r[0]).trim());
        if (simulateAction) {
          if (
            !actionMatches.some(
              (a) => a.toLowerCase() === simulateAction.toLowerCase(),
            )
          )
            continue;
        }
        for (const pm of String(action).matchAll(/point:\s*([^\)\n]+)/gi)) {
          const marker = parseSpecialMarker(pm[1]);
          if (marker) specials.points.push(marker);
        }
      }
    }
    if (!specials.points.length && !specials.ending) {
      return undefined;
    }
    return specials;
  } catch (error) {
    console.error("detectRenderSpecials", error);
    return undefined;
  }
}

/**
 * Renders a passage's raw content into sanitized HTML, expanding all supported macros.
 *
 * The render pass always reads a pre-entry snapshot of `variables` so that
 * `(if: ...)` conditions see the values from before any `(set: ...)` entry
 * effects ran. When `applyEntryEffects` is `true` (the default), entry-time
 * side effects are applied to the persistent `variables` map first, and any
 * `(point:)` markers they queue are moved into the render snapshot before
 * rendering. Callers that already ran entry effects can pass
 * `applyEntryEffects: false`; pass `renderVariables` to re-render with a
 * specific snapshot (e.g. for display expansion).
 *
 * @param input - Raw passage content.
 * @param variables - Current variable map (mutated by entry effects when enabled).
 * @param story - The full story.
 * @param ctx - The active engine context.
 * @param options - Render options (applyEntryEffects, renderVariables).
 * @returns Sanitized, ready-to-embed HTML.
 */
export function renderStoryText(
  input: string,
  variables: VariableMap,
  story: StoryData,
  ctx: StoryEngineContext,
  options?: {
    /** Whether to run entry-time `(set:)`/`(point:)` side effects. Default true. */
    applyEntryEffects?: boolean;
    /** Optional variable snapshot to render with (e.g. pre-entry state). */
    renderVariables?: VariableMap;
  },
): string {
  const applyEntry = options?.applyEntryEffects ?? true;
  const renderVariables = cloneRenderVariables(
    options?.renderVariables ?? variables,
  );

  if (applyEntry) {
    applyPassageEntryEffects(input, variables, ctx);
  }
  transferPointQueueToRenderVariables(variables, renderVariables);

  return renderStoryTextInternal(input, renderVariables, story, ctx, {
    consumePointQueue: true,
  });
}

/**
 * Strips surrounding quotes and whitespace from a raw passage-name token.
 *
 * @param name - Raw passage-name token, possibly quoted.
 * @returns The normalized passage name.
 */
export function normalizePassageName(name: string): string {
  return name.trim().replace(/^"|"$/g, "");
}
