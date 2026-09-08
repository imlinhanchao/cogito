/** Story runtime variables, keyed by name (without the leading `$`). */
export type VariableMap = Record<string, unknown>;

/** A single named passage of story content. */
export interface StoryPassage {
  /** Unique passage name, used as a link/goto target. */
  name: string;
  /** Optional free-form tags declared in the passage header, e.g. `:: Name [tag1,tag2]`. */
  tags?: string[];
  /** Raw passage source, including macros and markdown, not yet rendered. */
  content: string;
}

/** A parsed story: metadata plus all of its passages. */
export interface StoryData {
  /** Story title, shown in the UI and exported HTML. */
  title: string;
  /** Optional short description of the story. */
  description?: string;
  /** Optional free-form tags for the whole story. */
  tags?: string[];
  /** Name of the passage rendered when the story begins. */
  startPassage: string;
  /** All passages that make up the story. */
  passages: StoryPassage[];
}
