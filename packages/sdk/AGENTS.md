# Tellory SDK

This document summarizes the design goals, high-level architecture, execution model, and the key implementation details of the `tellory` SDK located in `packages/sdk/`.

## Goals and constraints

- Provide a small, dependency-free parser/renderer for the Tellory DSL (Harlowe-like macros).
- Work safely in both browser and Node.js environments.
- Separate concerns: parsing -> scanning -> rendering -> evaluation -> host integration.
- Make runtime evaluation pluggable so hosts can control side effects and sandbox JS execution.

## High-level architecture

- `parser.ts` — Converts raw story source text into structured story data (passages, metadata). Responsible for extracting passage headers and raw body text.
- `scanner.ts` — Utilities for token-level tasks such as balanced-block reading (brackets/parentheses), and small lexical helpers used by both parser and renderer.
- `sanitizer.ts` — Post-render sanitization of HTML output to remove unsafe attributes (event handlers), and to ensure outputs are safe for embedding in web pages.
- `renderer.ts` — Core engine that expands macros, evaluates conditions, applies `(set:)` semantics, attaches link-time actions, and renders final HTML for a passage. This file contains the bulk of correctness logic (macro ordering, protected-range exclusion, action extraction, and HTML assembly).
- `standalone.ts` — Helpers to produce a standalone export (a self-contained HTML+JS bundle) for offline consumption.
- `types.ts` — Type definitions for the public API: `StoryData`, `StoryPassage`, `VariableMap`, and the `StoryEngineContext` interface.
- `index.ts` — Public API surface exporting parsing, rendering, utilities and types.

## Execution model and host integration

The SDK does not assume global `eval` for host-provided logic. Instead it defines a `StoryEngineContext` interface that a host provides when calling render functions. At a minimum the context provides:

- `functions`: a map of callable functions that `(call:)` may dispatch to.
- `evaluate` or `createDefaultEvaluator(functions)`: how to evaluate small JS snippets and `(fn:)` bodies; the SDK ships a `createDefaultEvaluator` that uses `new Function` in trusted environments.
- `routeTo` (optional): a host callback to trigger navigation when the runtime wants to `goto` another passage.

This separation keeps the SDK small and lets embedders implement sandboxing, logging, persistence, or alternate runtimes.

## Key implementation details

- Protected ranges for link-attached actions: link-attached macros (for example `[[label|Target]](set: $x to true)` or `[[...]](call:"f")`) must not be interpreted as entry-time `(set:)` macros. The renderer computes "protected ranges" by scanning link constructs and `[[...]]` blocks (using `scanner.readBalancedBlock`) and excludes matches inside those ranges from global macro passes. This prevents premature execution of click-time actions.

- Macro pass ordering: rendering is performed in multiple, carefully ordered passes — strip/collect click-attached actions, evaluate entry-time `(set:)`, expand `(if:)`/conditions, resolve `(display:)` and `(print:)`, then sanitize HTML. This ordering ensures predictable semantics and avoids nested-replacement pitfalls.

- `(fn:)` and `(call:)`: the SDK stores function bodies and invokes them through the provided evaluator. Because functions run arbitrary JS, the SDK documents clearly that hosts must only enable this feature in trusted contexts or provide a sandboxed evaluator.

- Sanitization: after text is transformed into HTML, `sanitizer.ts` removes event attributes and any dangerous constructs, while allowing safe attributes like `id`, `class`, `style`, and `title`.

- Error handling and fallbacks: render-time exceptions are caught and surfaced to the caller; the smoke tests in the skill demonstrate per-passage rendering across multiple variable configurations to catch empty outputs, leftover macro tokens, or thrown errors.

## Public API (examples)

```ts
import * as tellory from 'tellory'

const story = tellory.parseStorySource(sourceText)
const vars = tellory.buildInitialVariables(story)
const ctx = tellory.createDefaultEvaluator({ /* host-provided functions */ })
const html = tellory.renderStoryText(passage.content, vars, story, ctx)
```

Key exported functions and types live in `src/index.ts` (see generated docs in `docs/functions/`).

## Packaging & build

- Library is authored in TypeScript. Build emits both ESM and CJS artifacts (configured in `tsdown.config.ts`) so the package can be consumed by bundlers and Node runtimes.

## Security considerations

- `(fn:)`/`(call:)` executes host-provided JS code; only enable this in trusted contexts or with a sandboxed evaluator.
- Sanitizer is conservative about event attributes, but hosts embedding user-provided HTML should apply additional site-level CSP and sandboxing as appropriate.

## Testing and verification

- The skill's `scripts/smoke.cjs` demonstrates how to run the SDK across multiple variable configurations and passages to detect rendering-time issues.
- Structural checks (dead links, unreachable passages, unused vars) are done by `scripts/audit.py` in the skill folder; these are useful pre-deploy checks for authored stories.

## Extending the SDK

- To add new macros, extend `renderer.ts` by adding a new pass that recognizes and safely expands the macro, taking care to honor protected ranges.
- To change evaluation semantics (e.g., sandboxed JS), provide a custom evaluator through the `StoryEngineContext` rather than modifying core renderer logic.

---

For implementation details see source files in `packages/sdk/src/` and the generated function docs in `packages/sdk/docs/functions/`.
