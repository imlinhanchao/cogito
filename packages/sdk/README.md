English | [简体中文](./README_zh.md)

<h1>
<img align="center" width="32" src="https://github.com/imlinhanchao/tellory/blob/master/apps/web/public/logo.svg?raw=true">
<span>Tellory</span>
</h1>

[![Documentation](https://img.shields.io/badge/documentation-online-blue
)](https://tellory.adventext.fun/)

A parser/renderer engine for describing Interactive Fiction with a plain-text DSL: parse story source, render it into safe HTML, and export it as a single, build-free HTML page.

## ✨ Features

- **Plain-text story DSL**: declare passages with `段落 "name":` / `:: name`, with support for `(set:)`, `(if:)/(else-if:)/(else:)`, `(display:)`, `(print:)`, `(call:)`, `[[Link|Target]]` and a lightweight Markdown subset (headings, lists, blockquotes, code blocks, bold/italic, etc.).
- **Safe rendering**: a built-in whitelist-based HTML sanitizer strips `on*` event attributes and `javascript:`/`data:` URIs, protecting against malicious HTML injected by story authors.
- **Pluggable evaluation**: the library never calls `eval` itself. Expression evaluation and function calls are delegated to a host context supplied by the caller, so the browser can use `Function`/`eval` while a server can run the exact same story inside a sandbox (e.g. `isolated-vm`) without changing any rendering logic.
- **Zero dependencies**: no DOM or Node built-in module dependencies — the same code runs in both the browser and Node.js.
- **Standalone export**: a single call packages the story, current save variables, and the rendering engine into one self-contained HTML file that can be played offline by double-clicking it, with no build tools or server required.

Embed a passage at the link position after a click:

```text
(link:"查看钥匙")[(display: "Key")]
```

The syntax renders as a link initially. After the click, the `Key` passage is rendered and replaces the link. The host should add the passage name to `displayPassages` in the rendering context after handling the display interaction.

## 📦 Install

```sh
npm install tellory
```

Inside a monorepo, it can also be referenced as a workspace dependency:

```json
{
  "dependencies": {
    "tellory": "workspace:*"
  }
}
```

## 🚀 Quick Start

```ts
import {
  parseStorySource,
  buildInitialVariables,
  createDefaultEvaluator,
  applyPassageEntryEffects,
  applyStoryAction,
  renderStoryText,
  buildStandaloneExport,
} from "tellory";

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

// 1. Parse the story source
const story = parseStorySource(source);

// 2. Build the initial variable map
const variables = buildInitialVariables(story);

// 3. In trusted environments like the browser, use the built-in eval/Function evaluator
const ctx = createDefaultEvaluator(/* registry of (fn:) function bodies */ {});

// 4. Run the entered passage's (set:) side effects, then render it to HTML
const passage = story.passages.find((p) => p.name === story.startPassage)!;
applyPassageEntryEffects(passage.content, variables, ctx);
const html = renderStoryText(passage.content, variables, story, ctx);

// 5. When the player clicks a link, run its action with the same ctx (e.g. goto/set/call)
applyStoryAction('goto:"Left"', variables, ctx);

// 6. Export it at any time as a standalone HTML file that needs no server
const standaloneHtml = buildStandaloneExport(
  story,
  variables,
  story.startPassage,
);
```

## 🧩 Host Context

`applyStoryAction`, `applyPassageEntryEffects`, and `renderStoryText` never call `eval` themselves. Instead, they take a host context object (as their third/last parameter) that performs expression evaluation and function calls. Its shape is:

```ts
interface StoryEngineContext {
  /** Registry of raw JS function bodies declared via (fn:"name")[code]. */
  functions: Record<string, string>;
  /** Evaluates a macro expression (with embedded call: substitutions already applied). */
  evaluate: (expression: string, variables: Record<string, unknown>) => unknown;
  /** Invokes a previously-registered (fn:) function. */
  callFunction: (
    name: string,
    args: unknown[],
    variables: Record<string, unknown>,
  ) => unknown;
  /** Optional: encode a link's target/action value before rendering (e.g. encryption). */
  encodeAttribute?: (value: string) => string;
  /** Optional: decode a value previously produced by encodeAttribute. */
  decodeAttribute?: (value: string) => string;
  /** Optional: passage-navigation hook used in recursive rendering scenarios. */
  routeTo?: (target: string) => void;
}
```

This lets the same rendering logic be safely reused across hosts, for example:

- **Browser**: use the default evaluator provided by `createDefaultEvaluator`, since the story author and player trust each other.
- **Server**: swap `evaluate`/`callFunction` for a sandbox (e.g. `isolated-vm`) to keep untrusted save data/expressions out of the main process, and use `encodeAttribute`/`decodeAttribute` to encrypt/decrypt the actions carried by links, preventing players from tampering with navigation targets or variable assignments on the client.

## 🔨 API

| Function | Description |
| --- | --- |
| `parseStorySource(source: string): StoryData` | Parses plain-text story source into a structured `StoryData` (title + passage list). |
| `serializeStory(story: StoryData): string` | Serializes `StoryData` back into the source format understood by `parseStorySource`. |
| `buildInitialVariables(story: StoryData): Record<string, unknown>` | Builds the initial variable map. |
| `extractStorySpecials(story: StoryData)` | Scans a parsed story and returns deduplicated lists of defined `point` (achievements) and `end` (endings) macros as `{ points: [{name,description}], endings: [{name,description}] }`. |
| `detectRenderSpecials(input, variables, story, ctx, options?)` | Detects render-time specials (queued `point` markers or `end` markers) from a passage's raw content. Accepts optional `options` (eg. `{ action?: string, includeLinkActions?: boolean }`) to simulate link actions. |
| `createDefaultEvaluator(functions)` | The default `eval`/`Function`-based evaluator, intended for trusted environments like the browser only. |
| `applyPassageEntryEffects(content, variables, ctx): void` | Runs a passage's `(set:)` side effects when it is entered (does not return rendered output). |
| `applyStoryAction(action, variables, ctx): void` | Runs a single `goto:`/`set:`/`call:` action (typically from a link click). |
| `renderStoryText(input, variables, story, ctx): string` | Renders a passage's raw content into sanitized HTML, expanding all supported macros. |
| `buildStandaloneExport(story, variables, currentPassage): string` | Generates a self-contained HTML document (embedding the story data and rendering engine) that can be opened offline. |
| `checkStorySyntax(story: StoryData): StorySyntaxIssue[]` | Staticaly checks a parsed `StoryData` for common syntax/structure problems and returns an array of issues (`StorySyntaxIssue`). |

### 🧾 Types

- `StoryData` — A full story: `title`, optional `description`/`tags`, `startPassage`, `passages`.
- `StoryPassage` — A single passage: `name`, optional `tags`, `content` (raw, unrendered source).
- `VariableMap` — The story's runtime variable table, `Record<string, unknown>`.
- `StoryEngineContext` — The host-supplied evaluation/function-call/attribute-codec/routing hook interface (see above).
 - `extractStorySpecials(story: StoryData)` — Helper to extract all `(point:)` and `(end:)` macros from a parsed story (deduplicated by name).
 - `detectRenderSpecials(...)` — Runtime helper that inspects a passage's raw content (and optional simulated action) to report any `point` or `ending` markers that would be produced by rendering.
 - `StoryRenderSpecials` / `StorySpecialMarker` — Types describing the shape of detected render specials returned by `detectRenderSpecials`.

## New Runtime APIs & Examples

These helpers were added to make host integrations (editor, server, or standalone exports) easier to implement.

- `renderStoryText(input, variables, story, ctx, options?)` — accepts an optional `options` object. Useful options include:
  - `applyEntryEffects?: boolean` (default: true) — whether to run `(set:)` entry effects before rendering. Hosts that manage entry effects themselves can disable this and pass a `renderVariables` snapshot instead.
  - `renderVariables?: Record<string, unknown>` — a variables snapshot to use for rendering (renderer will not mutate this object). Use this to render a preview without applying entry effects to the live variable table.

Example: render a passage using a snapshot so `(if:)` is evaluated against pre-entry state while entry `(set:)` effects are not applied to the live variables.

```ts
const renderVars = { ...variables }; // shallow snapshot containing queued point/end arrays
const html = renderStoryText(passage.content, variables, story, ctx, {
  applyEntryEffects: false,
  renderVariables: renderVars,
});
```

- `detectRenderSpecials(input, variables, story, ctx, options?)` — inspects content (and optional simulated `action`) and returns `StoryRenderSpecials` describing any `point` or `end` markers that would be produced by the render. Call this before rendering when you need to show point/end notifications without consuming the queued markers.

Example: detect special markers produced by clicking a link that carries an action string.

```ts
const specials = detectRenderSpecials(passage.content, variables, story, ctx, {
  action: 'goto:"Left"',
  includeLinkActions: true,
});
// specials.points / specials.endings
```

- `checkStorySyntax(story: StoryData): StorySyntaxIssue[]` — parser-level syntax checker. Returns an array of issues describing possible problems (dead links, orphan passages, duplicate passages, invalid endings, leftover macros, etc.). Use this in editors or pre-save flows to warn authors.

Example: run on save and show results in an editor modal.

```ts
const issues = checkStorySyntax(story);
if (issues.length) showIssuesModal(issues);
```

Macro note: canonical `point`/`end` macros follow the syntax:

```text
(point: name|description)
(end: name|description)
```

They queue named points/endings during entry effects; use `detectRenderSpecials` with a render snapshot to discover which will be produced by a given render action.

## 📝 License

MIT © [Hancel.Lin](https://github.com/imlinhanchao)
