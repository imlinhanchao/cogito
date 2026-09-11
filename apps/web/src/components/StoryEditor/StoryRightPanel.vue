<template>
  <div class="space-y-4 rounded-xl border border-base-300 bg-base-200/50 md:p-3 h-full flex flex-col flex-1">
    <div class="mb-2 flex items-center justify-between bg-base-200 flex-none">
      <div class="tabs tabs-boxed p-0.5">
        <a
          :class="[
            'tab tab-xs font-semibold',
            activeTabModel === 'preview' ? 'tab-active' : '',
          ]"
          @click.prevent="activeTabModel = 'preview'"
        >
          <Icon icon="mdi:play-circle-outline" class="mr-1 text-sm" />
          <span v-if="!isMobile">预览</span>
        </a>
        <a
          :class="[
            'tab tab-xs font-semibold',
            activeTabModel === 'vars' ? 'tab-active' : '',
          ]"
          @click.prevent="activeTabModel = 'vars'"
        >
          <Icon icon="mdi:variable" class="mr-1 text-sm" />
          <span v-if="!isMobile">变量</span>
        </a>
        <a
          :class="[
            'tab tab-xs font-semibold',
            activeTabModel === 'points' ? 'tab-active' : '',
          ]"
          @click.prevent="activeTabModel = 'points'"
        >
          <Icon icon="mdi:star-circle-outline" class="mr-1 text-sm" />
          <span v-if="!isMobile">成就</span>
        </a>
        <a
          :class="[
            'tab tab-xs font-semibold',
            activeTabModel === 'endings' ? 'tab-active' : '',
          ]"
          @click.prevent="activeTabModel = 'endings'"
        >
          <Icon icon="mdi:flag-checkered" class="mr-1 text-sm" />
          <span v-if="!isMobile">结局</span>
        </a>
      </div>
      <div class="flex items-center gap-1">
        <div
          v-if="activeTabModel === 'preview'"
          class="tooltip tooltip-bottom"
          data-tip="刷新预览"
        >
          <button
            class="btn btn-ghost btn-xs"
            type="button"
            @click="emits('refresh-preview')"
          >
            <Icon icon="mdi:refresh" size="16px" />
          </button>
        </div>
        <div
          class="tooltip tooltip-bottom tooltip-end"
          data-tip="重置变量到初始状态"
        >
          <button
            class="btn btn-ghost btn-xs"
            type="button"
            @click="emits('reset-preview-vars')"
          >
            <Icon
              icon="material-symbols-light:reset-settings"
              size="16px"
            />
          </button>
        </div>
      </div>
    </div>

    <div v-if="activeTabModel === 'preview'" class="h-full flex flex-col flex-1 overflow-hidden">
      <SearchableSelect
        class="mb-2"
        v-model="previewPassageModel"
        :options="story.passages"
      />

      <StoryPlayView
        v-if="previewPassageModel"
        class="flex-1 overflow-auto"
        :external="true"
        :storyProp="story"
        :currentPassageProp="previewPassageModel"
        :variablesProp="variables"
        @update:variables="emits('update:variables', $event)"
        @update:currentPassage="emits('update:currentPassage', $event)"
      />
    </div>

    <div v-else-if="activeTabModel === 'vars'" class="h-full flex flex-col flex-1 overflow-hidden md:overflow-unset">
      <div class="mb-2">
        <input
          v-model="varFilter"
          placeholder="筛选变量"
          class="input input-sm w-full"
        />
      </div>

      <div class="space-y-2 text-sm flex-1 overflow-auto md:overflow-visible h-full">
        <div
          v-if="filteredVariableEntries.length === 0"
          class="text-base-content/60 h-full w-full flex flex-col items-center justify-center"
        >
          <Icon icon="fluent:border-none-20-regular" size="50px" />
          <span>暂无变量</span>
        </div>
        <div
          v-for="[key, value] in filteredVariableEntries"
          :key="key"
          class="flex items-center justify-between gap-2 rounded-lg bg-base-200 px-2 py-1"
        >
          <div class="flex-1">
            <div class="text-xs text-base-content/70">{{ key }}</div>
            <div class="truncate">{{ displayVar(value) }}</div>
          </div>
          <div class="flex items-center gap-2">
            <button
              class="btn btn-xs btn-ghost md:tooltip tooltip-end"
              data-tip="插入变量"
              type="button"
              @click="emits('insert-variable', key)"
            >
              <Icon icon="dashicons:insert" />
            </button>
            <div v-if="!builtinVariableNames.has(key)">
              <button
                class="btn btn-xs btn-ghost md:tooltip tooltip-end"
                data-tip="编辑变量"
                type="button"
                @click="emits('edit-variable', key)"
              >
                <Icon icon="dashicons:edit" />
              </button>
            </div>
            <div
              v-else
              class="md:tooltip tooltip-end"
              :data-tip="key + ' 为内置变量，不能编辑'"
            >
              <button
                class="btn btn-xs btn-ghost btn-square"
                type="button"
                disabled
              >
                <Icon icon="mdi:lock" class="text-sm" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="activeTabModel === 'points'" class="space-y-2 text-sm h-full flex flex-col overflow-auto flex-1">
      <section class="flex-1 overflow-auto">
        <div
          v-if="pointEntries.length === 0"
          class="text-base-content/60 h-full w-full flex flex-col items-center justify-center"
        >
          <Icon icon="fluent:border-none-20-regular" size="50px" />
          <span>暂无成就</span>
        </div>
        <div
          v-for="item in pointEntries"
          :key="`point-${item.name}`"
          class="rounded-lg bg-base-300 p-2"
        >
          <div class="text-xs text-base-content/70">{{ item.name }}</div>
          <div class="truncate">{{ item.description || '无描述' }}</div>
        </div>
      </section>
    </div>

    <div v-else class="space-y-2 text-sm h-full flex flex-col overflow-hidden flex-1">
      <section class="flex-1 overflow-auto space-y-2">
        <div
          v-if="endingEntries.length === 0"
          class="text-base-content/60 h-full w-full flex flex-col items-center justify-center"
        >
          <Icon icon="fluent:border-none-20-regular" size="50px" />
          <span>暂无结局</span>
        </div>
        <div
          v-for="item in endingEntries"
          :key="`ending-${item.name}`"
          class="rounded-lg bg-base-300 p-2"
        >
          <div class="text-xs text-base-content/70">{{ item.name }}</div>
          <div class="truncate">{{ item.description || '无描述' }}</div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import Icon from "@/components/Icon/src/Icon.vue";
import { extractStorySpecials } from "@/lib/storyEngine";
import StoryPlayView from "@/views/StoryPlayView.vue";
import { useAppStore } from "@/stores/modules/app";

type RightTab = "preview" | "vars" | "points" | "endings";

const props = defineProps<{
  story: any;
  variables: Record<string, unknown>;
  previewPassage: string;
  activeRightTab: RightTab;
}>();

const emits = defineEmits<{
  (e: "update:previewPassage", value: string): void;
  (e: "update:activeRightTab", value: RightTab): void;
  (e: "update:variables", value: Record<string, unknown>): void;
  (e: "update:currentPassage", value: string): void;
  (e: "refresh-preview"): void;
  (e: "reset-preview-vars"): void;
  (e: "insert-variable", key: string): void;
  (e: "edit-variable", key: string): void;
}>();

const activeTabModel = computed({
  get: () => props.activeRightTab,
  set: (value: RightTab) => emits("update:activeRightTab", value),
});

const previewPassageModel = computed({
  get: () => props.previewPassage,
  set: (value: string) => emits("update:previewPassage", value),
});

const varFilter = ref("");
const builtinVariableNames = new Set<string>(["passage", "storyTitle"]);

const filteredVariableEntries = computed(() => {
  const q = (varFilter.value || "").toLowerCase();
  return Object.entries(props.variables).filter(([k]) =>
    k.toLowerCase().includes(q),
  );
});

const specials = computed(() => extractStorySpecials(props.story));
const pointEntries = computed(() => specials.value.points);
const endingEntries = computed(() => specials.value.endings);

const displayVar = (value: unknown) => {
  if (value === null || value === undefined) return String(value);
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const isMobile = computed(() => useAppStore().isMobile);
</script>
