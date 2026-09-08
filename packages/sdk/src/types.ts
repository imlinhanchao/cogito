export type VariableMap = Record<string, unknown>;

export interface StoryPassage {
  name: string;
  tags?: string[];
  content: string;
}

export interface StoryData {
  title: string;
  description?: string;
  tags?: string[];
  startPassage: string;
  passages: StoryPassage[];
}