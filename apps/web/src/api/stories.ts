import request from '@/utils/http';
import type { User } from './auth';
import { StoryData } from '@/lib/storyEngine';

export interface StoryPayload {
  title: string;
  startPassage?: string;
  passageSize?: number;
  description?: string;
  tags?: string[];
}

export interface IStory extends StoryData {
  id?: string;
  title: string;
  startPassage: string;
  passageSize?: number;
  description?: string;
  tags?: string[];
  authorId?: string;
  author?: User;
  authorName?: string;
  createdAt?: number;
  updatedAt?: number;
  status?: 'draft' | 'pending' | 'published' | 'rejected';
  reviewReason?: string;
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

export async function publishStory(id: string) {
  return request.put({ url: `/stories/${id}/publish` });
}

export async function adminPending(limit = 50) {
  return request.get<{ data: IStory[]; total: number }>({ url: '/stories/admin/pending', params: { limit } });
}

export async function approveStory(id: string) {
  return request.post({ url: `/stories/${id}/approve` });
}

export async function rejectStory(id: string, reason?: string) {
  return request.post({ url: `/stories/${id}/reject`, data: { reason } });
}