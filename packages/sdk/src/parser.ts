import type { StoryData, StoryPassage, VariableMap } from "./types";
import { readBalancedBlock, consumeFnDefinition } from "./scanner";

/** Minimal story source used to seed a brand-new, empty story. */
export const EMPTY_STORY_SOURCE = `title：未命名故事

:: Start
新故事开始了。
`;

/**
 * Parses plain-text story source (passages delimited by `段落 "name":`
 * or `:: name` headers) into structured `StoryData`.
 *
 * @param source - Raw story source text.
 * @returns The parsed story, falling back to a single empty `Start` passage when `source` has no recognizable passages.
 */
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
    .split(/\n\s*(?=段落\s+"[^"]+"\s*[:：]|::\s*\S)/)
    .map((block) => block.trim())
    .filter(Boolean);

  const passages: StoryPassage[] = [];

  for (const block of passageBlocks) {
    const match = block.match(
      /^(?:段落\s+"([^"]+)"\s*[:：]|::\s*([^\n]+))\s*\n?(.*)$/s,
    );
    if (!match) {
      continue;
    }

    const rawHeader = (match[1] ?? match[2] ?? "Untitled").trim();
    const content = (match[3] ?? "").trim();
    // support optional tags in header like: :: Name [tag1,tag2]
    let name = rawHeader;
    let tags: string[] = [];
    const tagMatch = rawHeader.match(/^(.*?)\s*\[(.*)\]\s*$/);
    if (tagMatch) {
      name = tagMatch[1].trim() || "Untitled";
      tags = tagMatch[2]
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
    passages.push({
      name,
      tags,
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
      normalized.match(/^\s*title\s*[:：]\s*(.+)$/m)?.[1] ?? "Interactive Story"
    ).trim() || "Interactive Story";

  const description =
    (normalized.match(/^\s*description\s*[:：]\s*(.+)$/m)?.[1] ?? "").trim() ||
    "";
  const tagsLine =
    (normalized.match(/^\s*tags\s*[:：]\s*(.+)$/m)?.[1] ?? "").trim() || "";
  const tags = tagsLine
    ? tagsLine
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : [];
  const explicitStart = (
    normalized.match(/^\s*(?:start|start passage)\s*[:：]\s*(.+)$/m)?.[1] ?? ""
  ).trim();

  return {
    title,
    description: description || undefined,
    tags: tags.length ? tags : undefined,
    startPassage: explicitStart || (passages[0]?.name ?? "Start"),
    passages,
  };
}

/**
 * Serializes `StoryData` back into the plain-text story source format
 * understood by `parseStorySource`.
 *
 * @param story - The story to serialize.
 * @returns Plain-text story source.
 */
export function serializeStory(story: StoryData): string {
  const headerLines: string[] = [];
  headerLines.push(`title：${story.title || "Untitled"}`);
  if (story.description) headerLines.push(`description：${story.description}`);
  if (story.tags && story.tags.length)
    headerLines.push(`tags：${story.tags.join(",")}`);
  if (story.startPassage)
    headerLines.push(`start passage：${story.startPassage}`);

  const passagesText = story.passages
    .map((passage) => {
      const tagSuffix =
        passage.tags && passage.tags.length
          ? ` [${passage.tags.join(",")}]`
          : "";
      return `:: ${passage.name}${tagSuffix}\n${passage.content.trim()}`;
    })
    .join("\n\n");

  return headerLines.join("\n") + "\n\n" + passagesText;
}

/**
 * Collects all `$variable` names referenced anywhere in the story's
 * passage contents.
 *
 * @param story - The story to scan.
 * @returns Unique variable names, without the leading `$`.
 */
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

/**
 * Builds an initial variable map for a story: every referenced
 * `$variable` defaults to `0`, plus reserved `passage`/`storyTitle`/
 * `prevPassage` entries.
 *
 * @param story - The story to build variables for.
 * @returns The initial variable map.
 */
export function buildInitialVariables(story: StoryData): VariableMap {
  const variables: VariableMap = {};
  for (const name of collectVariableNamesFromStory(story)) {
    variables[name] = 0;
  }
  variables.passage = story.startPassage;
  variables.storyTitle = story.title;
  variables.prevPassage = "";
  return variables;
}

/**
 * Scan a StoryData and extract all defined `point` (achievement) and `end`
 * (ending) macros. Names are deduplicated by exact trimmed string match.
 *
 * Returns an object with `points` and `endings` arrays containing
 * { name, description } entries.
 * @param story - The story to scan for special macros.
 * @returns An object containing `points` and `endings` arrays with deduplicated entries.
 */
export function extractStorySpecials(story: StoryData): {
  points: { name: string; description: string }[];
  endings: { name: string; description: string }[];
} {
  const pointsMap = new Map<string, { name: string; description: string }>();
  const endingsMap = new Map<string, { name: string; description: string }>();

  if (!story || !Array.isArray(story.passages)) {
    return { points: [], endings: [] };
  }

  const pointRe = /\(point:\s*([^|\)\]]+?)(?:\|\s*([^)]+?))?\)/gi;
  const endRe = /\(end:\s*([^|\)\]]+?)(?:\|\s*([^)]+?))?\)/gi;

  for (const passage of story.passages) {
    const text = passage.content || "";

    let m: RegExpExecArray | null;
    pointRe.lastIndex = 0;
    while ((m = pointRe.exec(text))) {
      const rawName = (m[1] || "").trim();
      const desc = (m[2] || "").trim();
      if (!rawName) continue;
      if (!pointsMap.has(rawName)) {
        pointsMap.set(rawName, { name: rawName, description: desc });
      }
    }

    endRe.lastIndex = 0;
    while ((m = endRe.exec(text))) {
      const rawName = (m[1] || "").trim();
      const desc = (m[2] || "").trim();
      if (!rawName) continue;
      if (!endingsMap.has(rawName)) {
        endingsMap.set(rawName, { name: rawName, description: desc });
      }
    }
  }

  return {
    points: Array.from(pointsMap.values()),
    endings: Array.from(endingsMap.values()),
  };
}

/** Category of a syntax problem reported by {@link checkStorySyntax}. */
export type StorySyntaxIssueType =
  | "dead-link"
  | "orphan-passage"
  | "invalid-ending"
  | "leftover-macro"
  | "duplicate-passage"
  | "inconsistent-point-description"
  | "inconsistent-ending-description";

/** A single syntax problem found in a story by {@link checkStorySyntax}. */
export interface StorySyntaxIssue {
  /** Machine-readable category of the problem. */
  type: StorySyntaxIssueType;
  /** Name of the passage the problem belongs to. */
  passage: string;
  /**
   * 1-based line number inside the passage content. Omitted for problems that
   * concern a whole passage and have no specific location (e.g. duplicate
   * passage names).
   */
  line?: number;
  /** Human-readable, localized description of the problem. */
  message: string;
}

/** Macro names the renderer understands and consumes. */
const KNOWN_MACROS = new Set([
  "set",
  "if",
  "elseif",
  "else-if",
  "else",
  "call",
  "fn",
  "print",
  "display",
  "goto",
  "link",
  "point",
  "end",
]);

/** Macros that must be followed by a `[...]` block to be valid. */
const MACROS_WITH_BLOCK = new Set([
  "if",
  "elseif",
  "else-if",
  "else",
  "fn",
  "link",
]);

/**
 * Escapes a string so it can be embedded literally inside a regular expression.
 *
 * @param value - The raw string to escape.
 * @returns A regex-safe version of `value`.
 */
function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Computes the 1-based line number of a character index inside a passage body.
 *
 * @param content - The passage content being scanned.
 * @param index - Character index inside `content`.
 * @returns The 1-based line number containing `index`.
 */
function lineNumberOf(content: string, index: number): number {
  const limit = Math.max(0, Math.min(index, content.length));
  let line = 1;
  for (let i = 0; i < limit; i += 1) {
    if (content[i] === "\n") {
      line += 1;
    }
  }
  return line;
}

/**
 * Collects regions that must not be treated as story markup: `<style>`
 * blocks, fenced code blocks, and `(fn:"name")[code]` definitions.
 *
 * @param content - The passage content to scan.
 * @returns `[start, end)` index pairs to ignore while scanning for macros.
 */
function collectIgnoredRanges(content: string): Array<[number, number]> {
  const ranges: Array<[number, number]> = [];

  for (const match of content.matchAll(/<style\b[^>]*>[\s\S]*?<\/style>/gi)) {
    const start = match.index ?? 0;
    ranges.push([start, start + match[0].length]);
  }

  for (const match of content.matchAll(/```[\s\S]*?```/g)) {
    const start = match.index ?? 0;
    ranges.push([start, start + match[0].length]);
  }

  const fnPattern = /\(fn:/gi;
  let fnMatch: RegExpExecArray | null;
  while ((fnMatch = fnPattern.exec(content))) {
    const definition = consumeFnDefinition(content, fnMatch.index);
    if (!definition) {
      fnPattern.lastIndex = fnMatch.index + 4;
      continue;
    }
    ranges.push([fnMatch.index, definition.endIndex]);
    fnPattern.lastIndex = definition.endIndex;
  }

  return ranges;
}

/**
 * @param index - Character index to test.
 * @param ranges - `[start, end)` ranges to test against.
 * @returns Whether `index` falls inside any of `ranges`.
 */
function isIndexInRanges(
  index: number,
  ranges: Array<[number, number]>,
): boolean {
  return ranges.some(([start, end]) => index >= start && index < end);
}

/** A passage reference discovered inside a passage body. */
interface StoryLinkReference {
  /** Referenced passage name. */
  target: string;
  /** Character index of the reference inside the passage content. */
  index: number;
}

/**
 * Extracts the target passage name from a `goto:` macro body.
 *
 * @param body - The `(...)` body of a `goto:` macro.
 * @returns The referenced passage name, or `undefined` when absent.
 */
function parseGotoTarget(body: string): string | undefined {
  const match = body.match(/goto:\s*(?:["']([^"']+)["']|([^\]\)]+))/i);
  const target = (match?.[1] ?? match?.[2] ?? "").trim();
  return target || undefined;
}

/**
 * Collects every passage reference found in a passage body: wiki links
 * (`[[label|target]]` / `[[target]]`), `(goto:"Target")`, and
 * `(display:"Target")`.
 *
 * @param content - The passage content to scan.
 * @returns All discovered references with their character index.
 */
function collectLinkReferences(content: string): StoryLinkReference[] {
  const references: StoryLinkReference[] = [];

  for (const match of content.matchAll(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g)) {
    const target = (match[2] ?? match[1] ?? "").trim();
    if (target) {
      references.push({ target, index: match.index ?? 0 });
    }
  }

  const gotoPattern = /\(goto:/gi;
  let gotoMatch: RegExpExecArray | null;
  while ((gotoMatch = gotoPattern.exec(content))) {
    const block = readBalancedBlock(content, gotoMatch.index, "(", ")");
    if (!block) {
      gotoPattern.lastIndex = gotoMatch.index + 6;
      continue;
    }
    const target = parseGotoTarget(block.content);
    if (target) {
      references.push({ target, index: gotoMatch.index });
    }
    gotoPattern.lastIndex = block.endIndex;
  }

  for (const match of content.matchAll(
    /\(display:\s*["']([^"']+)["']\s*\)/gi,
  )) {
    const target = match[1].trim();
    if (target) {
      references.push({ target, index: match.index ?? 0 });
    }
  }

  return references;
}

/**
 * @param content - The passage content to inspect.
 * @returns Whether the passage contains any link/goto macro.
 */
function hasLinkSyntax(content: string): boolean {
  return /\[\[[^\]]+\]\]|\(link:\s*(?:["'][^"']*["']|[^)]*?)\)\s*\[(?:.|\n)*?\]|\(goto:\s*["'][^"']+["']\s*\)/i.test(
    content,
  );
}

/** A raw `(name: body)` macro occurrence. */
interface RawMacroBlock {
  /** Character index of the opening `(`. */
  index: number;
  /** Trimmed body between the parentheses, including the `name:` prefix. */
  body: string;
}

/**
 * Finds every balanced `(macroName: body)` occurrence in a passage, skipping
 * ignored regions such as code blocks and function definitions.
 *
 * @param content - The passage content to scan.
 * @param macroName - The macro name to look for (e.g. `point` / `end`).
 * @param ignoredRanges - Ranges produced by `collectIgnoredRanges`.
 * @returns All matching macro blocks in source order.
 */
function collectRawMacroBlocks(
  content: string,
  macroName: string,
  ignoredRanges: Array<[number, number]>,
): RawMacroBlock[] {
  const blocks: RawMacroBlock[] = [];
  const pattern = new RegExp(`\\(\\s*${escapeForRegExp(macroName)}\\s*:`, "gi");
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(content))) {
    if (isIndexInRanges(match.index, ignoredRanges)) {
      pattern.lastIndex = match.index + 1;
      continue;
    }
    const block = readBalancedBlock(content, match.index, "(", ")");
    if (!block) {
      pattern.lastIndex = match.index + 1;
      continue;
    }
    blocks.push({ index: match.index, body: block.content.trim() });
    pattern.lastIndex = block.endIndex;
  }
  return blocks;
}

/**
 * Parses a `name` or `name|description` marker body.
 *
 * @param raw - The marker body without the macro name prefix.
 * @returns The parsed marker, or `null` when the body is empty/invalid.
 */
function parseMarkerBody(
  raw: string,
): { name: string; description?: string } | null {
  const normalized = raw.trim();
  if (!normalized) {
    return null;
  }
  const divider = normalized.indexOf("|");
  if (divider < 0) {
    return { name: normalized };
  }
  const name = normalized.slice(0, divider).trim();
  const description = normalized.slice(divider + 1).trim();
  if (!name) {
    return null;
  }
  return { name, description: description || undefined };
}

/**
 * Strips the `name:` prefix from a macro body and parses the marker payload.
 *
 * @param body - The full `(...)` body, e.g. `end: 归乡|回到地球`.
 * @param macroName - The macro name to strip (e.g. `end`).
 * @returns The parsed marker, or `null` when the body is empty/invalid.
 */
function parseMarkerFromBody(
  body: string,
  macroName: string,
): { name: string; description?: string } | null {
  const stripped = body
    .trim()
    .replace(new RegExp(`^${escapeForRegExp(macroName)}\\s*:\\s*`, "i"), "");
  return parseMarkerBody(stripped);
}

/** A macro that would survive rendering and leak into the visible text. */
interface LeftoverMacro {
  /** Character index of the opening `(`. */
  index: number;
  /** The macro name as written in the source. */
  name: string;
  /** Why the macro would be left behind. */
  reason: "unknown" | "unterminated";
}

/**
 * Finds macros that the renderer would not consume, i.e. unknown macro names
 * or known macros with an unterminated `(...)` / missing `[...]` block.
 *
 * @param content - The passage content to scan.
 * @param ignoredRanges - Ranges produced by `collectIgnoredRanges`.
 * @returns All leftover macro occurrences in source order.
 */
function findLeftoverMacros(
  content: string,
  ignoredRanges: Array<[number, number]>,
): LeftoverMacro[] {
  const leftovers: LeftoverMacro[] = [];
  const pattern = /\(\s*([A-Za-z][A-Za-z0-9_-]*)\s*:/g;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(content))) {
    const startIndex = match.index;
    const rawName = match[1];
    const name = rawName.toLowerCase();

    if (isIndexInRanges(startIndex, ignoredRanges)) {
      const range = ignoredRanges.find(
        ([start, end]) => startIndex >= start && startIndex < end,
      );
      pattern.lastIndex = range ? range[1] : startIndex + 1;
      continue;
    }

    if (!KNOWN_MACROS.has(name)) {
      leftovers.push({ index: startIndex, name: rawName, reason: "unknown" });
      continue;
    }

    const signature = readBalancedBlock(content, startIndex, "(", ")");
    if (!signature) {
      leftovers.push({
        index: startIndex,
        name: rawName,
        reason: "unterminated",
      });
      continue;
    }

    if (MACROS_WITH_BLOCK.has(name)) {
      let cursor = signature.endIndex;
      while (cursor < content.length && /\s/.test(content[cursor])) {
        cursor += 1;
      }
      const block = readBalancedBlock(content, cursor, "[", "]");
      if (!block) {
        leftovers.push({
          index: startIndex,
          name: rawName,
          reason: "unterminated",
        });
        pattern.lastIndex = signature.endIndex;
        continue;
      }
      pattern.lastIndex = block.endIndex;
      continue;
    }

    pattern.lastIndex = signature.endIndex;
  }

  return leftovers;
}

/** A recorded achievement/ending marker occurrence used for consistency checks. */
interface MarkerOccurrence {
  description: string;
  passage: string;
  line: number;
}

/**
 * Records a marker occurrence under its name for later consistency checking.
 *
 * @param map - Accumulator keyed by marker name.
 * @param name - Marker name.
 * @param description - Marker description (`undefined` treated as empty).
 * @param passage - Passage the marker was found in.
 * @param line - Line number of the marker inside the passage.
 */
function recordMarkerDescription(
  map: Map<string, MarkerOccurrence[]>,
  name: string,
  description: string | undefined,
  passage: string,
  line: number,
): void {
  const list = map.get(name) ?? [];
  list.push({ description: (description ?? "").trim(), passage, line });
  map.set(name, list);
}

/**
 * Reports markers whose description differs between occurrences of the same name.
 *
 * @param issues - Issue accumulator mutated in place.
 * @param map - Marker occurrences grouped by name.
 * @param type - Issue type to report (achievement or ending variant).
 * @param label - Localized label used in the message (e.g. `成就`).
 */
function reportInconsistentDescriptions(
  issues: StorySyntaxIssue[],
  map: Map<string, MarkerOccurrence[]>,
  type: StorySyntaxIssueType,
  label: string,
): void {
  for (const [name, occurrences] of map) {
    const distinct = new Set(occurrences.map((entry) => entry.description));
    if (distinct.size <= 1) {
      continue;
    }
    const reference = occurrences[0].description;
    for (const occurrence of occurrences.slice(1)) {
      if (occurrence.description === reference) {
        continue;
      }
      issues.push({
        type,
        passage: occurrence.passage,
        line: occurrence.line,
        message: `${label}「${name}」的描述与其它段落中的不一致`,
      });
    }
  }
}

/**
 * Statically checks a story for syntax problems without rendering it.
 *
 * Detects broken links, unreferenced passages, invalid `(end:)` markers,
 * leftover/unknown macros, duplicate passage names, and inconsistent
 * achievement/ending descriptions. Line numbers are 1-based and relative to
 * each passage's own content; whole-passage problems such as duplicate names
 * omit the line number.
 *
 * @param story - The parsed story to check.
 * @returns All discovered issues, or an empty array when the story is valid.
 */
export function checkStorySyntax(story: StoryData): StorySyntaxIssue[] {
  const issues: StorySyntaxIssue[] = [];
  if (!story || !Array.isArray(story.passages) || story.passages.length === 0) {
    return issues;
  }

  const passageNames = new Set(story.passages.map((passage) => passage.name));

  const nameCounts = new Map<string, number>();
  for (const passage of story.passages) {
    nameCounts.set(passage.name, (nameCounts.get(passage.name) ?? 0) + 1);
  }
  for (const [name, count] of nameCounts) {
    if (count > 1) {
      issues.push({
        type: "duplicate-passage",
        passage: name,
        message: `段落名「${name}」重复出现 ${count} 次`,
      });
    }
  }

  const referenced = new Set<string>();
  const pointDescriptions = new Map<string, MarkerOccurrence[]>();
  const endDescriptions = new Map<string, MarkerOccurrence[]>();

  for (const passage of story.passages) {
    const content = passage.content ?? "";
    const ignoredRanges = collectIgnoredRanges(content);

    for (const reference of collectLinkReferences(content)) {
      referenced.add(reference.target);
      if (!passageNames.has(reference.target)) {
        issues.push({
          type: "dead-link",
          passage: passage.name,
          line: lineNumberOf(content, reference.index),
          message: `链接指向不存在的段落「${reference.target}」`,
        });
      }
    }

    for (const leftover of findLeftoverMacros(content, ignoredRanges)) {
      issues.push({
        type: "leftover-macro",
        passage: passage.name,
        line: lineNumberOf(content, leftover.index),
        message:
          leftover.reason === "unknown"
            ? `未知宏「${leftover.name}」渲染后会残留在正文中`
            : `宏「${leftover.name}」未闭合或缺少 [] 内容块，渲染后会残留`,
      });
    }

    const endBlocks = collectRawMacroBlocks(content, "end", ignoredRanges);
    if (endBlocks.length > 1) {
      for (const block of endBlocks.slice(1)) {
        issues.push({
          type: "invalid-ending",
          passage: passage.name,
          line: lineNumberOf(content, block.index),
          message: "同一段落中只能出现一个 (end:) 结局标记",
        });
      }
    }
    if (endBlocks.length > 0 && hasLinkSyntax(content)) {
      issues.push({
        type: "invalid-ending",
        passage: passage.name,
        line: lineNumberOf(content, endBlocks[0].index),
        message: "(end:) 只能用于没有任何链接的终止段落",
      });
    }
    for (const block of endBlocks) {
      const marker = parseMarkerFromBody(block.body, "end");
      if (!marker) {
        issues.push({
          type: "invalid-ending",
          passage: passage.name,
          line: lineNumberOf(content, block.index),
          message: "(end:) 缺少结局名称",
        });
      }
    }

    for (const block of collectRawMacroBlocks(
      content,
      "point",
      ignoredRanges,
    )) {
      const marker = parseMarkerFromBody(block.body, "point");
      if (marker) {
        recordMarkerDescription(
          pointDescriptions,
          marker.name,
          marker.description,
          passage.name,
          lineNumberOf(content, block.index),
        );
      }
    }
    for (const block of endBlocks) {
      const marker = parseMarkerFromBody(block.body, "end");
      if (marker) {
        recordMarkerDescription(
          endDescriptions,
          marker.name,
          marker.description,
          passage.name,
          lineNumberOf(content, block.index),
        );
      }
    }
  }

  reportInconsistentDescriptions(
    issues,
    pointDescriptions,
    "inconsistent-point-description",
    "成就",
  );
  reportInconsistentDescriptions(
    issues,
    endDescriptions,
    "inconsistent-ending-description",
    "结局",
  );

  for (const passage of story.passages) {
    if (passage.name === story.startPassage) {
      continue;
    }
    if (!referenced.has(passage.name)) {
      issues.push({
        type: "orphan-passage",
        passage: passage.name,
        line: 1,
        message: `段落「${passage.name}」没有被任何链接、goto 或 display 引用`,
      });
    }
  }

  return issues;
}
