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
import {
  type VariableMap,
  type StoryPassage,
  type StoryData,
  type StoryEngineContext,
  parseStorySource,
  createDefaultEvaluator,
  applyPassageEntryEffects as sdkApplyPassageEntryEffects,
  applyStoryAction as sdkApplyStoryAction,
  renderStoryText as sdkRenderStoryText,
  buildStandaloneExport as sdkBuildStandaloneExport,
} from "tellory";

export type { VariableMap, StoryPassage, StoryData };

export const EMPTY_STORY_SOURCE = `标题：未命名故事

:: Start
新故事开始了。
`;

export const DEFAULT_STORY_SOURCE = `标题：语法示例 Demo

:: Start
这是一个用于演示所有语法的故事。
这里开始初始化变量
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
[[拿起钥匙|Hall]](set: $hasKey to true)
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

// 函数字典（仅在当前会话内生效）
const GLOBAL_JS_FUNCTIONS: Record<string, string> = {};

// Browser-side rendering context: eval/Function-based evaluation; link
// targets/actions render as-is (the server encrypts them instead, since it
// doesn't need to for the browser).
const engineCtx: StoryEngineContext =
  createDefaultEvaluator(GLOBAL_JS_FUNCTIONS);

export {
  parseStorySource,
  serializeStory,
  buildInitialVariables,
  extractStorySpecials,
} from "tellory";

export function createDefaultStory(): StoryData {
  return parseStorySource(DEFAULT_STORY_SOURCE);
}

export function createEmptyStory(): StoryData {
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

// Entry effects
// applyPassageEntryEffects executes side-effecting macros (currently
// `set`) when entering a passage. This keeps effects out of render
// passes and avoids reactive update cycles caused by rendering.
export function applyPassageEntryEffects(
  content: string,
  variables: VariableMap,
): void {
  sdkApplyPassageEntryEffects(content, variables, engineCtx);
}

export function applyStoryAction(action: string, variables: VariableMap): void {
  sdkApplyStoryAction(action, variables, engineCtx);
}

export function renderStoryText(
  input: string,
  variables: VariableMap,
  story: StoryData,
  routeTo: (target: string) => void,
  displayPassages: Record<string, boolean> = {},
  options?: {
    applyEntryEffects?: boolean;
    renderVariables?: VariableMap;
  },
): string {
  return sdkRenderStoryText(
    input,
    variables,
    story,
    {
      ...engineCtx,
      routeTo,
      displayPassages,
    },
    options,
  );
}

export function buildStandaloneExport(
  story: StoryData,
  variables: VariableMap,
  currentPassage: string,
): string {
  return sdkBuildStandaloneExport(story, variables, currentPassage);
}
