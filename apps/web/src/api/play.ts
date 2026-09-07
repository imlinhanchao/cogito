import request from '@/utils/http';

export async function createPlay(storyId: string, body: any = {}) {
  return request.post({ url: `/play/${storyId}`, data: body });
}

export async function getPlay(storyId: string) {
  return request.get({ url: `/play/${storyId}` });
}

export async function updatePlay(storyId: string, body: any) {
  return request.put({ url: `/play/${storyId}`, data: body });
}

export async function deletePlay(storyId: string) {
  return request.delete({ url: `/play/${storyId}` });
}
