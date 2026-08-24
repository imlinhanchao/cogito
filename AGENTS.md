# 编辑器与渲染器（Story Engine）设计说明

以下内容总结并归档了当前工作区内交互式故事编辑器与渲染器的设计意图、架构要点、数据流、扩展点与安全注意事项。

**位置**
- 引擎核心实现：`src/lib/storyEngine.ts`
- 编辑器视图：`src/views/StoryEditorView.vue`
- 播放视图：`src/views/StoryPlayView.vue`
- 全局样式：`src/styles/main.css`

**总体目标**
为轻量级交互式故事提供：
- 易于编写的段落/宏语法（例如：`(set:)`, `(if:)`, `(fn:)`, `(call:)`, `[[link|Target]]`）
- 在编辑器内即时渲染与预览
- 导出为单文件可运行 HTML（`buildStandaloneExport`）
- 可扩展的用户 JS 函数注册与调用（会话内）

## 核心设计摘要

1. 解析器与扫描器
- 使用一个小巧的 "balanced-block" 扫描器（`readBalancedBlock`），用于安全识别成对的分隔符（例如 `(...)`、`[...]`）。
- 避免依赖全局正则表达式来解析嵌套或带引号的代码块，从而防止截断或错配。

2. 宏与副作用
- `(fn:"name")[code]`：函数定义会被提取并注册到 `GLOBAL_JS_FUNCTIONS`（会话内）。
- `(call:"name" args...)`：在渲染或表达式求值时解析并执行（先解析参数，再调用 `new Function` 执行注册的代码）。
- `(set: $x to <expr>)`：被视作副作用；在进入段落时统一执行（`applyPassageEntryEffects`），同时从渲染输出中移除（`stripSetMacros`）以避免渲染周期内的重复副作用。

3. 条件与分支
- `(if: condition)[true](else:)[false]`：通过 `consumeIfMacro` 提取分支内容并在渲染时根据 `evaluateCondition` 的结果选择分支。
- 分支内容会递归走渲染管线，允许嵌套宏。

4. 表达式求值
- 简单的表达式编译器：将 `$var` 替换为 `vars["var"]`，将自定义关键字（`is not`、`eq`、`and`、`or`）映射到 JS 运算符，然后通过 `eval` 在闭包作用域内执行。
- 在求值前，会先 `replaceCallExpressions` 处理任何内联的 `(call:)`，将其替换为调用结果的字面量。
- 注意：表达式执行存在风险（`eval`），应仅在受信任内容或受限场景下使用；编辑器层应对不可信输入做提示或沙箱化处理。

5. Markdown 渲染
- 内置轻量 Markdown 渲染器：支持标题、段落、无序/有序列表、引用、代码块与行内代码、粗体/斜体/删除线、链接与表格基础。
- 支持原生 HTML 区块（由 `MARKDOWN_RAW_HTML_BLOCK_TAGS` 列表控制），允许段落内嵌入受限的 HTML 块及 `<style>`。

6. 安全与消毒
- 渲染输出经过 `sanitizeAllowedHtml` 处理：仅允许白名单内的标签（`ALLOWED_HTML_TAGS`），并对属性做过滤（移除 `on*`、`javascript:`、`data:` 等危险值）。
- 已注册的 JS 函数仍会以 `new Function` 执行，具有与页面同等权限；导出 HTML 会把函数体内联，这意味着导出的文件会执行这些函数 —— 这是一个设计选择，为了便携性，但也带来了安全注意事项。

## 渲染管线（高层次数据流）
1. 编辑器/播放请求渲染某个段落（passage）。
2. 在进入段落时调用 `applyPassageEntryEffects` 执行 `(set:)` 等副作用，修改 `variables`。
3. 渲染器调用 `renderStoryText`：
   - 提取并注册 `(fn:)` 定义（从渲染文本中移除）。
   - 执行并替换 `(call:)` 及 `(print:)` 表达式。
   - 替换条件宏 `(if:)` 为对应分支的渲染结果。
   - 将经过上述替换的文本传入 Markdown 渲染器，生成最终 HTML。
   - 对生成的 HTML 做白名单消毒并将之前提取的 `<style>` 与 HTML 片段回填。
4. 将最终 HTML 注入到播放器 DOM 中，并绑定 `data-story-target` 的事件以驱动导航和动作。

## 导出（`buildStandaloneExport`）
- 将 `story`（结构化的段落）、`variables` 与 `currentPassage` 做 JSON 序列化嵌入导出模板。
- 导出模板包含一个简化版本的引擎实现（scanner、宏解析、渲染与事件绑定），以确保在脱离编辑器环境时行为一致。
- 导出样式与应用内样式保持一致（在 `buildStandaloneExport` 的 `<style>` 中注入了与 `src/styles/main.css` 对齐的 markdown 样式）。

## 编辑器视图与玩家视图（职责）
- `StoryEditorView.vue`：负责文本编辑、片段插入、函数编辑面板、保存/加载故事元数据。应负责将 `(fn:)` 等持久化到故事的 meta（当前仅在会话注册）。
- `StoryPlayView.vue`：负责当前段落的渲染、绑定事件与变量面板。播放视图应调用 `applyPassageEntryEffects` 在进入段落时统一执行副作用。

## 扩展点与改进建议
- 持久化函数：将 `GLOBAL_JS_FUNCTIONS` 序列化到 `story.meta`，在加载故事时恢复注册，使 `(fn:)` 在不同会话和导出中可移植。
- 更严格的表达式语法：替换 `eval` 为一个小型表达式解析器/AST（或使用 sandboxed JS interpreter）以提升安全性。
- 可选的 Markdown 渲染替换：如果需要更完整的 Markdown 功能，替换内部 renderer 为 `marked`、`markdown-it` 等，并把 HTML 消毒步骤保留。
- 国际化与可访问性：为渲染输出增加 ARIA 属性，确保键盘导航能够操作链接与按钮。

## 参考实现要点
- 关键函数：`readBalancedBlock`, `consumeFnDefinition`, `extractAndRegisterFunctions`, `applySetMacros`, `replaceIfMacros`, `evaluateExpression`, `renderMarkdownBlocks`, `replaceTextWithHtml`, `buildStandaloneExport`。
