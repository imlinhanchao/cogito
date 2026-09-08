import type { StoryData, StoryPassage, VariableMap } from "./types";

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
