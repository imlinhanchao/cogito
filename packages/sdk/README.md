# Tellory

English | [简体中文](./README_zh.md)

> A parser/renderer engine for describing Interactive Fiction with a plain-text DSL: parse story source, render it into safe HTML, and export it as a single, build-free HTML page.

## Features

- **Plain-text story DSL**: declare passages with `段落 "name":` / `:: name`, with support for `(set:)`, `(if:)/(else-if:)/(else:)`, `(display:)`, `(print:)`, `(call:)`, `[[Link|Target]]` and a lightweight Markdown subset (headings, lists, blockquotes, code blocks, bold/italic, etc.).
- **Safe rendering**: a built-in whitelist-based HTML sanitizer strips `on*` event attributes and `javascript:`/`data:` URIs, protecting against malicious HTML injected by story authors.
- **Pluggable evaluation**: the library never calls `eval` itself. Expression evaluation and function calls are delegated to a host context supplied by the caller, so the browser can use `Function`/`eval` while a server can run the exact same story inside a sandbox (e.g. `isolated-vm`) without changing any rendering logic.
- **Zero dependencies**: no DOM or Node built-in module dependencies — the same code runs in both the browser and Node.js.
- **Standalone export**: a single call packages the story, current save variables, and the rendering engine into one self-contained HTML file that can be played offline by double-clicking it, with no build tools or server required.

## Install

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

## Quick Start

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
const standaloneHtml = buildStandaloneExport(story, variables, story.startPassage);
```

## Host Context

`applyStoryAction`, `applyPassageEntryEffects`, and `renderStoryText` never call `eval` themselves. Instead, they take a host context object (as their third/last parameter) that performs expression evaluation and function calls. Its shape is:

```ts
interface StoryEngineContext {
  /** Registry of raw JS function bodies declared via (fn:"name")[code]. */
  functions: Record<string, string>;
  /** Evaluates a macro expression (with embedded call: substitutions already applied). */
  evaluate: (expression: string, variables: Record<string, unknown>) => unknown;
  /** Invokes a previously-registered (fn:) function. */
  callFunction: (name: string, args: unknown[], variables: Record<string, unknown>) => unknown;
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

## API

| Function | Description |
| --- | --- |
| `parseStorySource(source: string): StoryData` | Parses plain-text story source into a structured `StoryData` (title + passage list). |
| `serializeStory(story: StoryData): string` | Serializes `StoryData` back into the source format understood by `parseStorySource`. |
| `buildInitialVariables(story: StoryData): Record<string, unknown>` | Builds the initial variable map. |
| `createDefaultEvaluator(functions)` | The default `eval`/`Function`-based evaluator, intended for trusted environments like the browser only. |
| `applyPassageEntryEffects(content, variables, ctx): void` | Runs a passage's `(set:)` side effects when it is entered (does not return rendered output). |
| `applyStoryAction(action, variables, ctx): void` | Runs a single `goto:`/`set:`/`call:` action (typically from a link click). |
| `renderStoryText(input, variables, story, ctx): string` | Renders a passage's raw content into sanitized HTML, expanding all supported macros. |
| `buildStandaloneExport(story, variables, currentPassage): string` | Generates a self-contained HTML document (embedding the story data and rendering engine) that can be opened offline. |

### Types

- `StoryData` — A full story: `title`, optional `description`/`tags`, `startPassage`, `passages`.
- `StoryPassage` — A single passage: `name`, optional `tags`, `content` (raw, unrendered source).
- `VariableMap` — The story's runtime variable table, `Record<string, unknown>`.
- `StoryEngineContext` — The host-supplied evaluation/function-call/attribute-codec/routing hook interface (see above).

## License

MIT © [Hancel.Lin](https://github.com/imlinhanchao)