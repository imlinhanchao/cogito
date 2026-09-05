import request from '@/utils/http';
import type { User } from './auth';

export interface StoryPayload {
  title: string;
  startPassage?: string;
  passageSize?: number;
  description?: string;
  tags?: string[];
}

export interface IStory {
  id: string;
  title: string;
  startPassage?: string;
  passageSize?: number;
  description?: string;
  tags?: string;
  authorId: string;
  author?: User;
  authorName?: string;
  createdAt: number;
  updatedAt: number;
}

export async function listStories(params: { authorId?: string, search?: string, page?: number, limit?: number } = {}) {
  return request.get<{ data: IStory[]; total: number }>({ url: '/stories', params });
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
