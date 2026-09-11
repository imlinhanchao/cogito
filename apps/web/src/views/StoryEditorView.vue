<template>
  <div class="h-full md:p-4 w-full">
    <div class="flex h-full md:gap-4">
      <aside
        class="hidden lg:block rounded-2xl border border-base-300 bg-base-100 p-3 shadow-sm min-w-70"
      >
        <div class="mb-3 flex items-center justify-between px-1">
          <h2 class="text-lg font-bold">段落列表</h2>
          <button
            v-if="!props.readOnly"
            class="btn btn-sm btn-primary"
            type="button"
            @click="addPassage"
          >
            新增
          </button>
        </div>

        <div class="mb-2">
          <input
            v-model="searchFilter"
            placeholder="通过名称或 tag 搜索..."
            class="input input-sm w-full"
          />
        </div>

        <div class="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto">
          <div
            v-for="passage in filteredPassages"
            :key="passage.name"
            class="flex items-center justify-between gap-2"
          >
            <button
              type="button"
              class="flex-1 flex items-center justify-between rounded-xl border px-3 py-2 text-left transition truncate"
              :class="
                selectedPassage === passage.name
                  ? 'border-primary bg-primary/10'
                  : 'border-base-300 bg-base-200 hover:border-primary/70'
              "
              @click="selectPassage(passage.name)"
            >
              <span class="truncate font-medium">{{ passage.name }}</span>
              <span class="space-x-2">
                <span class="badge badge-ghost badge-sm">{{
                  passage.tags?.length || 0
                }}</span>
                <Icon
                  icon="mdi:content-copy"
                  data-tip="复制段落名"
                  class="tooltip tooltip-left cursor-pointer"
                  size="12px"
                  @click.stop="copyPassageName(passage.name)"
                />
              </span>
            </button>
          </div>
        </div>
      </aside>

      <!-- 移动端段落抽屉 -->
      <div class="lg:hidden">
        <dialog
          ref="passageRef"
          class="modal modal-bottom sm:modal-middle w-screen"
        >
          <div class="modal-box h-[80vh] flex flex-col relative">
            <h3 class="font-bold text-lg pb-3">
              段落列表 ({{ filteredPassages.length }})
            </h3>
            <div class="mb-4">
              <input
                v-model="searchFilter"
                placeholder="搜索段落..."
                class="input input-bordered w-full"
              />
            </div>
            <div class="space-y-2 flex-1 overflow-y-auto">
              <button
                v-for="passage in filteredPassages"
                :key="passage.name"
                class="w-full text-left p-3 rounded-lg border"
                :class="
                  selectedPassage === passage.name
                    ? 'bg-primary/10 border-primary'
                    : 'bg-base-200'
                "
                @click="
                  selectPassage(passage.name);
                  passageRef?.close();
                "
              >
                {{ passage.name }}
              </button>
            </div>
            <div class="modal-action bottom-5 right-5 absolute">
              <form method="dialog">
                <button class="btn btn-circle btn-error btn-soft">
                  <Icon icon="mdi:close" class="text-lg" />
                </button>
              </form>
            </div>
          </div>
        </dialog>
      </div>

      <main
        class="rounded-2xl border border-base-300 bg-base-100 md:p-4 shadow-sm w-full"
      >
        <div
          class="mb-4 space-y-2.5 bg-base-200/40 p-3 rounded-xl border border-base-200"
        >
          <div
            v-if="props.readOnly && storyAny.status === 'rejected'"
            class="p-3 mb-2 rounded-lg bg-error/10 text-error text-sm border border-error/20"
          >
            <strong class="mr-2">已拒绝</strong>
            <span>{{ storyAny.reviewReason || "未填写拒绝理由" }}</span>
          </div>
          <div
            class="flex-wrap items-center justify-between gap-3"
            :class="{ flex: !isMobile }"
          >
            <div class="flex items-center gap-2 flex-1 min-w-60">
              <div class="lg:hidden">
                <button
                  class="btn btn-sm btn-square btn-ghost"
                  @click="passageRef?.showModal()"
                >
                  <Icon icon="mdi:menu" class="text-lg" />
                </button>
              </div>
              <input
                v-model="story.title"
                :readonly="props.readOnly"
                class="input input-bordered input-sm flex-1 font-bold text-base bg-base-100"
                placeholder="故事标题..."
              />
              <div class="lg:hidden">
                <button
                  class="btn btn-sm btn-square btn-ghost"
                  @click="
                    activeRightTab = 'preview';
                    (previewRef as any)?.showModal();
                  "
                >
                  <Icon icon="mdi:play-circle-outline" class="text-lg" />
                </button>
              </div>
            </div>
            <div
              class="flex items-center gap-1 md:shrink-0"
              :class="{ 'py-2 justify-around': isMobile }"
            >
              <template v-if="!props.readOnly">
                <div class="tooltip tooltip-bottom" data-tip="从剪贴板粘贴导入">
                  <button
                    class="btn btn-sm btn-ghost btn-square"
                    type="button"
                    @click="pasteImport"
                  >
                    <Icon icon="mdi:content-paste" size="16px" />
                  </button>
                </div>
                <div
                  class="tooltip tooltip-bottom"
                  data-tip="复制文本源码"
                >
                  <button
                    class="btn btn-sm btn-ghost btn-square"
                    type="button"
                    @click="copyStory"
                  >
                    <Icon icon="mdi:content-copy" size="16px" />
                  </button>
                </div>
                <div
                  class="tooltip tooltip-bottom"
                  data-tip="编译导出 HTML 文件"
                >
                  <button
                    class="btn btn-sm btn-ghost btn-square"
                    type="button"
                    @click="buildStory"
                  >
                    <Icon icon="mdi:hammer" size="16px" />
                  </button>
                </div>
              </template>
              <template v-if="!props.readOnly">
                <div class="tooltip tooltip-bottom" data-tip="试玩故事">
                  <button
                    class="btn btn-sm btn-ghost btn-secondary btn-circle"
                    type="button"
                    @click="$router.push(`/test/${currentStoryId}`)"
                  >
                    <Icon icon="mdi:play-circle-outline" size="16px" />
                  </button>
                </div>
                <div class="tooltip tooltip-bottom" data-tip="保存至服务器">
                  <button
                    class="btn btn-sm btn-primary btn-ghost btn-circle"
                    type="button"
                    :disabled="syntaxChecking || saveInProgress"
                    @click="saveToServer"
                  >
                    <Icon icon="mdi:content-save-outline" size="16px" />
                  </button>
                </div>
                <div
                  class="tooltip tooltip-bottom"
                  data-tip="提交审核"
                  v-if="currentStoryId"
                >
                  <button
                    class="btn btn-sm btn-ghost btn-accent btn-circle"
                    type="button"
                    @click="submitForReview"
                  >
                    <Icon icon="mdi:send" size="16px" />
                  </button>
                </div>
              </template>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <div
              class="flex-1 min-w-70 flex items-center gap-1.5 bg-base-100 rounded-lg px-2 border border-base-300 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition"
            >
              <Icon
                icon="mdi:text-box-outline"
                class="text-base text-base-content/50 shrink-0"
              />
              <input
                v-model="story.description"
                :readonly="props.readOnly"
                class="input input-sm border-none focus:outline-none w-full px-1"
                placeholder="故事描述/简述..."
              />
            </div>
            <div
              class="w-full sm:w-72 flex items-center gap-1.5 bg-base-100 rounded-lg px-2 border border-base-300 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition"
            >
              <Icon
                icon="mdi:tag-multiple-outline"
                class="text-base text-base-content/50 shrink-0"
              />
              <input
                v-model="storyTagsStr"
                :readonly="props.readOnly"
                class="input input-sm border-none focus:outline-none w-full px-1"
                placeholder="故事标签（逗号分隔，如: 奇幻, 动作）"
              />
            </div>
            <div class="w-44 sm:w-48 flex items-center gap-2">
              <Icon
                icon="mdi:map-marker"
                class="text-base text-base-content/50 shrink-0"
              />
              <select
                v-model="story.startPassage"
                :disabled="props.readOnly"
                class="select select-sm select-bordered w-full"
              >
                <option
                  v-for="p in story.passages"
                  :key="p.name"
                  :value="p.name"
                >
                  {{ p.name }}
                </option>
              </select>
            </div>
          </div>
        </div>

        <div class="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <StoryEditorPanel
            ref="editorPanel"
            :readOnly="props.readOnly"
            :story="story"
            :selectedPassage="selectedPassage"
            :content="selectedPassageContent"
            :tagEditValue="tagEditValue"
            :variables="variables"
            @update:content="(v) => (selectedPassageContent = v)"
            @save-tags="saveTags"
            @rename-passage="renamePassage"
            @delete-passage="deletePassage"
            @show-manual="() => (showManual = true)"
            @init-default="initDefaultStory"
          />

          <StoryRightPanel
            v-if="!isMobile"
            :story="story"
            :variables="variables"
            :previewPassage="previewPassage"
            :activeRightTab="activeRightTab"
            @update:previewPassage="previewPassage = $event"
            @update:activeRightTab="activeRightTab = $event"
            @update:variables="handleUpdateVariables($event)"
            @update:currentPassage="handleUpdateCurrentPassage($event)"
            @refresh-preview="refreshPreview"
            @reset-preview-vars="resetPreviewVars"
            @insert-variable="insertVariableToEditor"
            @edit-variable="openEditVar"
          />
        </div>
      </main>
    </div>
    <dialog
      v-if="isMobile"
      ref="previewRef"
      class="modal modal-bottom sm:modal-middle p-0"
    >
      <div class="modal-box h-[80vh] flex flex-col relative p-5!">
        <StoryRightPanel
          :story="story"
          :variables="variables"
          :previewPassage="previewPassage"
          :activeRightTab="activeRightTab"
          @update:previewPassage="previewPassage = $event"
          @update:activeRightTab="activeRightTab = $event"
          @update:variables="handleUpdateVariables($event)"
          @update:currentPassage="handleUpdateCurrentPassage($event)"
          @refresh-preview="refreshPreview"
          @reset-preview-vars="resetPreviewVars"
          @insert-variable="insertVariableToEditor"
          @edit-variable="openEditVar"
        />
        <div class="modal-action bottom-5 right-5 absolute">
          <form method="dialog">
            <button class="btn btn-circle btn-error btn-soft">
              <Icon icon="mdi:close" class="text-lg" />
            </button>
          </form>
        </div>
      </div>
    </dialog>
    <dialog id="json-editor-dialog" class="modal">
      <div class="modal-box w-screen md:w-11/12 max-w-3xl">
        <h3 class="text-lg font-bold">编辑变量 JSON</h3>
        <div class="py-4" ref="jsonEditorRef">
          <textarea style="width: 100%; height: 400px"></textarea>
        </div>
        <div class="modal-action">
          <button class="btn btn-ghost" type="button" @click="closeJsonEditor">
            取消
          </button>
          <button class="btn btn-primary" type="button" @click="saveEditedVar">
            保存
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button type="submit">close</button>
      </form>
    </dialog>
    <dialog id="paste-import-dialog" class="modal">
      <div class="modal-box w-screen md:w-11/12 max-w-3xl">
        <h3 class="text-lg font-bold">粘贴并导入故事源码</h3>
        <div class="py-4" ref="pasteEditorRef">
          <textarea style="width: 100%; height: 400px"></textarea>
        </div>
            <div class="py-2" v-if="showAppendToggle">
              <div class="flex items-center gap-2">
                <span class="text-sm">覆盖</span>
                <input
                  type="checkbox"
                  class="toggle toggle-primary"
                  v-model="appendMode"
                  aria-label="追加或覆盖"
                />
                <span class="text-sm">追加</span>
              </div>
            </div>
        <div class="modal-action">
          <button class="btn btn-ghost" type="button" @click="closePasteDialog">
            取消
          </button>
          <button
            class="btn btn-primary"
            type="button"
            @click="confirmPasteImport"
          >
            导入
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button type="submit">close</button>
      </form>
    </dialog>
    <dialog ref="syntaxDialogRef" class="modal" @cancel="onSyntaxDialogCancel">
      <div class="modal-box max-w-2xl">
        <h3 class="flex items-center gap-2 text-lg font-bold">
          <Icon
            icon="mdi:check-decagram-outline"
            class="text-xl text-primary"
          />
          语法检查
        </h3>

        <div
          v-if="syntaxChecking"
          class="flex flex-col items-center gap-3 py-10"
        >
          <span class="loading loading-spinner loading-lg text-primary"></span>
          <p class="text-sm text-base-content/70">正在检查语法…</p>
        </div>

        <template v-else>
          <div class="space-y-3 py-4">
            <div role="alert" class="alert alert-warning alert-soft">
              <Icon icon="mdi:alert-circle-outline" class="text-lg" />
              <span
                >发现
                {{ syntaxIssues.length }} 个语法问题，是否仍要继续保存？</span
              >
            </div>
            <ul class="max-h-80 space-y-2 overflow-y-auto pr-1">
              <li
                v-for="(issue, index) in syntaxIssues"
                :key="index"
                class="rounded-box border border-base-300 bg-base-200/50 p-3 text-sm"
              >
                <div class="flex flex-wrap items-center gap-2">
                  <span class="badge badge-warning badge-sm">{{
                    syntaxIssueLabel(issue.type)
                  }}</span>
                  <span class="font-medium">段落「{{ issue.passage }}」</span>
                  <span v-if="issue.line" class="text-base-content/60"
                    >第 {{ issue.line }} 行</span
                  >
                </div>
                <p class="mt-1 text-base-content/70">{{ issue.message }}</p>
              </li>
            </ul>
          </div>
          <div class="modal-action">
            <button class="btn" type="button" @click="cancelSyntaxSave">
              取消
            </button>
            <button
              class="btn btn-warning"
              type="button"
              @click="confirmSyntaxSave"
            >
              继续保存
            </button>
          </div>
        </template>
      </div>
    </dialog>
    <SyntaxManual v-if="showManual" @close="showManual = false" />
  </div>
</template>
<script setup lang="ts">
import {
  computed,
  onMounted,
  ref,
  nextTick,
  onBeforeUnmount,
  watch,
} from "vue";
import { useRouter, useRoute } from "vue-router";
import {
  getStory,
  createStory,
  updateStory,
  publishStory,
  IStory,
} from "@/api/stories";
import StoryPlayView from "@/views/StoryPlayView.vue";
import StoryEditorPanel from "@/components/StoryEditor/StoryEditorPanel.vue";
import StoryRightPanel from "@/components/StoryEditor/StoryRightPanel.vue";
import {
  createDefaultStory,
  createEmptyStory,
  parseStorySource,
  serializeStory,
  buildInitialVariables,
  checkStorySyntax,
  type StoryData,
  type StorySyntaxIssue,
  buildStandaloneExport,
} from "@/lib/storyEngine";
import {} from "@/lib/storyEngine";

// CodeMirror v5 for JSON editing
// CodeMirror v5 for JSON editing (used for modals/paste editor)
import CodeMirror from "codemirror";
import "codemirror/lib/codemirror.css";
import "codemirror/theme/dracula.css";
import "codemirror/mode/javascript/javascript";
// load simple mode addon for defining custom mode
import "codemirror/addon/mode/simple";
import msg from "@/components/msg";
import { useAppStore } from "@/stores/modules/app";
import { omit } from "lodash-es";
import msgbox from "@/components/msgbox";
import Icon from "@/components/Icon/src/Icon.vue";

const props = defineProps<{ readOnly?: boolean; initialStory?: any }>();

const appStore = useAppStore();
const isDark = computed(() => appStore.getTheme === "dark");
const isMobile = computed(() => appStore.isMobile);

const router = useRouter();
const passageRef = ref<HTMLDialogElement | null>(null);
const previewRef = ref<HTMLDialogElement | null>(null);
const jsonEditorRef = ref<HTMLDivElement | null>(null);
let cmInstance: any = null;
// CodeMirror instance for story editor
// story editor instance moved to StoryEditorPanel component
const editorPanel = ref<any | null>(null);
// CodeMirror instance for paste-import dialog
const pasteEditorRef = ref<HTMLDivElement | null>(null);
let cmPasteInstance: any = null;
const jsonEditorValue = ref("");
const editingVarName = ref("");
const showManual = ref(false);
const appendMode = ref(false);
const showAppendToggle = ref(false);

// 保存前的语法检查对话框状态
const syntaxDialogRef = ref<HTMLDialogElement | null>(null);
const syntaxChecking = ref(false);
const syntaxIssues = ref<StorySyntaxIssue[]>([]);
const saveInProgress = ref(false);

/** 语法问题类型 -> 中文标签 */
const SYNTAX_ISSUE_LABELS: Record<StorySyntaxIssue["type"], string> = {
  "dead-link": "死链",
  "orphan-passage": "孤立段落",
  "invalid-ending": "结局标记",
  "leftover-macro": "残留宏",
  "duplicate-passage": "重复段落名",
  "inconsistent-point-description": "成就描述不一致",
  "inconsistent-ending-description": "结局描述不一致",
};

const syntaxIssueLabel = (type: StorySyntaxIssue["type"]): string =>
  SYNTAX_ISSUE_LABELS[type] ?? type;

const story = ref<IStory>(createEmptyStory());
const storyAny = computed(() => story.value as any);
const route = useRoute();
const currentStoryId = ref<string | null>(null);
const selectedPassage = ref("");
const variables = ref<Record<string, unknown>>({});
const previewPassage = ref<string>("");
const selectedInsertVar = ref("");
const variableKeys = computed(() => Object.keys(variables.value));
const storyTagsStr = computed({
  get: () => (story.value.tags || []).join(","),
  set: (v: string) => {
    story.value.tags = (v || "")
      .replaceAll("，", ",")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  },
});
const activeRightTab = ref<"preview" | "vars" | "points" | "endings">(
  "preview",
);

const selectedPassageContent = computed({
  get: () => {
    const current =
      story.value.passages.find(
        (passage) => passage.name === selectedPassage.value,
      ) ?? story.value.passages[0];
    return current?.content ?? "";
  },
  set: (value: string) => {
    const current =
      story.value.passages.find(
        (passage) => passage.name === selectedPassage.value,
      ) ?? story.value.passages[0];
    if (!current) {
      return;
    }
    current.content = value;
  },
});

function insertJsGlobalSnippet() {
  if (props.readOnly) return;
  if (
    editorPanel.value &&
    typeof editorPanel.value.insertSnippet === "function"
  ) {
    editorPanel.value.insertSnippet(
      `(fn:\"myFunc\")[console.log(\"hello\"); return 123]`,
    );
  }
}

function insertCallSnippet() {
  if (props.readOnly) return;
  if (
    editorPanel.value &&
    typeof editorPanel.value.insertSnippet === "function"
  ) {
    editorPanel.value.insertSnippet(`(call:\"myFunc\")`);
  }
}

const insertVariableToEditor = (key: string) => {
  if (
    editorPanel.value &&
    typeof editorPanel.value.insertSnippet === "function"
  ) {
    editorPanel.value.insertSnippet(`$${key}`);
  }
};

const openEditVar = async (key: string) => {
  editingVarName.value = key;
  jsonEditorValue.value = JSON.stringify(variables.value[key], null, 2);
  // show modal
  await nextTick();
  const dlg = document.getElementById(
    "json-editor-dialog",
  ) as HTMLDialogElement | null;
  if (dlg) dlg.showModal();
  // init CodeMirror
  await nextTick();
  const currentTheme = isDark.value ? "dracula" : "default";
  if (jsonEditorRef.value && !cmInstance) {
    const textarea = jsonEditorRef.value.querySelector(
      "textarea",
    ) as HTMLTextAreaElement | null;
    if (textarea) {
      textarea.value = jsonEditorValue.value;
      cmInstance = CodeMirror.fromTextArea(textarea, {
        mode: { name: "javascript", json: true },
        theme: currentTheme,
        lineNumbers: true,
        tabSize: 2,
        autofocus: true,
      });
      cmInstance.setSize("100%", 400);
    }
  } else if (cmInstance) {
    cmInstance.setOption("theme", currentTheme);
    cmInstance.setValue(jsonEditorValue.value);
  }
};

const saveEditedVar = () => {
  if (!editingVarName.value) return;
  let raw = jsonEditorValue.value;
  if (cmInstance) raw = cmInstance.getValue();
  try {
    const parsed = JSON.parse(raw);
    variables.value[editingVarName.value] = parsed;
  } catch (e) {
    // fallback: treat as string
    variables.value[editingVarName.value] = raw;
  }
  const dlg = document.getElementById(
    "json-editor-dialog",
  ) as HTMLDialogElement | null;
  if (dlg) dlg.close();
};

const closeJsonEditor = () => {
  const dlg = document.getElementById(
    "json-editor-dialog",
  ) as HTMLDialogElement | null;
  if (dlg) dlg.close();
};

const refreshPreview = async () => {
  const current = previewPassage.value;
  previewPassage.value = "";
  await nextTick();
  previewPassage.value = current;
};

const resetPreviewVars = () => {
  variables.value = buildInitialVariables(story.value);
};

const insertSelectedVar = () => {
  if (!selectedInsertVar.value) return;
  if (
    editorPanel.value &&
    typeof editorPanel.value.insertSnippet === "function"
  ) {
    editorPanel.value.insertSnippet(`$${selectedInsertVar.value}`);
  }
};

onBeforeUnmount(() => {
  if (cmInstance) {
    try {
      cmInstance.toTextArea();
    } catch {}
    cmInstance = null;
  }
  if (cmPasteInstance) {
    try {
      cmPasteInstance.toTextArea();
    } catch {}
    cmPasteInstance = null;
  }
});

const handleUpdateVariables = (v: any) => {
  variables.value = v;
};

const handleUpdateCurrentPassage = (p: string) => {
  // save previous passage name into built-in variable before updating
  try {
    const prev = previewPassage.value;
    if (prev) variables.value.prevPassage = prev;
  } catch (e) {
    // ignore if variables object shape differs
  }
  previewPassage.value = p;
};

const ensurePassage = (name: string) => {
  const normalized = name.trim() || "Untitled";
  if (!story.value.passages.some((passage) => passage.name === normalized)) {
    story.value.passages.push({
      name: normalized,
      tags: [],
      content: "新段落内容",
    });
  }
  selectedPassage.value = normalized;
};

const addPassage = () => {
  const baseName = `Passage_${story.value.passages.length + 1}`;
  ensurePassage(baseName);
};

const importStory = () => {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".txt";
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseStorySource(text);
      if (!parsed || !parsed.passages || parsed.passages.length === 0) {
        window.alert("未检测到可导入的段落内容。");
        return;
      }
      story.value = parsed as StoryData;
      variables.value = buildInitialVariables(story.value);
      selectedPassage.value =
        story.value.startPassage ||
        story.value.passages[0]?.name ||
        selectedPassage.value;
      previewPassage.value = selectedPassage.value;
      refreshPreview();
      window.alert("导入成功");
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      window.alert("导入失败");
    }
  };
  // trigger file picker
  input.click();
};

const generateUniquePassageName = (base: string) => {
  let name = base.trim() || "Untitled";
  let i = 1;
  while (story.value.passages.some((p) => p.name === name)) {
    i += 1;
    name = `${base} (imported ${i})`;
  }
  return name;
};

const pasteImport = async () => {
  // Open paste dialog and load clipboard text into CodeMirror for user editing
  let clipboard = "";
  try {
    clipboard = await navigator.clipboard.readText();
  } catch (e) {
    // ignore clipboard errors, start with empty
  }
  await nextTick();
  const dlg = document.getElementById(
    "paste-import-dialog",
  ) as HTMLDialogElement | null;
  if (dlg) dlg.showModal();
  await nextTick();
  const currentTheme = isDark.value ? "dracula" : "default";
  if (pasteEditorRef.value && !cmPasteInstance) {
    const ta = pasteEditorRef.value.querySelector(
      "textarea",
    ) as HTMLTextAreaElement | null;
    if (ta) {
      ta.value = clipboard || "";
      cmPasteInstance = CodeMirror.fromTextArea(ta, {
        mode: "haideStory",
        theme: currentTheme,
        lineNumbers: true,
        lineWrapping: true,
        tabSize: 2,
      });
      cmPasteInstance.setSize("100%", 400);
      // show append toggle if content looks like a full story (:: header)
      showAppendToggle.value = (clipboard || "").trim().startsWith("::");
      cmPasteInstance.on &&
        cmPasteInstance.on("change", () => {
          try {
            const v = cmPasteInstance.getValue();
            showAppendToggle.value = (v || "").trim().startsWith("::");
          } catch (e) {
            // ignore
          }
        });
    }
  } else if (cmPasteInstance) {
    cmPasteInstance.setOption("theme", currentTheme);
    if (clipboard) cmPasteInstance.setValue(clipboard);
    showAppendToggle.value = (clipboard || "").trim().startsWith("::");
  }
};

const closePasteDialog = () => {
  const dlg = document.getElementById(
    "paste-import-dialog",
  ) as HTMLDialogElement | null;
  if (dlg) dlg.close();
  if (cmPasteInstance) {
    try {
      cmPasteInstance.toTextArea();
    } catch {}
    cmPasteInstance = null;
  }
  // reset append toggle state
  appendMode.value = false;
  showAppendToggle.value = false;
};

const confirmPasteImport = () => {
  let raw = "";
  if (cmPasteInstance) raw = cmPasteInstance.getValue();
  else {
    const ta = pasteEditorRef.value?.querySelector(
      "textarea",
    ) as HTMLTextAreaElement | null;
    raw = ta?.value || "";
  }
  if (!raw || !raw.trim()) {
    msg.error("未检测到可导入的文本。");
    return;
  }
  try {
    const parsed = parseStorySource(raw);
    if (!parsed || !parsed.passages || parsed.passages.length === 0) {
      msg.error("未检测到可导入的段落内容。");
      return;
    }
    let added = 0;
    if (!appendMode.value) {
      // overwrite metadata and passages
      story.value.title = parsed.title || story.value.title;
      story.value.startPassage = parsed.startPassage || story.value.startPassage;
      story.value.tags = parsed.tags || story.value.tags;
      story.value.description = parsed.description || story.value.description;
      story.value.passages = [];
      for (const p of parsed.passages) {
        const toAdd = { ...p };
        story.value.passages.push(toAdd);
        added += 1;
      }
    } else {
      // append: keep existing metadata, add new passages, avoid name conflicts
      for (const p of parsed.passages) {
        const exists = story.value.passages.some((q) => q.name === p.name);
        const toAdd = { ...p };
        if (exists) toAdd.name = generateUniquePassageName(p.name);
        story.value.passages.push(toAdd);
        added += 1;
      }
    }
    story.value.passages = normalizePassageTags(story.value.passages);
    const newVars = buildInitialVariables(story.value);
    for (const [k, v] of Object.entries(newVars)) {
      if (variables.value[k] === undefined) variables.value[k] = v;
    }
    if (added > 0)
      selectedPassage.value =
        story.value.passages[story.value.passages.length - added].name;
    msg.success(`已从粘贴文本导入 ${added} 个段落。`);
    closePasteDialog();
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    msg.error("导入失败，请检查文本格式。");
  }
};

function normalizePassageTags(passages: any[]) {
  if (!passages) return [];
  for (const p of passages) {
    if (p.tags == null) {
      p.tags = [];
    } else if (!Array.isArray(p.tags)) {
      p.tags = String(p.tags)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }
  return passages;
}

const copyStory = () => {
  const source = serializeStory(story.value);
  try {
    navigator.clipboard.writeText(source);
    msg.success("已复制文本源码到剪贴板。");
  } catch (e) {
    console.error(e);
    msg.error("复制失败，请手动复制。");
  }
};

const buildStory = () => {
  const source = buildStandaloneExport(
    story.value,
    variables.value,
    selectedPassage.value,
  );
  const blob = new Blob([source], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${(story.value.title || "story").replace(/\s+/g, "-")}.html`;
  anchor.click();
  URL.revokeObjectURL(url);
};

const saveDraft = () => {
  localStorage.setItem("haide-story-draft", JSON.stringify(story.value));
};

/**
 * 保存前先做一次语法检查：弹出对话框显示 loading，检查完成后
 * - 无问题：关闭对话框并直接保存；
 * - 有问题：列出问题，等待用户选择「继续保存」或「取消」。
 */
const saveToServer = async () => {
  if (syntaxChecking.value || saveInProgress.value) {
    return;
  }
  syntaxIssues.value = [];
  syntaxChecking.value = true;
  const dialog = syntaxDialogRef.value;
  if (dialog && !dialog.open) {
    dialog.showModal();
  }

  // 先让 loading 状态渲染一帧，再执行（同步的）语法检查
  await nextTick();
  await new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => resolve(null));
    } else {
      setTimeout(resolve, 0);
    }
  });

  let issues: StorySyntaxIssue[] = [];
  try {
    issues = checkStorySyntax(story.value as unknown as StoryData);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error("[StoryEditor] syntax check failed", e);
  }
  syntaxIssues.value = issues;
  syntaxChecking.value = false;

  if (!issues.length) {
    closeSyntaxDialog();
    await performSave();
  }
};

const closeSyntaxDialog = () => {
  const dialog = syntaxDialogRef.value;
  if (dialog?.open) {
    dialog.close();
  }
};

/** 检查进行中禁止关闭；检查完成后按 ESC 等同于「取消」。 */
const onSyntaxDialogCancel = (event: Event) => {
  if (syntaxChecking.value) {
    event.preventDefault();
    return;
  }
  syntaxIssues.value = [];
};

const cancelSyntaxSave = () => {
  syntaxIssues.value = [];
  closeSyntaxDialog();
};

const confirmSyntaxSave = async () => {
  closeSyntaxDialog();
  await performSave();
};

/** 真正执行服务端保存，失败时回退到本地草稿。 */
const performSave = async () => {
  if (saveInProgress.value) {
    return;
  }
  saveInProgress.value = true;
  // Create payload compatible with server CreateStoryDto: title + content
  const payload = {
    ...omit(story.value, ["passages", "author"]),
    content: serializeStory(story.value),
    passageSize: story.value.passages.length,
  };
  try {
    if (currentStoryId.value) {
      await updateStory(currentStoryId.value, payload);
      msg.success("已保存");
    } else {
      const res = await createStory(payload);
      const newId = res?.id;
      if (newId) {
        currentStoryId.value = newId;
        // navigate to editor with id
        router.replace({ name: "story-editor", params: { storyId: newId } });
      }
      msg.success("已保存");
    }
    localStorage.removeItem("haide-story-draft");
  } catch (e) {
    // fallback to local save
    saveDraft();
    msg.error("保存到服务器失败，已保存到本地草稿");
  } finally {
    saveInProgress.value = false;
  }
};

const submitForReview = async () => {
  if (!currentStoryId.value) {
    msg.error("请先保存故事到服务器再提交审核");
    return;
  }
  try {
    await publishStory(currentStoryId.value);
    msg.success("已提交审核");
  } catch (e) {
    msg.error("提交审核失败");
  }
};

const selectPassage = (name: string) => {
  selectedPassage.value = name;
};

// keep tag editor sync with selected passage
watch(selectedPassage, () => {
  const p = story.value.passages.find((x) => x.name === selectedPassage.value);
  tagEditValue.value = (p?.tags || []).join(", ");
});

// Ensure startPassage remains valid when passages change (add/rename/delete/import)
watch(
  () => story.value.passages.map((p) => p.name),
  (names) => {
    if (
      !story.value.startPassage ||
      !names.includes(story.value.startPassage)
    ) {
      story.value.startPassage = names[0] ?? "Start";
    }
  },
  { immediate: true },
);

const renamePassage = async () => {
  const current = story.value.passages.find(
    (passage) => passage.name === selectedPassage.value,
  );
  if (!current) {
    return;
  }
  const oldName = current.name;
  const nextName = await msgbox.prompt("新段落名：", "重命名", {
    inputValue: current.name,
  });
  if (!nextName || !nextName.trim()) {
    return;
  }
  current.name = nextName.trim();
  selectedPassage.value = current.name;
  if (story.value.startPassage === oldName) {
    story.value.startPassage = current.name;
  }
};

const deletePassage = () => {
  if (story.value.passages.length <= 1) {
    return;
  }
  const toDelete = selectedPassage.value;
  story.value.passages = story.value.passages.filter(
    (passage) => passage.name !== toDelete,
  );
  // if startPassage was deleted, reset it to first
  if (story.value.startPassage === toDelete) {
    story.value.startPassage = story.value.passages[0]?.name ?? "Start";
  }
  selectedPassage.value = story.value.passages[0].name;
};

const copyPassageName = async (name: string) => {
  if (!name) return;
  try {
    await navigator.clipboard.writeText(name);
  } catch {
    // fallback for environments without clipboard API
    // eslint-disable-next-line no-alert
    window.prompt("请复制段落名：", name);
  }
};

const searchFilter = ref("");
const tagEditValue = ref("");

const filteredPassages = computed(() => {
  const q = (searchFilter.value || "").trim().toLowerCase();
  if (!q) return story.value.passages;
  return story.value.passages.filter((p) => {
    if (p.name.toLowerCase().includes(q)) return true;
    for (const t of p.tags || []) if (t.toLowerCase().includes(q)) return true;
    return false;
  });
});

const saveTags = () => {
  const p = story.value.passages.find((x) => x.name === selectedPassage.value);
  if (!p) return;
  p.tags = (tagEditValue.value || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
};

onMounted(() => {
  // if initialStory provided (read-only preview), use it directly
  if (props.initialStory) {
    try {
      const data = props.initialStory;
      currentStoryId.value = data.id;
      data.tags = data.tags?.split ? data.tags.split(",") : data.tags;
      story.value = data as any;
      story.value.passages = normalizePassageTags(
        parseStorySource(data.content).passages,
      );
      variables.value = buildInitialVariables(story.value);
      selectedPassage.value =
        story.value.startPassage ||
        story.value.passages[0]?.name ||
        selectedPassage.value;
      previewPassage.value = selectedPassage.value;
      refreshPreview();
    } catch {
      // ignore
    }
    return;
  }

  init();
});

function init() {
  const draft = localStorage.getItem("haide-story-draft");
  if (draft) {
    try {
      story.value = JSON.parse(draft) as StoryData;
      selectedPassage.value = story.value.passages[0]?.name ?? "Start";
    } catch {
      story.value = createEmptyStory();
    }
  }

  variables.value = buildInitialVariables(story.value);
  previewPassage.value =
    selectedPassage.value || story.value.passages[0]?.name || "Start";
  // load story if id provided
  const sid = (route.params.storyId as string) || null;
  if (sid) {
    currentStoryId.value = sid;
    getStory(sid)
      .then((data) => {
        if (data) {
          data.tags = data.tags?.split ? data.tags.split(",") : data.tags;
          story.value = data;
          story.value.passages = normalizePassageTags(
            parseStorySource(data.content).passages,
          );
          variables.value = buildInitialVariables(story.value);
          selectedPassage.value =
            story.value.startPassage ||
            story.value.passages[0]?.name ||
            selectedPassage.value;
          previewPassage.value = selectedPassage.value;
          refreshPreview();
        }
      })
      .catch(() => {});
  } else {
    selectedPassage.value =
      story.value.startPassage || story.value.passages[0]?.name || "Start";
  }
}

// Define a simple custom mode for our story syntax using simple mode
// tokens: header (:: name), macro ( (set:) (if:) (print:) etc), link [[...]], jsfn (fn: call:), style tag, strings
// Story editor is initialized inside StoryEditorPanel component.

async function initDefaultStory() {
  if (await msgbox.confirm("是否初始化默认故事？将会覆盖当前所有内容！")) {
    story.value = createDefaultStory();
    variables.value = buildInitialVariables(story.value);
    selectedPassage.value =
      story.value.startPassage || story.value.passages[0]?.name || "Start";
    previewPassage.value = selectedPassage.value;
    refreshPreview();
  }
}
</script>

<style scoped>
/* Basic styling for custom CodeMirror tokens */
.cm-s-default .cm-header {
  color: #0f172a;
  font-weight: 600;
}
.cm-s-dracula .cm-header {
  color: #8be9fd;
  font-weight: 600;
}
.cm-header {
  font-weight: 600;
}
.cm-keyword {
  color: #7c3aed;
}
.cm-link {
  color: #0366d6;
  text-decoration: underline;
}
.cm-style-tag {
  color: #b58900;
}
.cm-variable-2 {
  color: #b85252;
}
.cm-string {
  color: #16a34a;
}
.cm-comment {
  color: #6b7280;
  font-style: italic;
}
</style>
