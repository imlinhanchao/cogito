<template>
  <div class="w-full md:max-w-4xl md:mx-auto md:p-2 space-y-4 overflow-auto">
    <!-- 顶部导航与控制栏 -->
    <header
      class="navbar bg-base-100 rounded-2xl border border-base-200/80 shadow-xs px-4 py-2 flex flex-wrap items-center justify-between gap-3"
    >
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
          <h1
            class="text-base sm:text-lg font-bold truncate tracking-tight text-base-content"
          >
            {{ story.title || "互动故事" }}
          </h1>
          <div class="flex items-center gap-2 text-xs text-base-content/60">
            <span class="inline-flex items-center gap-1">
              <Icon
                icon="mdi:book-open-page-variant-outline"
                class="w-3.5 h-3.5 text-primary"
              />
              <span class="truncate max-w-30 sm:max-w-50">{{
                currentPassageName
              }}</span>
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
      </div>
    </header>

    <!-- 故事正文主体区 -->
    <main
      class="card bg-base-100 border border-base-200/80 shadow-sm rounded-2xl transition-all"
    >
      <div class="card-body p-5 sm:p-8 lg:p-10">
        <article
          ref="storyContentRef"
          class="story-content prose prose-sm sm:prose-base max-w-none leading-relaxed text-base-content selection:bg-primary/20"
          v-html="renderedPassage"
        ></article>
      </div>
    </main>

    <!-- 底部辅助状态/变量查看面板（非嵌入模式下提供） -->
    <footer
      v-if="!external && Object.keys(variables).length > 0"
      class="collapse collapse-arrow bg-base-100 rounded-xl border border-base-200/60 shadow-2xs"
    >
      <input
        type="checkbox"
        :checked="!variablesCollapsed"
        @change="toggleVariables"
      />
      <div
        class="collapse-title text-xs sm:text-sm font-medium flex items-center gap-2 py-3 min-h-0 text-base-content/70"
      >
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
            <span class="font-mono text-base-content/60 truncate mr-2"
              >{{ key }}:</span
            >
            <span class="font-mono font-semibold text-primary truncate">{{
              formatVariable(val)
            }}</span>
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
const displayedPassages = ref<Record<string, boolean>>({});
const entryRenderVariables = ref<VariableMap | null>(null);
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

const renderCurrentPassage = (runEntryEffects = true, useEntrySnapshot = false) => {
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

  if (runEntryEffects) {
    entryRenderVariables.value = { ...variables.value };
  }

  // Display re-renders keep the entry snapshot so `(if:)` branches stay
  // consistent; action-only re-renders read the freshly mutated variables.
  const renderVars =
    !runEntryEffects && useEntrySnapshot && entryRenderVariables.value
      ? { ...entryRenderVariables.value }
      : undefined;

  renderedPassage.value = renderStoryText(
    current.content,
    variables.value,
    story.value,
    (target) => goto(target),
    displayedPassages.value,
    {
      applyEntryEffects: runEntryEffects,
      ...(renderVars ? { renderVariables: renderVars } : {}),
    },
  );
};

const handleStoryClick = (event: MouseEvent) => {
  const eventTarget = event.target;
  const linkElement =
    eventTarget instanceof Element
      ? eventTarget.closest(
          "[data-story-target], [data-story-display], [data-story-action]",
        )
      : null;
  const target =
    linkElement?.getAttribute("data-story-goto") ??
    linkElement?.getAttribute("data-story-target");
  const display = linkElement?.getAttribute("data-story-display");
  const action = linkElement?.getAttribute("data-story-action");
  if (!target && !display && !action) {
    return;
  }

  event.preventDefault();
  if (action) {
    applyStoryAction(action, variables.value);
    if (props.external) {
      emits("update:variables", variables.value);
    }
  }
  if (display) {
    displayedPassages.value = {
      ...displayedPassages.value,
      [display]: true,
    };
    renderCurrentPassage(false, true);
    return;
  }
  if (target) {
    goto(target);
    return;
  }
  renderCurrentPassage(false);
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
  renderCurrentPassage(true);
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
  renderCurrentPassage(false);
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
    variables.value = props.variablesProp || buildInitialVariables(story.value);
    renderCurrentPassage(true);
    return;
  }

  renderCurrentPassage(true);
});

// Watch external props to update internal state
watch(
  () => props.storyProp,
  (v) => {
    if (props.external && v) {
      story.value = v;
      renderCurrentPassage(false);
    }
  },
);
watch(
  () => props.currentPassageProp,
  (v) => {
    if (props.external && v && v !== currentPassageName.value) {
      currentPassageName.value = v;
      renderCurrentPassage(true);
    }
  },
);
watch(
  () => props.variablesProp,
  (v) => {
    if (props.external && v) {
      variables.value = v || variables.value;
      renderCurrentPassage(false);
    }
  },
);

onBeforeUnmount(() => {
  storyContentRef.value?.removeEventListener("click", handleStoryClick);
});
</script>
