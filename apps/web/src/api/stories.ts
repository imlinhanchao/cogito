import request from '@/utils/http';

export interface StoryPayload {
  title: string;
  startPassage?: string;
  passageSize?: number;
  description?: string;
  tags?: string[];
}

export async function listStories(page = 1, limit = 20) {
  return request.get({ url: '/stories', params: { page, limit } });
}

export async function getStory(id: string) {
  return request.get({ url: `/stories/${id}` });
}

export async function createStory(payload: StoryPayload) {
  return request.post({ url: '/stories', data: payload });
}

export async function updateStory(id: string, payload: Partial<StoryPayload>) {
  return request.put({ url: `/stories/${id}`, data: payload });
}

export async function deleteStory(id: string) {
  return request.delete({ url: `/stories/${id}` });
}
