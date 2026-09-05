<template>
  <div class="p-4">
    <div v-if="loading" class="text-center py-8">加载中…</div>
    <div v-else>
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-xl font-bold">审核：{{ story?.title }}</h2>
        <div class="flex items-center gap-2">
          <button class="btn btn-sm" @click="goBack">返回</button>
          <button class="btn btn-sm btn-ghost" @click="rejectPrompt">拒绝</button>
          <button class="btn btn-sm btn-primary" @click="approve">通过</button>
        </div>
      </div>
      <StoryEditorView :readOnly="true" :initialStory="story" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import StoryEditorView from '@/views/StoryEditorView.vue';
import { getStory, approveStory, rejectStory } from '@/api/stories';
import msg from '@/components/msg';
import msgbox from '@/components/msgbox';

const route = useRoute();
const router = useRouter();
const id = (route.params.id as string) || '';
const story = ref<any | null>(null);
const loading = ref(true);

const load = async () => {
  loading.value = true;
  try {
    const res = await getStory(id);
    story.value = res;
  } catch (e) {
    msg.error('加载失败');
  } finally {
    loading.value = false;
  }
};

const goBack = () => router.back();

const approve = async () => {
  try {
    await approveStory(id);
    msg.success('已通过并上架');
    router.replace({ name: 'admin-reviews' });
  } catch (e) {
    msg.error('操作失败');
  }
};

const rejectPrompt = async () => {
  const reason = (await msgbox.prompt('拒绝理由（可选）')) as string | false;
  if (reason === false) return;
  try {
    await rejectStory(id, reason || undefined);
    msg.success('已拒绝');
    router.replace({ name: 'admin-reviews' });
  } catch (e) {
    msg.error('操作失败');
  }
};

onMounted(() => load());
</script>

<style scoped></style>
