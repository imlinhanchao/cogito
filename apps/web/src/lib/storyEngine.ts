/*
Design Notes: Story Engine (overview)

This file implements a compact interactive story engine used by the
editor and player UI. Its primary responsibilities are:

- Parse a plain-text story source into passages (passage parser).
- Provide a small macro language and runtime evaluation for expressions,
  conditional blocks, variable assignments, JS function definitions and
  calls, and simple link/action markers used by the UI.
- Render passage content to sanitized HTML by translating custom
  macros/syntax into safe HTML snippets and a lightweight Markdown-like
  renderer for headings, lists, code fences, blockquotes and inline
  formatting.
- Maintain an in-session registry of JS function bodies declared via
  (fn:"name")[code] and execute them during parsing/rendering.
- Support a `buildStandaloneExport` which embeds a compatible runtime
  snapshot (story + variables + minimal engine) into a single HTML
  document for distribution.

Key architecture decisions:

- Balanced-block scanner: nested constructs (e.g. (fn:...)[...]) may
  contain quotes, brackets or nested pairs — a small scanner
  (`readBalancedBlock`) is used instead of global regexes to correctly
  locate block boundaries without truncation.
- Separation of concerns: evaluation of side-effects (e.g. `(set:)`)
  is done on passage-entry (`applyPassageEntryEffects`) and stripped
  from the rendered output to avoid reactive side-effects during
  render-time.
- In-session function registry (`GLOBAL_JS_FUNCTIONS`) stores raw
  function bodies. Execution is performed via `new Function('vars','args', code)`
  in a try/catch to keep the runtime robust. Functions are NOT
  persisted to disk by default — persisting should be handled by the
  editor layer when saving the story meta.
- Sanitization: a whitelist approach (`ALLOWED_HTML_TAGS`) prevents
  arbitrary HTML injection. Tag attributes are filtered and `on*`
  attributes, `javascript:` URIs and `data:` URIs are removed.

Extensibility points:

- `GLOBAL_JS_FUNCTIONS` can be serialized to story metadata by the
  editor to make functions portable across sessions and exports.
- The markdown rendering is intentionally lightweight; it can be
  replaced with a richer renderer if required. Hooks exist where raw
  HTML fragments and style blocks are captured and re-inserted.

Performance and safety notes:

- Expression evaluation uses `eval` on a compiled string that
  references `vars[...]` to access variables. This keeps the
  expression grammar small but requires trusting story authors for
  expressions. The engine sanitizes HTML output but executing author
  supplied JS still runs in the page context. Standalone exports
  embed the runtime unchanged.

*/
export type VariableMap = Record<string, unknown>;

export interface StoryPassage {
  name: string;
  tags: string[];
  content: string;
}

export interface StoryData {
  title: string;
  description?: string;
  startPassage: string;
  passages: StoryPassage[];
}

export const DEFAULT_STORY_SOURCE = `标题：语法全检 Demo

:: Start
你站在一个用于验证所有语法的实验场。
(set: $name to "小明")
(set: $score to 0)
(set: $health to 7)
(set: $hasKey to false)
(set: $msg to $name + " 来到了故事现场")
故事标题：(print: $storyTitle)
当前段落：(print: $passage)
人物：(print: $msg)
文本样式：''粗体'' //斜体// ~~删除线~~ ^^上标^^ ,,下标,,
(display: "SyntaxSheet")
[[进入岔路|Fork]]
[[查看样式房间|SyntaxSheet]]
(# 添加 JSFunctions 入口)
[[测试 JS 函数|JSFunctions]]
(link:"直接前往湖畔")[(goto:"Lake")]

:: SyntaxSheet
<style>
  .demo-callout {
    padding: 0.85rem 1rem;
    margin: 0.75rem 0;
    border-radius: 0.9rem;
    background: #eff6ff;
    border: 1px solid #93c5fd;
    color: #1e3a8a;
  }
  .demo-emphasis {
    font-weight: 700;
    color: #b91c1c;
  }
</style>
<div class="demo-callout">
  HTML 内容：<b id="bold-demo" class="demo-emphasis" title="bold">加粗</b>、<i style="font-style: italic">斜体</i>、<u>下划线</u>、<a href="https://example.com" title="外链演示">链接</a>
</div>

:: Fork
岔路口展示条件分支。
(if: $health > 5)[你状态不错，适合继续冒险。](else:)[你需要先休息。]
(if: $health >= 7)[你的生命值达到及格线。](else:)[你的生命值还不够高。]
(if: $health <= 7)[你的生命值没有超过 7。](else:)[你的生命值超过了 7。]
(if: $score < 1)[你的分数仍然很低。](else:)[你的分数已经上升。]
(if: $hasKey)[钥匙已经在手。](else:)[你还没有钥匙。]
(if: $score eq 0)[分数现在是零。](else:)[分数已经变化。]
(if: $name ne "匿名")[名字已填写。](else:)[名字还是空的。]
(if: $hasKey is not true)[这把钥匙还没拿到。](else:)[这把钥匙已经拿到。]
[[拿起钥匙并前往大厅|Hall]](set: $hasKey to true)
(link:"回到起点")[(goto:"Start")]

:: Hall
这里是大厅，门锁需要钥匙。
(if: $hasKey is true)[门已经打开。](else:)[门还锁着。]
(set: $score to $score + 1)
当前分数：(print: $score)
[[去花园|Garden]]
[[回到起点|Start]]

:: Garden
花园里可以验证字符串连接。
(set: $msg to $name + " 正在探索花园")
消息：(print: $msg)
(display: "SyntaxSheet")
[[去湖边|Lake]]
[[回到起点|Start]]

:: Lake
你来到湖边。
(if: $score > 0)[你看到湖中有金光。](else:)[湖面平静无波。]
当前变量：(print: $score)
[[回到起点|Start]]

:: JSFunctions
这是用于测试 JS 函数定义与调用的段落。

(fn:"greet")[return 'Hello, ' + (args[0] || vars.name || '访客') + '!']
(call:"greet" "小红")

(set: $lastGreet to (call:"greet" $name))

(fn:"incScore")[vars.score = (Number(vars.score)||0) + (Number(args[0])||1); return vars.score]
(call:"incScore" 5)
当前分数：(print: $score)

// 函数可以直接修改 vars，并返回新值
(call:"incScore" $score)
(set: $newScore to (call:"incScore" 2))
新分数：(print: $newScore)
`;

const ALLOWED_HTML_TAGS = new Set([
  "b",
  "strong",
  "i",
  "em",
  "u",
  "a",
  "button",
  "span",
  "p",
  "pre",
  "div",
  "br",
  "ul",
  "ol",
  "li",
  "code",
  "blockquote",
  "small",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "sup",
  "sub",
  "del",
  "style",
]);

// 函数字典（仅在当前会话内生效）
const GLOBAL_JS_FUNCTIONS: Record<string, string> = {};

export function createDefaultStory(): StoryData {
  return parseStorySource(DEFAULT_STORY_SOURCE);
}

export function parseStorySource(source: string): StoryData {
  const normalized = source.replace(/\r\n/g, "\n").trim();
  if (!normalized) {
    return {
      title: "未命名故事",
      startPassage: "Start",
      passages: [
        {
          name: "Start",
          tags: [],
          content: "新故事开始了。",
        },
      ],
    };
  }

  const passageBlocks = normalized
    .split(/\n\s*(?=段落\s+"[^\"]+"\s*[:：]|::\s*\S)/)
    .map((block) => block.trim())
    .filter(Boolean);

  const passages: StoryPassage[] = [];

  for (const block of passageBlocks) {
    const match = block.match(
      /^(?:段落\s+"([^\"]+)"\s*[:：]|::\s*([^\n]+))\s*\n?(.*)$/s,
    );
    if (!match) {
      continue;
    }

    const name = (match[1] ?? match[2] ?? "Untitled").trim();
    const content = (match[3] ?? "").trim();
    passages.push({
      name,
      tags: [],
      content,
    });
  }

  if (!passages.length) {
    const title = "未命名故事";
    return {
      title,
      startPassage: "Start",
      passages: [{ name: "Start", tags: [], content: normalized }],
    };
  }

  const title =
    (
      normalized.match(/^\s*标题\s*[:：]\s*(.+)$/m)?.[1] ?? "Interactive Story"
    ).trim() || "Interactive Story";

  const description =
    (normalized.match(/^\s*简述\s*[:：]\s*(.+)$/m)?.[1] ?? "").trim() || "";
  const explicitStart = (
    normalized.match(/^\s*(?:起始段落|起始)\s*[:：]\s*(.+)$/m)?.[1] ?? ""
  ).trim();

  return {
    title,
    description: description || undefined,
    startPassage: explicitStart || (passages[0]?.name ?? "Start"),
    passages,
  };
}

export function serializeStory(story: StoryData): string {
  const headerLines: string[] = [];
  headerLines.push(`标题：${story.title || "Untitled"}`);
  if (story.description) headerLines.push(`简述：${story.description}`);
  if (story.startPassage) headerLines.push(`起始段落：${story.startPassage}`);

  const passagesText = story.passages
    .map((passage) => `:: ${passage.name}\n${passage.content.trim()}`)
    .join("\n\n");

  return headerLines.join("\n") + "\n\n" + passagesText;
}

export function collectVariableNamesFromStory(story: StoryData): string[] {
  const values = new Set<string>();
  const regex = /\$([A-Za-z_][A-Za-z0-9_]*)/g;

  for (const passage of story.passages) {
    let match: RegExpExecArray | null;
    while ((match = regex.exec(passage.content))) {
      values.add(match[1]);
    }
  }

  return Array.from(values);
}

export function buildInitialVariables(story: StoryData): VariableMap {
  const variables: VariableMap = {};
  for (const name of collectVariableNamesFromStory(story)) {
    variables[name] = 0;
  }
  variables.passage = story.startPassage;
  variables.storyTitle = story.title;
  return variables;
}

// --- Scanner utilities ---
// `BalancedBlock` describes the result of scanning a nested/pair block
// such as parentheses `( ... )` or bracketed code `[ ... ]`.
interface BalancedBlock {
  content: string;
  endIndex: number;
}

// readBalancedBlock: a small scanner that walks the source from a
// start index and returns the content and index after the matching
// closing character. Handles quoted strings and escaped characters so
// nested quoted content does not break scanning.
function readBalancedBlock(
  source: string,
  startIndex: number,
  openChar: string,
  closeChar: string,
): BalancedBlock | null {
  if (source[startIndex] !== openChar) {
    return null;
  }

  let depth = 1;
  let quote: '"' | "'" | "`" | null = null;
  let escaped = false;

  for (let i = startIndex + 1; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === quote) {
        quote = null;
      }
      continue;
    }

    if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
      continue;
    }

    if (ch === openChar) {
      depth += 1;
      continue;
    }

    if (ch === closeChar) {
      depth -= 1;
      if (depth === 0) {
        return {
          content: source.slice(startIndex + 1, i),
          endIndex: i + 1,
        };
      }
    }
  }

  return null;
}

// Function extraction:
// Recognizes patterns like (fn:"name")[ ...code... ] and returns
// the extracted name and the inner code block. Uses the balanced
// scanner to avoid truncation when code contains brackets/quotes.
function consumeFnDefinition(
  source: string,
  startIndex: number,
): { name: string; code: string; endIndex: number } | null {
  const signature = readBalancedBlock(source, startIndex, "(", ")");
  if (!signature) {
    return null;
  }

  const nameMatch = signature.content
    .trim()
    .match(/^fn:\s*["']([^"']+)["']\s*$/i);
  if (!nameMatch) {
    return null;
  }

  let cursor = signature.endIndex;
  while (cursor < source.length && /\s/.test(source[cursor])) {
    cursor += 1;
  }

  const body = readBalancedBlock(source, cursor, "[", "]");
  if (!body) {
    return null;
  }

  return {
    name: nameMatch[1],
    code: body.content,
    endIndex: body.endIndex,
  };
}

// Scans a piece of passage content for `(fn:...)` definitions,
// registers them in the provided `registry`, and returns the source
// with the definitions removed (so they don't render). This keeps
// function bodies available for later `(call:)` usage.
function extractAndRegisterFunctions(
  input: string,
  registry: Record<string, string>,
): string {
  let result = "";
  let cursor = 0;
  let searchFrom = 0;

  while (searchFrom < input.length) {
    const fnStart = input.indexOf("(fn:", searchFrom);
    if (fnStart === -1) {
      break;
    }

    const parsed = consumeFnDefinition(input, fnStart);
    if (!parsed) {
      searchFrom = fnStart + 4;
      continue;
    }

    result += input.slice(cursor, fnStart);
    registry[parsed.name] = parsed.code;
    cursor = parsed.endIndex;
    searchFrom = parsed.endIndex;
  }

  result += input.slice(cursor);
  return result;
}

// `set` macros are side-effects that mutate the story `variables`.
// We scan and execute them when entering a passage (applyPassageEntryEffects),
// and then strip them from rendering output using `stripSetMacros`.
function applySetMacros(input: string, variables: VariableMap): string {
  let result = "";
  let cursor = 0;
  let searchFrom = 0;

  while (searchFrom < input.length) {
    const setStart = input.indexOf("(set:", searchFrom);
    if (setStart === -1) {
      break;
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
    variables[variableName] = evaluateExpression(nextValue, variables);

    result += input.slice(cursor, setStart);
    cursor = parsed.endIndex;
    searchFrom = parsed.endIndex;
  }

  result += input.slice(cursor);
  return result;
}

// Remove `(set: ...)` macros from the content so they don't appear
// in the rendered HTML. This mirrors `applySetMacros` which executes
// the assignments.
function stripSetMacros(input: string): string {
  let result = "";
  let cursor = 0;
  let searchFrom = 0;

  while (searchFrom < input.length) {
    const setStart = input.indexOf("(set:", searchFrom);
    if (setStart === -1) {
      break;
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

// Tags treated as raw HTML block wrappers by the markdown renderer.
// When a line starts with `<tag>` and `tag` is in this set, the
// renderer captures and emits the raw HTML block unchanged.
const MARKDOWN_RAW_HTML_BLOCK_TAGS = new Set([
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

// Lightweight inline markdown renderer:
// - Inline code: `code`
// - Bold/italic/del and link syntax
// It preserves already embedded HTML fragments.
function renderMarkdownInline(input: string): string {
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

// Lightweight block-level markdown renderer supporting:
// - Headings (`#`), lists, blockquotes (`>`), code fences (```),
// - Paragraph grouping, and raw HTML blocks listed in
//   `MARKDOWN_RAW_HTML_BLOCK_TAGS`.
function renderMarkdownBlocks(input: string): string {
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

// --- Conditional macros ---
// ParsedIfMacro describes a consumed `(if: condition)[true](else:)[false]`
// block; the parser uses a balanced scanner to extract branches safely.
interface ParsedIfMacroBranch {
  condition: string | null;
  branch: string;
}

interface ParsedIfMacro {
  fullEndIndex: number;
  branches: ParsedIfMacroBranch[];
}

// consumeIfMacro: extracts an `(if: ...) [true] (else:)[false]` macro
// returning the condition and branch contents for evaluation.
function consumeIfMacro(
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

  // support multiple (else-if: <cond>)[...] blocks and a final (else:)[...]
  while (cursor < source.length) {
    // try else-if variants: (else-if: ...) or (elseif: ...)
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

    // also accept (elseif:...) without hyphen
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

// replaceIfMacros: walks input replacing conditional macros with the
// rendered branch content. Branch content is recursively passed through
// `renderStoryText` to allow nested macros within branches.
function replaceIfMacros(
  input: string,
  variables: VariableMap,
  story: StoryData,
  routeTo: (target: string) => void,
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

    // find the first branch that matches (or the final else branch)
    let selected = "";
    for (const b of parsed.branches) {
      if (b.condition === null) {
        selected = b.branch;
        break;
      }
      if (evaluateCondition(b.condition, variables)) {
        selected = b.branch;
        break;
      }
    }

    result += renderStoryText(selected, variables, story, routeTo);

    cursor = parsed.fullEndIndex;
    searchFrom = parsed.fullEndIndex;
  }

  result += input.slice(cursor);
  return result;
}

// Entry effects
// applyPassageEntryEffects executes side-effecting macros (currently
// `set`) when entering a passage. This keeps effects out of render
// passes and avoids reactive update cycles caused by rendering.
export function applyPassageEntryEffects(
  content: string,
  variables: VariableMap,
): void {
  applySetMacros(content, variables);
}

const CALL_IN_EXPRESSION_PATTERN =
  /call:\s*["']([^"']+)["']((?:\s+(?:"[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*'|\$[A-Za-z_][A-Za-z0-9_]*|-?\d+(?:\.\d+)?|true|false|null|undefined))*)/gi;
const CALL_ARG_TOKEN_PATTERN =
  /"[^"\\]*(?:\\.[^"\\]*)*"|'[^'\\]*(?:\\.[^'\\]*)*'|\$[A-Za-z_][A-Za-z0-9_]*|-?\d+(?:\.\d+)?|true|false|null|undefined/g;

// JS function execution
// Functions registered in `GLOBAL_JS_FUNCTIONS` are executed via a
// dynamic Function wrapper with `vars` and `args` provided. Errors are
// caught and suppressed to avoid breaking the renderer.
function executeStoryJsFunction(
  name: string,
  args: unknown[],
  variables: VariableMap,
): unknown {
  const code = GLOBAL_JS_FUNCTIONS[name];
  if (!code) return undefined;
  try {
    const fn = new Function("vars", "args", code);
    return fn(variables, args);
  } catch {
    return undefined;
  }
}

// parseCallArgs: tokenizes a small set of literal argument tokens used
// in `(call:"name" arg1 arg2 ...)`. Supported token forms:
// - double/single-quoted strings
// - variable references like `$var`
// - numeric literals, booleans, `null`, `undefined`
function parseCallArgs(
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

function toExpressionLiteral(value: unknown): string {
  if (value === undefined) {
    return "undefined";
  }

  const json = JSON.stringify(value);
  return json === undefined ? "undefined" : json;
}

function replaceCallExpressions(
  expression: string,
  variables: VariableMap,
): string {
  return expression.replace(
    CALL_IN_EXPRESSION_PATTERN,
    (_full: string, name: string, argsSegment?: string) => {
      const args = parseCallArgs(argsSegment, variables);
      return toExpressionLiteral(executeStoryJsFunction(name, args, variables));
    },
  );
}

export function evaluateExpression(
  expression: string,
  variables: VariableMap,
): unknown {
  const normalized = expression.trim();
  if (!normalized) {
    return 0;
  }
  const withCalls = replaceCallExpressions(normalized, variables);

  const compiled = withCalls
    .replace(
      /\$([A-Za-z_][A-Za-z0-9_]*)/g,
      (_, name: string) => `vars["${name}"]`,
    )
    .replace(/\b(?:not )\b/g, "!")
    .replace(/\b(?:is not|ne)\b/g, "!==")
    .replace(/\b(?:is|eq)\b/g, "===")
    .replace(/\b(?:and)\b/g, "&&")
    .replace(/\b(?:or)\b/g, "||");

  // support `contains` operator: transform `A contains B` -> `__contains__(A, B)`
  const compiledWithContains = compiled.replace(
    /([A-Za-z0-9_\]\)"'`\.\[\]]+)\s+contains\s+("[^\"]*"|'[^']*'|[A-Za-z0-9_\]\)"'`\.\[\]]+)/g,
    "__contains__($1,$2)",
  );

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
    return eval(compiledWithContains);
  })();
}

export function evaluateCondition(
  condition: string,
  variables: VariableMap,
): boolean {
  const normalized = condition.trim();
  if (!normalized) {
    return false;
  }

  const value = evaluateExpression(normalized, variables);
  return Boolean(value);
}

export function applyStoryAction(action: string, variables: VariableMap): void {
  const normalized = action.trim();
  const cleaned = normalized.replace(/^\(+|\)+$/g, "").trim();

  // helper to execute a previously-registered JS function
  function executeCall(name: string, argsRaw?: string): unknown {
    const args = parseCallArgs(argsRaw, variables);
    return executeStoryJsFunction(name, args, variables);
  }

  // set: $x to <expr>  — 支持 <expr> 为 call: 表达式
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
      const result = executeCall(callMatch[1], callMatch[2]);
      variables[variableName] = result;
      return;
    }

    variables[variableName] = evaluateExpression(rhs, variables);
    return;
  }

  // standalone call: call:"name" args...
  const callOnlyMatch = cleaned.match(
    /^call:\s*["']([^"']+)["'](?:\s+(.+))?$/i,
  );
  if (callOnlyMatch) {
    executeCall(callOnlyMatch[1], callOnlyMatch[2]);
    return;
  }

  // unknown action — ignore
  return;
}

function extractGotoTarget(actionBlock: string): string | undefined {
  const normalized = actionBlock.trim();
  const gotoMatch = normalized.match(
    /goto:\s*(?:["']([^"']+)["']|([^\]\)]+))/i,
  );
  return (gotoMatch?.[1] ?? gotoMatch?.[2])?.trim();
}

function replaceTextWithHtml(
  raw: string,
  variables: VariableMap,
  story: StoryData,
  routeTo: (target: string) => void,
): string {
  const styleBlocks: string[] = [];
  const htmlFragments: string[] = [];
  let working = raw.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, (match) => {
    const placeholder = `$STYLE_BLOCK$${styleBlocks.length}$`;
    styleBlocks.push(match);
    return placeholder;
  });

  // 先扫描并注册函数，段落内的 set 副作用由“进入段落”时单独执行，避免渲染期修改响应式状态。
  working = extractAndRegisterFunctions(working, GLOBAL_JS_FUNCTIONS);
  working = stripSetMacros(working);

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
      const target = extractGotoTarget(actionBlock) || label;
      const actionMatch = (actionBlock || "").match(
        /(?:set:\s*[^)\]]+|call:\s*[^)\]]+)/i,
      );
      const actionAttr = actionMatch
        ? ` data-story-action="${actionMatch[0].replace(/"/g, "'")}"`
        : "";
      return `<button type="button" class="story-link" data-story-target="${escapeHtml(target)}" data-story-goto="${escapeHtml(target)}"${actionAttr}>${escapeHtml(label)}</button>`;
    },
  );

  // Support optional action in the form of (set: ...) or (call: ...)
  working = working.replace(
    /\[\[([^\]|]+)(?:\|([^\]]+))?\]\](?:\(((?:set:\s*[^)]+|call:\s*[^)]+))\))?/g,
    (_, label: string, target?: string, action?: string) => {
      const passageName = label.trim();
      const actualTarget = (target ?? label).trim();
      const actionAttribute = action
        ? ` data-story-action="${action.replace(/"/g, "'")}"`
        : "";
      return `<button type="button" class="story-link" data-story-target="${escapeHtml(actualTarget)}"${actionAttribute}>${escapeHtml(passageName)}</button>`;
    },
  );

  // 支持调用已定义的函数： (call:"name" arg1 arg2)
  const callPattern = /\(call:\s*["']([^"']+)["'](?:\s+([^)]*?))?\)/g;
  working = working.replace(
    callPattern,
    (_full: string, name: string, argsRaw?: string) => {
      const args = parseCallArgs(argsRaw, variables);
      const result = executeStoryJsFunction(name, args, variables);
      return escapeHtml(String(result ?? ""));
    },
  );

  working = replaceIfMacros(working, variables, story, routeTo);

  const displayPattern = /\(display:\s*["']([^"']+)["']\s*\)/g;
  working = working.replace(displayPattern, (_, targetName: string) => {
    const target = story.passages.find(
      (passage) => passage.name === targetName,
    );
    if (!target) {
      return "";
    }
    const placeholder = `$HTML_FRAGMENT$${htmlFragments.length}$`;
    htmlFragments.push(
      renderStoryText(target.content, variables, story, routeTo),
    );
    return placeholder;
  });

  const printPattern = /\(print:\s*([^)]*?)\)/g;
  working = working.replace(printPattern, (_, expression: string) => {
    const resolved = evaluateExpression(expression, variables);
    return escapeHtml(String(resolved));
  });

  const gotoPattern = /\(goto:\s*["']([^"']+)['"]\s*\)/g;
  working = working.replace(gotoPattern, (_, targetName: string) => {
    return `<button type="button" class="story-link" data-story-target="${escapeHtml(targetName)}">${escapeHtml(targetName)}</button>`;
  });

  working = working.replace(/''([^']+)''/g, "<strong>$1</strong>");
  working = working.replace(/(?<!:)\/\/([^/\n]+?)\/\//g, "<em>$1</em>");
  working = working.replace(/~~([^~]+)~~/g, "<del>$1</del>");
  working = working.replace(/\^\^([^\^]+)\^\^/g, "<sup>$1</sup>");
  working = working.replace(/,,([^,]+),,/g, "<sub>$1</sub>");

  working = renderMarkdownBlocks(working);

  working = sanitizeAllowedHtml(working);
  for (const [index, styleBlock] of styleBlocks.entries()) {
    working = working.replace(`$STYLE_BLOCK$${index}$`, styleBlock);
  }
  for (const [index, fragment] of htmlFragments.entries()) {
    working = working.replace(`$HTML_FRAGMENT$${index}$`, fragment);
  }
  return working;
}

export function renderStoryText(
  input: string,
  variables: VariableMap,
  story: StoryData,
  routeTo: (target: string) => void,
): string {
  const rendered = replaceTextWithHtml(input, variables, story, routeTo);
  return rendered;
}

export function normalizePassageName(name: string): string {
  return name.trim().replace(/^"|"$/g, "");
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function sanitizeAllowedHtml(value: string): string {
  const tagPattern = /<\/?([a-zA-Z0-9]+)(\s+[^>]*)?>/g;
  let lastIndex = 0;
  let result = "";

  for (const match of value.matchAll(tagPattern)) {
    const tagText = match[0];
    const tagName = match[1]?.toLowerCase();
    const start = match.index ?? 0;
    const before = value.slice(lastIndex, start);

    result += escapeHtml(before);
    if (!tagName || !ALLOWED_HTML_TAGS.has(tagName)) {
      result += escapeHtml(tagText);
    } else {
      result += sanitizeTag(tagText, tagName);
    }

    lastIndex = start + tagText.length;
  }

  result += escapeHtml(value.slice(lastIndex));
  return result;
}

function sanitizeTag(tagText: string, tagName: string): string {
  const closingTag = /^<\//.test(tagText);
  if (closingTag) {
    return `</${tagName}>`;
  }

  const attributes = tagText.slice(tagName.length + 1, -1);
  const safeAttributes: string[] = [];
  const attrRegex = /([a-zA-Z:-]+)\s*=\s*("[^"]*"|'[^']*'|\S+)/g;
  for (const match of attributes.matchAll(attrRegex)) {
    const rawName = match[1];
    const rawValue = match[2];
    const lowerName = rawName.toLowerCase();
    if (lowerName.startsWith("on")) {
      continue;
    }
    if (rawValue.startsWith("javascript:") || rawValue.includes("data:")) {
      continue;
    }

    const formattedValue =
      rawValue.startsWith('"') || rawValue.startsWith("'")
        ? rawValue.slice(1, -1)
        : rawValue;
    safeAttributes.push(`${rawName}="${escapeHtml(formattedValue)}"`);
  }

  const attributeString = safeAttributes.length
    ? ` ${safeAttributes.join(" ")}`
    : "";
  return `<${tagName}${attributeString}>`;
}

export function buildStandaloneExport(
  story: StoryData,
  variables: VariableMap,
  currentPassage: string,
): string {
  const safeStory = JSON.stringify(story);
  const safeVariables = JSON.stringify(variables);
  const safeCurrent = JSON.stringify(currentPassage);
  // Collect helper functions and constants from this module and serialize
  const helperOrder = [
    "ALLOWED_HTML_TAGS",
    "CALL_IN_EXPRESSION_PATTERN",
    "CALL_ARG_TOKEN_PATTERN",
    "MARKDOWN_RAW_HTML_BLOCK_TAGS",
    "escapeHtml",
    "executeStoryJsFunction",
    "extractGotoTarget",
    "parseCallArgs",
    "toExpressionLiteral",
    "replaceCallExpressions",
    "readBalancedBlock",
    "consumeFnDefinition",
    "extractAndRegisterFunctions",
    "applySetMacros",
    "applyPassageEntryEffects",
    "stripSetMacros",
    "consumeIfMacro",
    "replaceIfMacros",
    "renderMarkdownInline",
    "renderMarkdownBlocks",
    "evaluateExpression",
    "replaceTextWithHtml",
    "renderStoryText",
    "sanitizeAllowedHtml",
    "sanitizeTag",
    "evaluateCondition",
  ];

  const fnMap: Record<string, any> = {
    ALLOWED_HTML_TAGS,
    CALL_IN_EXPRESSION_PATTERN,
    CALL_ARG_TOKEN_PATTERN,
    MARKDOWN_RAW_HTML_BLOCK_TAGS,
    escapeHtml,
    executeStoryJsFunction,
    extractGotoTarget,
    parseCallArgs,
    toExpressionLiteral,
    replaceCallExpressions,
    readBalancedBlock,
    consumeFnDefinition,
    extractAndRegisterFunctions,
    applySetMacros,
    applyPassageEntryEffects,
    stripSetMacros,
    consumeIfMacro,
    replaceIfMacros,
    renderMarkdownInline,
    renderMarkdownBlocks,
    evaluateExpression,
    replaceTextWithHtml,
    renderStoryText,
    sanitizeAllowedHtml,
    sanitizeTag,
    evaluateCondition,
  };

  const helpersSrc = helperOrder
    .map((name) => {
      const v = fnMap[name];
      if (typeof v === "function") return v.toString();
      try {
        if (v instanceof RegExp) return `const ${name} = ${v.toString()};`;
        if (v instanceof Set)
          return `const ${name} = new Set(${JSON.stringify(Array.from(v))});`;
        return `const ${name} = ${JSON.stringify(v)};`;
      } catch (e) {
        return `// could not serialize ${name}`;
      }
    })
    .join("\n\n");

  return `<!DOCTYPE html>
<html lang="zh-Hant">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(story.title)}</title>
    <style>
      body { font-family: "Segoe UI", sans-serif; background: #f6f7fb; color: #1a1b2a; margin: 0; }
      .story-shell { max-width: 880px; margin: 48px auto; padding: 32px; background: white; border-radius: 18px; box-shadow: 0 12px 40px rgba(15, 23, 42, 0.08); }
      .story-title { font-size: 2rem; font-weight: 700; margin-bottom: 18px; }
      .story-content { line-height: 1.9; font-size: 1.05rem; }
      .story-link { background: #4f46e5; color: white; border: none; border-radius: 999px; padding: 0.45rem 0.9rem; cursor: pointer; margin: 0.25rem; }
      .story-link:hover { background: #4338ca; }
      .meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
      .badge { background: #eef2ff; color: #3730a3; border-radius: 999px; padding: 0.35rem 0.6rem; font-size: 0.75rem; }
      .sidebar { margin-top: 1rem; padding: 1rem; background: #f8fafc; border-radius: 12px; }
      .var-list { display: grid; gap: 0.5rem; }
      .var-item { display: flex; justify-content: space-between; }

      /* Markdown styles scoped to .story-content */
      .story-content h1,
      .story-content h2,
      .story-content h3,
      .story-content h4,
      .story-content h5,
      .story-content h6 {
        margin: 1rem 0 0.5rem;
        line-height: 1.25;
        font-weight: 700;
      }
      .story-content p { margin: 0.6rem 0; }
      .story-content ul, .story-content ol { list-style-position: inside; }
      .story-content ul { list-style-type: '· '; }
      .story-content ol { list-style-type: decimal; }
      .story-content li { margin: 0.25rem 0; }
      .story-content pre { background: #0f1724; color: #e6eef8; padding: 0.75rem; border-radius: 0.5rem; overflow: auto; margin: 0.75rem 0; }
      .story-content code { background: #f3f4f6; padding: 0.12rem 0.36rem; border-radius: 0.375rem; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", monospace; font-size: 0.95em; }
      .story-content pre code { background: transparent; padding: 0; }
      .story-content blockquote { border-left: 4px solid rgba(99,102,241,0.12); padding: 0.5rem 1rem; margin: 0.6rem 0; background: #fbfbfe; color: #334155; }
      .story-content table { width: 100%; border-collapse: collapse; margin: 0.75rem 0; }
      .story-content th, .story-content td { border: 1px solid #e6e7ef; padding: 0.5rem 0.75rem; text-align: left; }
      .story-content thead th { background: #f8fafc; }
      .story-content a { color: #2563eb; text-decoration: underline; }
      .story-content img { max-width: 100%; height: auto; border-radius: 6px; }
    </style>
  </head>
  <body>
    <div class="story-shell">
      <div class="meta">
        <span class="badge">独立可玩故事</span>
      </div>
      <h1 class="story-title">${escapeHtml(story.title)}</h1>
      <div id="story-root" class="story-content"></div>
      <aside class="sidebar">
        <h3>变量面板</h3>
        <div id="variables-root" class="var-list"></div>
      </aside>
    </div>
      <script>
        const story = ${safeStory};
        const variables = ${safeVariables};
        const currentPassageName = ${safeCurrent};
        const GLOBAL_JS_FUNCTIONS = {};

  ${helpersSrc}

        function renderPassage(passageName) {
          const passage = story.passages.find((p) => p.name === passageName) || story.passages[0]
          variables.passage = passage.name
          variables.storyTitle = story.title

          const passageContentForEffects = extractAndRegisterFunctions(passage.content, GLOBAL_JS_FUNCTIONS)
          applyPassageEntryEffects(passageContentForEffects, variables)
          document.getElementById('story-root').innerHTML = renderStoryText(passageContentForEffects, variables, story, renderPassage)

          const varRoot = document.getElementById('variables-root')
          const entries = Object.entries(variables).filter(([key]) => key !== 'passage' && key !== 'storyTitle')
          varRoot.innerHTML = entries.length
            ? entries.map(([key, value]) => \`<div class="var-item"><span>\${escapeHtml(key)}</span><strong>\${escapeHtml(String(value))}</strong></div>\`).join('')
            : '<p>暂无变量</p>'

          const nodes = document.querySelectorAll('[data-story-target]')
          nodes.forEach((node) => {
            node.addEventListener('click', () => {
              const action = node.getAttribute('data-story-action')
              if (action) {
                const setMatch = action.trim().match(/^set:\s*(\$[A-Za-z_][A-Za-z0-9_]*)\s+to\s+(.+)$/)
                if (setMatch) {
                  variables[setMatch[1].slice(1)] = evaluateExpression(setMatch[2], variables)
                } else {
                  const callMatch = action.trim().match(/^call:\s*["']([^"']+)["'](?:\s+(.+))?$/i)
                  if (callMatch) {
                    const args = parseCallArgs(callMatch[2], variables)
                    executeStoryJsFunction(callMatch[1], args, variables)
                  }
                }
              }
              const target = node.getAttribute('data-story-target')
              if (target) renderPassage(target)
            })
          })
        }

        renderPassage(currentPassageName);
    </script>
  </body>
</html>`;
}
