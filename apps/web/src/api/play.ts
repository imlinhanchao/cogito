import request from "@/utils/http";

export async function getReleaseStory(storyId: string) {
  return request.get({ url: `/play/story/${storyId}` });
}

export async function createPlay(storyId: string, body: any = {}) {
  return request.post({ url: `/play/${storyId}`, data: body });
}

export async function getPlay(storyId: string) {
  return request.get({ url: `/play/${storyId}` });
}

export async function updatePlay(
  storyId: string,
  body: { target?: string; action?: string; display?: string },
) {
  return request.put({ url: `/play/${storyId}`, data: body });
}

export async function resetPlay(storyId: string) {
  return request.post({ url: `/play/reset/${storyId}` });
}

export interface IUnlock {
  name: string;
  description: string;
}

export interface IUserStoryProgress {
  id: string;
  title: string;
  description: string;
  points: IUnlock[];
  end: IUnlock[];
  isPlaying: boolean;
}

export const getUserUnlocks = (userId: string) => {
  return request.get<IUserStoryProgress[]>({ url: `/play/unlocks/${userId}` });
};
