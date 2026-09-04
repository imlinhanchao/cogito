<template>
  <article
    class="rounded-3xl border border-base-300 bg-base-100 p-5 shadow-xl"
  >
    <div class="mb-4 flex items-center justify-between gap-2">
      <span class="badge badge-primary"
        >当前段落：{{ currentPassageName }}</span
      >
      <button
        v-if="history.length > 1"
        class="btn btn-xs btn-ghost"
        type="button"
        @click="undo"
      >
        撤销
      </button>
    </div>
    <div
      ref="storyContentRef"
      class="story-content prose max-w-none leading-relaxed"
      v-html="renderedPassage"
    ></div>
  </article>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useRouter } from "vue-router";
import {
  applyPassageEntryEffects,
  applyStoryAction,
  renderStoryText,
  type StoryData,
  type VariableMap,
  buildInitialVariables,
} from "@/lib/storyEngine";

const router = useRouter();

const props = defineProps<{
  external?: boolean;
  storyProp?: StoryData | null;
  currentPassageProp?: string | null;
  variablesProp?: VariableMap | null;
}>();
const emits = defineEmits();
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
const variablesCollapsed = ref(false);

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
      emits('update:variables', variables.value);
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
    emits('update:currentPassage', currentPassageName.value);
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
};

const back = () => {
  undo();
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
};

const loadState = () => {
  const raw = localStorage.getItem("haide-story-saved");
  if (!raw) {
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
  } catch {
    // ignore broken save data
  }
};

const toggleVariables = () => {
  variablesCollapsed.value = !variablesCollapsed.value;
};

onMounted(() => {
  storyContentRef.value?.addEventListener("click", handleStoryClick);

  // If external props provided, initialize from props and skip local/session restore
  if (props.external && props.storyProp) {
    story.value = props.storyProp;
    currentPassageName.value = props.currentPassageProp || props.storyProp.startPassage || story.value.passages[0]?.name || 'Start';
    variables.value = props.variablesProp || buildInitialVariables(story.value);
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
      variables.value = session.variables ?? buildInitialVariables(story.value);
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
watch(() => props.storyProp, (v) => {
  if (props.external && v) {
    story.value = v;
    renderCurrentPassage();
  }
});
watch(() => props.currentPassageProp, (v) => {
  if (props.external && v) {
    currentPassageName.value = v || currentPassageName.value;
    renderCurrentPassage();
  }
});
watch(() => props.variablesProp, (v) => {
  if (props.external && v) {
    variables.value = v || variables.value;
    renderCurrentPassage();
  }
});

onBeforeUnmount(() => {
  storyContentRef.value?.removeEventListener("click", handleStoryClick);
});
</script>
