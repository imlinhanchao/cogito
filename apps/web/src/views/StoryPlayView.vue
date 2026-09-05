<template>
  <div class="w-full max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-4">
    <!-- 顶部导航与控制栏 -->
    <header class="navbar bg-base-100 rounded-2xl border border-base-200/80 shadow-xs px-4 py-2 flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-2 min-w-0">
        <button
          v-if="!external"
          class="btn btn-ghost btn-circle btn-sm"
          type="button"
          title="返回"
          @click="goBack"
        >
          <Icon icon="mdi:arrow-left" class="w-5 h-5 text-base-content/80" />
        </button>

        <div class="flex flex-col min-w-0">
          <h1 class="text-base sm:text-lg font-bold truncate tracking-tight text-base-content">
            {{ story.title || '互动故事' }}
          </h1>
          <div class="flex items-center gap-2 text-xs text-base-content/60">
            <span class="inline-flex items-center gap-1">
              <Icon icon="mdi:book-open-page-variant-outline" class="w-3.5 h-3.5 text-primary" />
              <span class="truncate max-w-30 sm:max-w-50">{{ currentPassageName }}</span>
            </span>
          </div>
        </div>
      </div>

      <div class="flex items-center gap-1.5 sm:gap-2">
        <button
          v-if="history.length > 1"
          class="btn btn-sm btn-ghost gap-1.5 font-normal text-xs sm:text-sm text-base-content/80 hover:bg-base-200"
          type="button"
          @click="undo"
        >
          <Icon icon="mdi:undo-variant" class="w-4 h-4" />
          <span>撤销</span>
        </button>

        <button
          v-if="!external"
          class="btn btn-sm btn-ghost btn-square"
          type="button"
          title="保存进度"
          @click="saveState"
        >
          <Icon icon="mdi:bookmark-outline" class="w-4.5 h-4.5 text-base-content/70" />
        </button>

        <button
          v-if="!external"
          class="btn btn-sm btn-ghost btn-square"
          type="button"
          title="加载进度"
          @click="loadState"
        >
          <Icon icon="mdi:folder-open-outline" class="w-4.5 h-4.5 text-base-content/70" />
        </button>
      </div>
    </header>

    <!-- 故事正文主体区 -->
    <main class="card bg-base-100 border border-base-200/80 shadow-sm rounded-2xl overflow-hidden transition-all">
      <div class="card-body p-5 sm:p-8 lg:p-10">
        <article
          ref="storyContentRef"
          class="story-content prose prose-sm sm:prose-base max-w-none leading-relaxed text-base-content selection:bg-primary/20"
          v-html="renderedPassage"
        ></article>
      </div>
    </main>

    <!-- 底部辅助状态/变量查看面板（非嵌入模式下提供） -->
    <footer v-if="!external && Object.keys(variables).length > 0" class="collapse collapse-arrow bg-base-100 rounded-xl border border-base-200/60 shadow-2xs">
      <input type="checkbox" :checked="!variablesCollapsed" @change="toggleVariables" />
      <div class="collapse-title text-xs sm:text-sm font-medium flex items-center gap-2 py-3 min-h-0 text-base-content/70">
        <Icon icon="mdi:variable" class="w-4 h-4 text-primary" />
        <span>查看当前全局状态变量 ({{ Object.keys(variables).length }})</span>
      </div>
      <div class="collapse-content border-t border-base-200/40 text-xs">
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-3">
          <div
            v-for="(val, key) in variables"
            :key="key"
            class="flex justify-between items-center bg-base-200/50 px-2.5 py-1.5 rounded-md truncate"
          >
            <span class="font-mono text-base-content/60 truncate mr-2">{{ key }}:</span>
            <span class="font-mono font-semibold text-primary truncate">{{ formatVariable(val) }}</span>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { Icon } from "@iconify/vue";
import msg from "@/components/msg";
import {
  applyPassageEntryEffects,
  applyStoryAction,
  renderStoryText,
  type StoryData,
  type VariableMap,
  buildInitialVariables,
} from "@/lib/storyEngine";

export interface StoryPlayProps {
  external?: boolean;
  storyProp?: StoryData | null;
  currentPassageProp?: string | null;
  variablesProp?: VariableMap | null;
}

export interface StoryPlayEmits {
  (e: "update:variables", value: VariableMap): void;
  (e: "update:currentPassage", value: string): void;
}

const props = withDefaults(defineProps<StoryPlayProps>(), {
  external: false,
  storyProp: null,
  currentPassageProp: null,
  variablesProp: null,
});

const emits = defineEmits<StoryPlayEmits>();
const router = useRouter();

const storyContentRef = ref<HTMLElement | null>(null);
const renderedPassage = ref("");
const story = ref<StoryData>({
  title: "互动故事",
  startPassage: "Start",
  passages: [{ name: "Start", tags: [], content: "故事尚未加载。" }],
});
const currentPassageName = ref("Start");
const variables = ref<VariableMap>({});
const history = ref<string[]>(["Start"]);
const variablesCollapsed = ref(true);

interface StoryPlaySnapshot {
  storySignature: string;
  story: StoryData;
  currentPassage: string;
  variables: VariableMap;
  history: string[];
  renderedPassage: string;
}

const AUTO_PLAY_CACHE_KEY = "haide-story-play-cache";

const hashStory = (storyValue: StoryData): string => {
  const raw = JSON.stringify({
    title: storyValue.title,
    startPassage: storyValue.startPassage,
    passages: storyValue.passages.map((passage) => ({
      name: passage.name,
      tags: passage.tags,
      content: passage.content,
    })),
  });

  let hash = 0;
  for (let index = 0; index < raw.length; index += 1) {
    hash = (Math.imul(31, hash) + raw.charCodeAt(index)) | 0;
  }
  return String(hash);
};

const getStorySignature = () => hashStory(story.value);

const saveAutoSnapshot = () => {
  if (props.external) return;
  const snapshot: StoryPlaySnapshot = {
    storySignature: getStorySignature(),
    story: story.value,
    currentPassage: currentPassageName.value,
    variables: variables.value,
    history: history.value,
    renderedPassage: renderedPassage.value,
  };

  localStorage.setItem(AUTO_PLAY_CACHE_KEY, JSON.stringify(snapshot));
};

const renderCurrentPassage = () => {
  const current =
    story.value.passages.find(
      (passage) => passage.name === currentPassageName.value,
    ) ?? story.value.passages[0];
  if (!current) {
    renderedPassage.value = "";
    return;
  }

  variables.value.passage = current.name;
  variables.value.storyTitle = story.value.title;
  applyPassageEntryEffects(current.content, variables.value);

  const previewVariables = { ...variables.value };
  renderedPassage.value = renderStoryText(
    current.content,
    previewVariables,
    story.value,
    (target) => goto(target),
  );
  saveAutoSnapshot();
};

const restoreAutoSnapshot = (): boolean => {
  if (props.external) return false;
  const raw = localStorage.getItem(AUTO_PLAY_CACHE_KEY);
  if (!raw) {
    return false;
  }

  try {
    const snapshot = JSON.parse(raw) as Partial<StoryPlaySnapshot>;
    if (
      !snapshot.story ||
      snapshot.storySignature !== hashStory(snapshot.story)
    ) {
      return false;
    }

    story.value = snapshot.story;
    currentPassageName.value =
      snapshot.currentPassage || snapshot.story.startPassage;
    variables.value =
      snapshot.variables || buildInitialVariables(snapshot.story);
    history.value = snapshot.history || [currentPassageName.value];
    renderedPassage.value = snapshot.renderedPassage || "";

    if (!renderedPassage.value) {
      renderCurrentPassage();
    }

    return true;
  } catch {
    return false;
  }
};

const handleStoryClick = (event: MouseEvent) => {
  const eventTarget = event.target;
  const linkElement =
    eventTarget instanceof Element
      ? eventTarget.closest("[data-story-target]")
      : null;
  const target =
    linkElement?.getAttribute("data-story-goto") ??
    linkElement?.getAttribute("data-story-target");
  if (!target) {
    return;
  }

  event.preventDefault();
  const action = linkElement?.getAttribute("data-story-action");
  if (action) {
    applyStoryAction(action, variables.value);
    if (props.external) {
      emits("update:variables", variables.value);
    }
  }
  goto(target);
};

const goto = (target: string) => {
  const nextPassage = story.value.passages.find(
    (passage) => passage.name === target,
  );
  if (!nextPassage) {
    return;
  }

  currentPassageName.value = nextPassage.name;
  history.value = [...history.value, nextPassage.name];
  renderCurrentPassage();
  if (props.external) {
    emits("update:currentPassage", currentPassageName.value);
  }
};

const undo = () => {
  if (history.value.length <= 1) {
    return;
  }
  history.value.pop();
  currentPassageName.value =
    history.value[history.value.length - 1] ?? story.value.startPassage;
  renderCurrentPassage();
  if (props.external) {
    emits("update:currentPassage", currentPassageName.value);
  }
};

const goBack = () => {
  if (window.history.length > 1) {
    router.back();
  } else {
    router.push({ name: "story-list" });
  }
};

const saveState = () => {
  localStorage.setItem(
    "haide-story-saved",
    JSON.stringify({
      story: story.value,
      currentPassage: currentPassageName.value,
      variables: variables.value,
      history: history.value,
      renderedPassage: renderedPassage.value,
    }),
  );
  msg.success("故事进度已保存");
};

const loadState = () => {
  const raw = localStorage.getItem("haide-story-saved");
  if (!raw) {
    msg.warning("暂无已保存的进度");
    return;
  }

  try {
    const saved = JSON.parse(raw);
    story.value = saved.story;
    currentPassageName.value = saved.currentPassage || story.value.startPassage;
    variables.value = saved.variables || buildInitialVariables(story.value);
    history.value = saved.history || [currentPassageName.value];
    renderedPassage.value = saved.renderedPassage || "";
    if (!renderedPassage.value) {
      renderCurrentPassage();
    }
    saveAutoSnapshot();
    msg.success("已加载保存的进度");
  } catch {
    msg.error("加载存档失败，存档可能损坏");
  }
};

const toggleVariables = () => {
  variablesCollapsed.value = !variablesCollapsed.value;
};

const formatVariable = (val: unknown): string => {
  if (val === null || val === undefined) return String(val);
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
};

onMounted(() => {
  storyContentRef.value?.addEventListener("click", handleStoryClick);

  // If external props provided, initialize from props and skip local/session restore
  if (props.external && props.storyProp) {
    story.value = props.storyProp;
    currentPassageName.value =
      props.currentPassageProp ||
      props.storyProp.startPassage ||
      story.value.passages[0]?.name ||
      "Start";
    variables.value =
      props.variablesProp || buildInitialVariables(story.value);
    renderCurrentPassage();
    return;
  }

  if (restoreAutoSnapshot()) {
    return;
  }

  const rawSession = localStorage.getItem("haide-story-session");
  if (rawSession) {
    try {
      const session = JSON.parse(rawSession);
      story.value = session.story ?? story.value;
      currentPassageName.value =
        session.currentPassage ?? story.value.startPassage;
      variables.value =
        session.variables ?? buildInitialVariables(story.value);
      history.value = [currentPassageName.value];
      renderCurrentPassage();
      return;
    } catch {
      // ignore malformed session
    }
  }

  const raw = localStorage.getItem("haide-story-draft");
  if (raw) {
    try {
      const draft = JSON.parse(raw) as StoryData;
      story.value = draft;
      currentPassageName.value =
        draft.startPassage || draft.passages[0]?.name || "Start";
      variables.value = buildInitialVariables(draft);
      history.value = [currentPassageName.value];
      renderCurrentPassage();
    } catch {
      // ignore malformed draft
    }
  }

  renderCurrentPassage();
});

// Watch external props to update internal state
watch(
  () => props.storyProp,
  (v) => {
    if (props.external && v) {
      story.value = v;
      renderCurrentPassage();
    }
  },
);
watch(
  () => props.currentPassageProp,
  (v) => {
    if (props.external && v) {
      currentPassageName.value = v || currentPassageName.value;
      renderCurrentPassage();
    }
  },
);
watch(
  () => props.variablesProp,
  (v) => {
    if (props.external && v) {
      variables.value = v || variables.value;
      renderCurrentPassage();
    }
  },
);

onBeforeUnmount(() => {
  storyContentRef.value?.removeEventListener("click", handleStoryClick);
});
</script>
