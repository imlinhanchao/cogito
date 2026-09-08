# Tellory

[English](./README.md) | 简体中文

> 一个用纯文本 DSL 描述互动故事的解析与渲染引擎：解析故事源码、渲染为安全的 HTML，并支持导出为单文件、免构建即可运行的 HTML 页面。

## 特性

- **纯文本故事 DSL**：用 `段落 "name":` / `:: name` 声明段落，支持 `(set:)`、`(if:)/(else-if:)/(else:)`、`(display:)`、`(print:)`、`(call:)`、`[[链接|目标]]` 等宏语法，以及轻量 Markdown（标题/列表/引用/代码块/加粗斜体等）。
- **安全渲染**：内置基于白名单的 HTML 净化器，自动剔除 `on*` 事件属性与 `javascript:`/`data:` URI，避免故事作者注入恶意 HTML。
- **可插拔求值**：库本身不直接 `eval` 表达式，而是通过调用方传入的求值/函数调用回调（宿主上下文）执行宏表达式，因此可以在浏览器用 `Function`/`eval`，在服务端换成沙箱（如 `isolated-vm`）执行同一份故事，无需改动渲染逻辑。
- **零依赖**：不依赖 DOM 或 Node 内置模块，同一份代码可在浏览器与 Node.js 中运行。
- **单文件导出**：一行调用即可把故事、当前存档变量与渲染引擎打包进一个独立 HTML 文件，双击即可离线游玩，无需任何构建工具或服务器。

## 安装

```sh
npm install tellory
```

在 monorepo 内也可以以 workspace 依赖方式引用：

```json
{
  "dependencies": {
    "tellory": "workspace:*"
  }
}
```

## 快速开始

```ts
import {
  parseStorySource,
  buildInitialVariables,
  createDefaultEvaluator,
  applyPassageEntryEffects,
  applyStoryAction,
  renderStoryText,
  buildStandaloneExport,
} from 'tellory';

const source = `标题：示例故事

:: Start
你面前有两条路。

[[走左边的路|Left]]
[[走右边的路|Right]]

:: Left
你选择了左边。

:: Right
你选择了右边。
`;

// 1. 解析故事源码
const story = parseStorySource(source);

// 2. 解析变量表
const variables = buildInitialVariables(story);

// 3. 浏览器等信任环境下，可直接用内置的 eval/Function 求值器
const ctx = createDefaultEvaluator(/* (fn:) 函数体注册表 */ {});

// 4. 进入起始段落时先执行其 (set:) 副作用，再渲染为 HTML
const passage = story.passages.find((p) => p.name === story.startPassage)!;
applyPassageEntryEffects(passage.content, variables, ctx);
const html = renderStoryText(passage.content, variables, story, ctx);

// 5. 玩家点击链接后，用同一个 ctx 执行链接携带的动作（如 goto/set/call）
applyStoryAction('goto:"Left"', variables, ctx);

// 6. 随时可以导出为可独立打开、无需服务器的 HTML 文件
const standaloneHtml = buildStandaloneExport(story, variables, story.startPassage);
```

## 宿主上下文（Context）

`applyStoryAction`、`applyPassageEntryEffects`、`renderStoryText` 都不会自行 `eval` 表达式，而是通过第三个/最后一个参数接收一个宿主上下文对象来完成表达式求值与函数调用，形状如下：

```ts
interface StoryEngineContext {
  /** 通过 (fn:"name")[code] 声明的函数体注册表。 */
  functions: Record<string, string>;
  /** 求值一段宏表达式（内嵌的 call: 已被替换）。 */
  evaluate: (expression: string, variables: Record<string, unknown>) => unknown;
  /** 调用一个已注册的 (fn:) 函数。 */
  callFunction: (name: string, args: unknown[], variables: Record<string, unknown>) => unknown;
  /** 可选：渲染前对链接的 target/action 值做编码（如加密）。 */
  encodeAttribute?: (value: string) => string;
  /** 可选：解码由 encodeAttribute 生成的值。 */
  decodeAttribute?: (value: string) => string;
  /** 可选：段落跳转钩子，供递归渲染场景使用。 */
  routeTo?: (target: string) => void;
}
```

这让同一份渲染逻辑可以在不同宿主中安全复用，例如：

- **浏览器端**：用 `createDefaultEvaluator` 提供的默认求值器即可，故事作者与玩家互相信任。
- **服务端**：`evaluate`/`callFunction` 换成 `isolated-vm` 等沙箱执行，避免不可信的存档/表达式影响主进程；同时用 `encodeAttribute`/`decodeAttribute` 对链接携带的动作做加解密，防止玩家在客户端篡改跳转目标或变量赋值。

## API

| 函数 | 说明 |
| --- | --- |
| `parseStorySource(source: string): StoryData` | 将纯文本故事源码解析为结构化的 `StoryData`（标题 + 段落列表）。 |
| `serializeStory(story: StoryData): string` | 将 `StoryData` 序列化回 `parseStorySource` 可识别的源码格式。 |
| `buildInitialVariables(story: StoryData): Record<string, unknown>` | 构建初始变量表。 |
| `createDefaultEvaluator(functions)` | 基于 `eval`/`Function` 的默认求值器，仅供浏览器等信任环境使用。 |
| `applyPassageEntryEffects(content, variables, ctx): void` | 段落进入时执行其中的 `(set:)` 副作用（不返回渲染结果）。 |
| `applyStoryAction(action, variables, ctx): void` | 执行一次 `goto:`/`set:`/`call:` 动作（通常来自链接点击）。 |
| `renderStoryText(input, variables, story, ctx): string` | 将段落原始内容渲染为经过净化的 HTML，展开全部宏语法。 |
| `buildStandaloneExport(story, variables, currentPassage): string` | 生成可离线双击打开的自包含 HTML 文档（内嵌故事数据与渲染引擎）。 |

### 类型

- `StoryData` — 完整故事：`title`、可选 `description`/`tags`、`startPassage`、`passages`。
- `StoryPassage` — 单个段落：`name`、可选 `tags`、`content`（未渲染的原始源码）。
- `VariableMap` — 故事运行时变量表，`Record<string, unknown>`。
- `StoryEngineContext` — 宿主注入的求值/函数调用/属性编解码/路由钩子接口（见上文）。

## License

MIT © [Hancel.Lin](https://github.com/imlinhanchao)