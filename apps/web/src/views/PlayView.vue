<template>
  <div class="max-w-3xl mx-auto mt-9 p-4">
    <h2 class="text-2xl font-semibold mb-3">{{ story?.title || '故事' }}</h2>

    <div 
      ref="contentRef" 
      class="prose p-4 rounded-md min-h-40" 
      v-html="currentHtml"
      @click="onContentClick"
    >

    </div>

    <div v-if="showModal === true" class="modal modal-open">
      <div class="modal-box max-w-lg">
        <h3 class="font-bold text-lg mb-2">{{ story?.title }}</h3>
        <p class="text-sm text-gray-600 mb-4">作者：{{ story?.author?.username || story?.authorName || '匿名' }}</p>
        <div class="prose mb-4" v-html="story?.description || '暂无简介'"></div>
        <div class="modal-action">
          <button class="btn btn-primary" @click="startPlay">开始游玩</button>
          <button class="btn" @click="closeModal">返回</button>
        </div>
      </div>
    </div>
    <div class="fixed left-3 bottom-3 bg-black bg-opacity-60 text-white px-2 py-1 rounded text-xs">showModal: {{ String(showModal) }}</div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getStory } from '@/api/stories';
import { createPlay, getPlay, updatePlay } from '@/api/play';
import { onClickOutside } from '@vueuse/core';

const route = useRoute();
const router = useRouter();
const storyId = String(route.params.storyId || '');

const story = ref<any>(null);
const play = ref<any>(null);
const currentHtml = ref('');
const showModal = ref<boolean | null>(null);

function localKey(id: string) {
  return `play:${id}`;
}

async function loadStory() {
  try {
    const res = await getStory(storyId);
    story.value = res as any;
    console.debug('[PlayView] loadStory success', { id: storyId, title: story.value?.title });
  } catch (err) {
    console.error('loadStory error', err);
    story.value = null;
  }
}

async function loadExistingPlay() {
  try {
    const p = await getPlay(storyId);
    play.value = p;
    currentHtml.value = p.html || '';
    console.debug('[PlayView] loadExistingPlay success'); 
    return true;
  } catch (err) {
    console.warn('[PlayView] loadExistingPlay failed', err);
    localStorage.removeItem(localKey(storyId));
    return false;
  }
}

async function startPlay() {
  try {
    const res = await createPlay(storyId, { currentPassage: story.value?.startPassage });
    play.value = res as any;
    currentHtml.value = res.html || '';
    if (res?.id) {
      localStorage.setItem(localKey(storyId), res.id);
    } else {
      console.warn('[PlayView] createPlay returned no id', res);
    }
    showModal.value = false;
  } catch (err) {
    console.error('startPlay error', err);
  }
}

function closeModal() {
  showModal.value = false;
  router.push('/stories');
}

const contentRef = ref<HTMLElement>();
onMounted(async () => {
  await loadStory();
  const started = await loadExistingPlay();
  if (started) {
    showModal.value = false;
  } else {
    showModal.value = true;
  }
  console.debug('PlayView mounted', { storyId, started, showModal: showModal.value });
});

async function onContentClick(e: MouseEvent) {
  const el = (e.target as HTMLElement) as HTMLElement | null;
  if (!el || !Object.keys(el.dataset).length) return;
  const target = el.dataset.storyTarget || undefined;
  const action = el.dataset.storyAction || undefined;
  if (!target && !action) return;

  try {
    // ensure we have a play id
    if (!play.value?.id) {
      await startPlay();
    }

    const res = await updatePlay(storyId, { target, action });
    // update local state and rendered html
    play.value = res as any;
    if (res.html) currentHtml.value = res.html;
    console.debug('[PlayView] interaction update success', { target, action });
  } catch (err) {
    console.error('[PlayView] interaction update failed', err);
  }
}
</script>
