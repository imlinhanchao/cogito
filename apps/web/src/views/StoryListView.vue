<template>
  <div class="p-4">
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-xl font-bold">故事列表</h2>
      <div>
        <button class="btn btn-primary" @click="createNew">新建故事</button>
      </div>
    </div>
    <div class="space-y-2">
      <div v-for="s in stories" :key="s.id" class="rounded p-3 border bg-base-100 flex items-center justify-between">
        <div>
          <div class="font-semibold">{{ s.title || '未命名' }}</div>
          <div class="text-sm text-base-content/60">{{ s.passages?.length || 0 }} 段落</div>
        </div>
        <div class="flex items-center gap-2">
          <button class="btn btn-sm" @click="editStory(s.id)">编辑</button>
          <button class="btn btn-sm btn-ghost" @click="previewStory(s.id)">预览</button>
        </div>
      </div>
    </div>
    <div class="mt-4 flex justify-center">
      <button class="btn btn-sm" @click="loadMore" v-if="hasMore">加载更多</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { listStories } from '@/api/stories';
import { useRouter } from 'vue-router';

const router = useRouter();
const stories = ref<Array<any>>([]);
const page = ref(1);
const limit = 20;
const hasMore = ref(true);

const load = async () => {
  const res = await listStories(page.value, limit);
  const data = Array.isArray(res) ? res : res.data ?? res;
  const total = (res && (res.total ?? (res.data && res.data.total))) ?? 0;
  stories.value.push(...(data || []));
  if (total && total <= stories.value.length) hasMore.value = false;
};

const loadMore = async () => {
  page.value += 1;
  await load();
};

const createNew = () => {
  router.push({ name: 'story-editor' });
};

const editStory = (id: string) => {
  router.push({ name: 'story-editor', params: { storyId: id } });
};

const previewStory = (id: string) => {
  router.push({ name: 'story-play', params: { storyId: id } });
};

onMounted(async () => {
  await load();
});
</script>
