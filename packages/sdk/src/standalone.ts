import type { StoryData, VariableMap } from "./types";
import {
  ALLOWED_HTML_TAGS,
  BLOCK_TAGS,
  PRESERVE_NEWLINE_TAGS,
  escapeHtml,
  formatTextNode,
  sanitizeTag,
  sanitizeAllowedHtml,
} from "./sanitizer";
import {
  readBalancedBlock,
  consumeFnDefinition,
  extractAndRegisterFunctions,
} from "./scanner";
import {
  CALL_IN_EXPRESSION_PATTERN,
  CALL_ARG_TOKEN_PATTERN,
  MARKDOWN_RAW_HTML_BLOCK_TAGS,
  compileExpressionSource,
  createDefaultEvaluator,
  encodeAttributeValue,
  decodeAttributeValue,
  parseCallArgs,
  toExpressionLiteral,
  replaceCallExpressions,
  evaluateExpression,
  evaluateCondition,
  parseSpecialMarker,
  readPointQueue,
  writePointQueue,
  queuePointMarker,
  consumePointMarkers,
  peekPointMarkers,
  cloneRenderVariables,
  transferPointQueueToRenderVariables,
  findLinkActionRanges,
  findStandaloneSpecialBlocks,
  stripStandaloneSpecialBlocks,
  resolveIfMacrosForEffects,
  applyPointMacros,
  renderPointMarker,
  renderEndingMarker,
  detectRenderSpecials,
  applyStoryAction,
  applySetMacros,
  stripSetMacros,
  applyPassageEntryEffects,
  renderMarkdownInline,
  renderMarkdownBlocks,
  consumeIfMacro,
  replaceIfMacros,
  extractGotoTarget,
  buildStoryLink,
  replaceTextWithHtml,
  renderStoryText,
  isWithinRanges,
  renderStoryTextInternal,
} from "./renderer";
import { buildInitialVariables } from "./parser";

// Functions/constants that must be embedded verbatim (via `.toString()`) into
// the exported standalone HTML so the page can run the same DSL without any
// bundler. Order matters: later entries may reference earlier ones by name.
const HELPER_ORDER = [
  "ALLOWED_HTML_TAGS",
  "BLOCK_TAGS",
  "PRESERVE_NEWLINE_TAGS",
  "escapeHtml",
  "formatTextNode",
  "sanitizeTag",
  "sanitizeAllowedHtml",
  "readBalancedBlock",
  "consumeFnDefinition",
  "extractAndRegisterFunctions",
  "CALL_IN_EXPRESSION_PATTERN",
  "CALL_ARG_TOKEN_PATTERN",
  "MARKDOWN_RAW_HTML_BLOCK_TAGS",
  "compileExpressionSource",
  "createDefaultEvaluator",
  "encodeAttributeValue",
  "decodeAttributeValue",
  "parseCallArgs",
  "toExpressionLiteral",
  "replaceCallExpressions",
  "evaluateExpression",
  "evaluateCondition",
  "parseSpecialMarker",
  "readPointQueue",
  "writePointQueue",
  "queuePointMarker",
  "consumePointMarkers",
  "peekPointMarkers",
  "cloneRenderVariables",
  "transferPointQueueToRenderVariables",
  "findLinkActionRanges",
  "findStandaloneSpecialBlocks",
  "stripStandaloneSpecialBlocks",
  "resolveIfMacrosForEffects",
  "applyPointMacros",
  "renderPointMarker",
  "renderEndingMarker",
  "detectRenderSpecials",
  "applyStoryAction",
  "applySetMacros",
  "stripSetMacros",
  "isWithinRanges",
  "applyPassageEntryEffects",
  "renderMarkdownInline",
  "renderMarkdownBlocks",
  "renderStoryTextInternal",
  "consumeIfMacro",
  "replaceIfMacros",
  "extractGotoTarget",
  "buildStoryLink",
  "replaceTextWithHtml",
  "renderStoryText",
] as const;

const HELPER_MAP: Record<(typeof HELPER_ORDER)[number], unknown> = {
  ALLOWED_HTML_TAGS,
  BLOCK_TAGS,
  PRESERVE_NEWLINE_TAGS,
  escapeHtml,
  formatTextNode,
  sanitizeTag,
  sanitizeAllowedHtml,
  readBalancedBlock,
  consumeFnDefinition,
  extractAndRegisterFunctions,
  CALL_IN_EXPRESSION_PATTERN,
  CALL_ARG_TOKEN_PATTERN,
  MARKDOWN_RAW_HTML_BLOCK_TAGS,
  compileExpressionSource,
  createDefaultEvaluator,
  encodeAttributeValue,
  decodeAttributeValue,
  parseCallArgs,
  toExpressionLiteral,
  replaceCallExpressions,
  evaluateExpression,
  evaluateCondition,
  parseSpecialMarker,
  isWithinRanges,
  readPointQueue,
  writePointQueue,
  queuePointMarker,
  consumePointMarkers,
  peekPointMarkers,
  cloneRenderVariables,
  transferPointQueueToRenderVariables,
  findLinkActionRanges,
  findStandaloneSpecialBlocks,
  stripStandaloneSpecialBlocks,
  resolveIfMacrosForEffects,
  applyPointMacros,
  renderPointMarker,
  renderEndingMarker,
  detectRenderSpecials,
  applyStoryAction,
  applySetMacros,
  stripSetMacros,
  applyPassageEntryEffects,
  renderMarkdownInline,
  renderMarkdownBlocks,
  renderStoryTextInternal,
  consumeIfMacro,
  replaceIfMacros,
  extractGotoTarget,
  buildStoryLink,
  replaceTextWithHtml,
  renderStoryText,
};

function serializeHelpers(): string {
  return HELPER_ORDER.map((name) => {
    const value = HELPER_MAP[name];
    if (typeof value === "function") return value.toString();
    if (value instanceof RegExp) return `const ${name} = ${value.toString()};`;
    if (value instanceof Set)
      return `const ${name} = new Set(${JSON.stringify(Array.from(value))});`;
    try {
      return `const ${name} = ${JSON.stringify(value)};`;
    } catch {
      return `// could not serialize ${name}`;
    }
  }).join("\n\n");
}

/**
 * Builds a fully self-contained HTML document embedding the story, its
 * current variables/passage, and a copy of the SDK's rendering engine
 * (unminified, see packages/sdk/tsdown.config.ts) so it can run standalone
 * without any bundler. Links/attributes are rendered as-is (no encoding),
 * matching this module's default no-op `encodeAttribute`/`decodeAttribute`.
 *
 * @param story - The story to export.
 * @param variables - Current variable values to embed.
 * @param currentPassage - Name of the passage to render first.
 * @returns A complete, standalone HTML document string.
 */
export function buildStandaloneExport(
  story: StoryData,
  variables?: VariableMap,
  currentPassage?: string,
): string {
  const safeStory = JSON.stringify(story);
  const safeVariables = JSON.stringify(
    variables || buildInitialVariables(story),
  );
  const safeCurrent = JSON.stringify(currentPassage || story.startPassage);
  const helpersSrc = serializeHelpers();

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
      .story-link { background: #4f46e5; color: white; border: none; border-radius: 2px; padding: 2px 4px; cursor: pointer; margin: 2px; }
      .story-link:hover { background: #4338ca; }
      .story-point { background: #eef2ff; color: #3730a3; border-radius: 12px; padding: 0.5rem 1rem; margin: 1rem 0; }
      .story-end { background: #fef3c7; color: #78350f; border-radius: 12px; padding: 0.5rem 1rem; margin: 1rem 0; }
      .meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
      .badge { background: #eef2ff; color: #3730a3; border-radius: 999px; padding: 0.35rem 0.6rem; font-size: 0.75rem; }
      .sidebar { margin-top: 1rem; padding: 1rem; background: #f8fafc; border-radius: 12px; }
      .hidden { display: none; }
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
        <span class="badge">织言 · Tellory</span>
      </div>
      <h1 class="story-title">${escapeHtml(story.title)}</h1>
      <div id="story-root" class="story-content"></div>
      <aside class="sidebar hidden">
        <h3>变量面板</h3>
        <div id="variables-root" class="var-list"></div>
      </aside>
    </div>
      <script>
        const story = ${safeStory};
        const variables = ${safeVariables};
        const currentPassageName = ${safeCurrent};
        const GLOBAL_JS_FUNCTIONS = {};
        const POINT_QUEUE_KEY = "__story_point_queue";

  ${helpersSrc}

        const engineCtx = createDefaultEvaluator(GLOBAL_JS_FUNCTIONS);

        function renderPassage(passageName) {
          const passage = story.passages.find((p) => p.name === passageName) || story.passages[0];
          variables.passage = passage.name;
          variables.storyTitle = story.title;
          engineCtx.displayPassages = engineCtx.displayPassages || {};

          const root = document.getElementById('story-root');
          const varRoot = document.getElementById('variables-root');
          let entryRenderVariables = null;

          function updateVars() {
            const entries = Object.entries(variables).filter(([key]) => key !== 'passage' && key !== 'storyTitle');
            varRoot.innerHTML = entries.length
              ? entries.map(([key, value]) => \`<div class="var-item"><span>\${escapeHtml(key)}</span><strong>\${escapeHtml(String(value))}</strong></div>\`).join('')
              : '<p>暂无变量</p>';
          }

          function doRender(runEntryEffects, useEntrySnapshot) {
            let renderVars;
            if (runEntryEffects) {
              entryRenderVariables = { ...variables };
              renderVars = undefined;
            } else if (useEntrySnapshot && entryRenderVariables) {
              renderVars = { ...entryRenderVariables };
            } else {
              renderVars = undefined;
            }
            const contentForRender = extractAndRegisterFunctions(passage.content, GLOBAL_JS_FUNCTIONS);
            root.innerHTML = renderStoryText(contentForRender, variables, story, engineCtx, {
              applyEntryEffects: runEntryEffects,
              ...(renderVars ? { renderVariables: renderVars } : {}),
            });
            updateVars();
            attachListeners();
          }

          function attachListeners() {
            const nodes = root.querySelectorAll('[data-story-target], [data-story-action], [data-story-display]');
            nodes.forEach((node) => {
              node.addEventListener('click', () => {
                const display = node.getAttribute('data-story-display');
                if (display) {
                  engineCtx.displayPassages = engineCtx.displayPassages || {};
                  engineCtx.displayPassages[display] = true;
                  // Re-render only (do not re-run entry effects), keeping the
                  // entry snapshot so (if:) branches stay consistent.
                  doRender(false, true);
                  return;
                }

                const action = node.getAttribute('data-story-action');
                if (action) {
                  applyStoryAction(action, variables, engineCtx);
                }
                const target = node.getAttribute('data-story-target');
                if (target) {
                  renderPassage(target);
                  return;
                }
                doRender(false, false);
              });
            });
          }

          doRender(true, false);
        }

        renderPassage(currentPassageName);
    </script>
  </body>
</html>`;
}
