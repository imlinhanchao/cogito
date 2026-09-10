<template>
  <div class="space-y-4 rounded-xl border border-base-300 bg-base-200/50 md:p-3">
    <div class="mb-2 flex items-center justify-between">
      <div class="tabs tabs-boxed bg-base-200 p-0.5">
        <a
          :class="[
            'tab tab-xs font-semibold',
            activeTabModel === 'preview' ? 'tab-active' : '',
          ]"
          @click.prevent="activeTabModel = 'preview'"
        >
          <Icon icon="mdi:play-circle-outline" class="mr-1 text-sm" />预览
        </a>
        <a
          :class="[
            'tab tab-xs font-semibold',
            activeTabModel === 'vars' ? 'tab-active' : '',
          ]"
          @click.prevent="activeTabModel = 'vars'"
        >
          <Icon icon="mdi:variable" class="mr-1 text-sm" />变量
        </a>
        <a
          :class="[
            'tab tab-xs font-semibold',
            activeTabModel === 'points' ? 'tab-active' : '',
          ]"
          @click.prevent="activeTabModel = 'points'"
        >
          <Icon icon="mdi:star-circle-outline" class="mr-1 text-sm" />成就
        </a>
        <a
          :class="[
            'tab tab-xs font-semibold',
            activeTabModel === 'endings' ? 'tab-active' : '',
          ]"
          @click.prevent="activeTabModel = 'endings'"
        >
          <Icon icon="mdi:flag-checkered" class="mr-1 text-sm" />结局
        </a>
      </div>
      <div class="flex items-center gap-1">
        <select
          v-if="activeTabModel === 'preview'"
          v-model="previewPassageModel"
          class="select select-xs select-bordered"
        >
          <option
            v-for="p in story.passages"
            :key="p.name"
            :value="p.name"
          >
            {{ p.name }}
          </option>
        </select>
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

    <div v-if="activeTabModel === 'preview'">
      <StoryPlayView
        v-if="previewPassageModel"
        :external="true"
        :storyProp="story"
        :currentPassageProp="previewPassageModel"
        :variablesProp="variables"
        @update:variables="emits('update:variables', $event)"
        @update:currentPassage="emits('update:currentPassage', $event)"
      />
    </div>

    <div v-else-if="activeTabModel === 'vars'">
      <div class="mb-2">
        <input
          v-model="varFilter"
          placeholder="筛选变量"
          class="input input-sm w-full"
        />
      </div>

      <div class="space-y-2 text-sm">
        <div
          v-if="filteredVariableEntries.length === 0"
          class="text-base-content/60"
        >
          暂无变量
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
              class="btn btn-xs btn-ghost tooltip"
              data-tip="插入变量"
              type="button"
              @click="emits('insert-variable', key)"
            >
              <Icon icon="dashicons:insert" />
            </button>
            <div v-if="!builtinVariableNames.has(key)">
              <button
                class="btn btn-xs btn-ghost tooltip"
                data-tip="编辑变量"
                type="button"
                @click="emits('edit-variable', key)"
              >
                <Icon icon="dashicons:edit" />
              </button>
            </div>
            <div
              v-else
              class="tooltip"
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

    <div v-else-if="activeTabModel === 'points'" class="space-y-2 text-sm">
      <div
        v-if="pointEntries.length === 0"
        class="text-base-content/60"
      >
        暂无成就
      </div>
      <div
        v-for="item in pointEntries"
        :key="`point-${item.name}`"
        class="rounded-lg bg-base-300 p-2"
      >
        <div class="text-xs text-base-content/70">{{ item.name }}</div>
        <div class="truncate">{{ item.description || '无描述' }}</div>
      </div>
    </div>

    <div v-else class="space-y-2 text-sm">
      <div
        v-if="endingEntries.length === 0"
        class="text-base-content/60"
      >
        暂无结局
      </div>
      <div
        v-for="item in endingEntries"
        :key="`ending-${item.name}`"
        class="rounded-lg bg-base-300 p-2"
      >
        <div class="text-xs text-base-content/70">{{ item.name }}</div>
        <div class="truncate">{{ item.description || '无描述' }}</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import Icon from "@/components/Icon/src/Icon.vue";
import { extractStorySpecials } from "@/lib/storyEngine";
import StoryPlayView from "@/views/StoryPlayView.vue";

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
</script>
