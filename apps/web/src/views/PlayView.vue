<template>
  <div
    class="min-h-screen bg-base-200/50 flex flex-col font-serif text-base-content antialiased selection:bg-primary/20 selection:text-primary"
  >
    <!-- 主阅读区域：典雅纸张感设计 -->
    <main
      class="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-8 py-6 sm:py-10 flex flex-col"
    >
      <!-- 故事操作快捷工具栏 -->
      <div
        class="flex items-center justify-between mb-4 px-2 text-xs font-sans text-base-content/60"
      >
        <div class="flex items-center gap-2">
          <button
            class="btn btn-ghost btn-xs gap-1 hover:text-base-content"
            @click="router.push('/stories')"
          >
            <span class="icon-[solar--arrow-left-linear] text-sm"></span>
            <span>返回故事</span>
          </button>
          <span v-if="story?.author" class="opacity-60">
            • 作者：{{ authorName }}
          </span>
        </div>

        <div class="flex items-center gap-1">
          <button
            class="btn btn-ghost btn-xs gap-1 hover:text-base-content"
            title="重新开始"
            @click="showRestartConfirm = true"
          >
            <span class="icon-[solar--restart-linear] text-sm"></span>
            <span>重置</span>
          </button>
          <button
            class="btn btn-ghost btn-xs gap-1 hover:text-base-content"
            title="故事详情"
            @click="showDetailModal = true"
          >
            <span class="icon-[solar--info-circle-linear] text-sm"></span>
            <span>简介</span>
          </button>
        </div>
      </div>

      <!-- 故事主卡片 -->
      <article
        class="bg-base-100/90 shadow-sm hover:shadow-md transition-shadow duration-300 rounded-2xl p-6 sm:p-12 border border-base-300/60 min-h-[60vh] flex flex-col justify-between"
      >
        <!-- 正文渲染区 -->
        <div
          ref="contentRef"
          class="story-content prose prose-stone lg:prose-lg max-w-none focus:outline-none"
          v-html="currentHtml"
          @click="onContentClick"
        ></div>

        <!-- 底部微交互/状态指示 -->
        <footer
          class="mt-12 pt-6 border-t border-base-200/80 flex items-center justify-between text-xs text-base-content/40 font-sans"
        >
          <span class="flex items-center gap-1.5">
            <span
              class="inline-block w-1.5 h-1.5 rounded-full bg-success/80 animate-pulse"
            ></span>
            当前章节: {{ play?.passage || play?.currentPassage || "序幕" }}
          </span>
        </footer>
      </article>
    </main>

    <!-- 开始游玩 / 简介弹窗 -->
    <div
      v-if="showModal === true"
      class="modal modal-open backdrop-blur-sm bg-base-900/40"
    >
      <div
        class="modal-box max-w-lg border border-base-300/80 shadow-2xl p-6 sm:p-8 rounded-2xl bg-base-100 font-sans"
      >
        <div class="flex items-center justify-between mb-4">
          <span
            class="badge badge-outline badge-primary text-xs font-mono tracking-wider"
            >INTERACTIVE STORY</span
          >
        </div>

        <h3
          class="font-serif font-bold text-2xl text-base-content mb-2 tracking-tight"
        >
          {{ story?.title }}
        </h3>
        <p class="text-xs text-base-content/60 mb-6 flex items-center gap-1.5">
          <span>作者：{{ authorName }}</span>
        </p>

        <div
          class="bg-base-200/50 rounded-xl p-4 mb-6 border border-base-200 text-sm text-base-content/80 leading-relaxed font-serif max-h-48 overflow-y-auto"
        >
          <div
            v-html="story?.description || '探索属于你的剧情分支与故事世界。'"
          ></div>
        </div>

        <div class="modal-action flex items-center justify-end gap-3 pt-2">
          <button class="btn btn-ghost text-sm font-normal" @click="closeModal">
            返回列表
          </button>
          <button
            class="btn btn-primary px-6 shadow-sm shadow-primary/30"
            @click="startPlay"
          >
            开始阅读体验
          </button>
        </div>
      </div>
    </div>

    <!-- 故事详情弹窗 -->
    <div
      v-if="showDetailModal"
      class="modal modal-open backdrop-blur-sm bg-base-900/40"
    >
      <div
        class="modal-box max-w-md border border-base-300/80 rounded-2xl p-6 bg-base-100 font-sans"
      >
        <h3 class="font-serif font-bold text-xl mb-3">{{ story?.title }}</h3>
        <p class="text-xs text-base-content/60 mb-4">作者：{{ authorName }}</p>
        <div
          class="text-sm text-base-content/80 leading-relaxed font-serif max-h-60 overflow-y-auto bg-base-200/40 p-4 rounded-xl mb-6"
        >
          <div v-html="story?.description || '暂无故事简介'"></div>
        </div>
        <div class="modal-action">
          <button class="btn btn-sm btn-ghost" @click="showDetailModal = false">
            关闭
          </button>
        </div>
      </div>
    </div>

    <!-- 重新开始确认弹窗 -->
    <div
      v-if="showRestartConfirm"
      class="modal modal-open backdrop-blur-sm bg-base-900/40"
    >
      <div
        class="modal-box max-w-sm border border-base-300/80 rounded-2xl p-6 bg-base-100 font-sans"
      >
        <h4 class="font-bold text-lg mb-2">重新开始故事？</h4>
        <p class="text-sm text-base-content/70 mb-6">
          当前的故事进度将被重置并从头开始。
        </p>
        <div class="modal-action flex gap-2">
          <button
            class="btn btn-sm btn-ghost"
            @click="showRestartConfirm = false"
          >
            取消
          </button>
          <button class="btn btn-sm btn-error" @click="confirmRestart">
            确认重置
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { getStory } from "@/api/stories";
import { createPlay, getPlay, updatePlay, getReleaseStory } from "@/api/play";
import { useAppStore } from "@/stores/modules/app";

const route = useRoute();
const router = useRouter();
const appStore = useAppStore();
const storyId = String(route.params.storyId || "");

const story = ref<any>(null);
const play = ref<any>(null);
const currentHtml = ref("");
const showModal = ref<boolean | null>(null);
const showDetailModal = ref(false);
const showRestartConfirm = ref(false);

const authorName = computed(
  () =>
    story.value?.author?.nickname || story.value?.author?.username || "佚名",
);

function localKey(id: string) {
  return `play:${id}`;
}

watch(
  () => story.value?.title,
  (newTitle) => {
    if (newTitle) {
      appStore.setCustomHeaderTitle(newTitle);
    }
  },
);

onUnmounted(() => {
  appStore.setCustomHeaderTitle(null);
});

async function loadStory() {
  const res = await (route.name == "play" ? getReleaseStory : getStory)(
    storyId,
  );
  story.value = res as any;
  if (story.value?.title) {
    appStore.setCustomHeaderTitle(story.value.title);
  }
}

async function loadExistingPlay() {
  try {
    const p = await getPlay(storyId);
    play.value = p;
    currentHtml.value = p.html || "";
    return true;
  } catch (err) {
    console.warn("[PlayView] loadExistingPlay failed", err);
    localStorage.removeItem(localKey(storyId));
    return false;
  }
}

async function startPlay() {
  try {
    const res = await createPlay(storyId, {
      currentPassage: story.value?.startPassage,
    });
    play.value = res as any;
    currentHtml.value = res.html || "";
    if (res?.id) {
      localStorage.setItem(localKey(storyId), res.id);
    }
    showModal.value = false;
  } catch (err) {
    console.error("startPlay error", err);
  }
}

async function confirmRestart() {
  showRestartConfirm.value = false;
  await startPlay();
}

function closeModal() {
  showModal.value = false;
  router.push("/stories");
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
});

async function onContentClick(e: MouseEvent) {
  const targetEl = (e.target as HTMLElement)?.closest(
    "[data-story-target], [data-story-action], [data-story-display]",
  ) as HTMLElement | null;
  if (!targetEl || !Object.keys(targetEl.dataset).length) return;
  const target = targetEl.dataset.storyTarget || undefined;
  const action = targetEl.dataset.storyAction || undefined;
  const display = targetEl.dataset.storyDisplay || undefined;
  if (!target && !action && !display) return;

  try {
    if (!play.value?.id) {
      await startPlay();
    }

    const res = await updatePlay(storyId, { target, action, display });
    play.value = res as any;
    if (res.html) {
      currentHtml.value = res.html;
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  } catch (err) {
    console.error("[PlayView] interaction update failed", err);
  }
}
</script>

<style scoped>
/* 典雅交互式小说排版与交互按键样式 */
:deep(.story-content) {
  line-height: 1.95;
  letter-spacing: 0.015em;
}

:deep(.story-content p) {
  margin-bottom: 1.5em;
  text-align: justify;
}

:deep(.story-link),
:deep(button[data-story-target]),
:deep(button[data-story-action]) {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  margin: 2px;
  padding: 2px 4px;
  font-family:
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    Roboto,
    sans-serif;
  font-size: 0.925rem;
  font-weight: 500;
  line-height: 1.4;
  color: var(--color-primary, oklch(0.48 0.24 270));
  background: color-mix(in oklch, currentColor 8%, transparent);
  border: 1px solid color-mix(in oklch, currentColor 20%, transparent);
  border-radius: 2px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.03);
}

:deep(.story-link:hover),
:deep(button[data-story-target]:hover),
:deep(button[data-story-action]:hover) {
  background: color-mix(in oklch, currentColor 16%, transparent);
  border-color: color-mix(in oklch, currentColor 45%, transparent);
  transform: translateY(-1px);
  box-shadow: 0 4px 10px -2px color-mix(in oklch, currentColor 20%, transparent);
}

:deep(.story-link:active),
:deep(button[data-story-target]:active),
:deep(button[data-story-action]:active) {
  transform: translateY(0);
}
</style>
