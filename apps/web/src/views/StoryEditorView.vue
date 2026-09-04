<template>
  <div class="story-shell h-full p-4">
    <div class="grid h-full gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
      <aside
        class="rounded-2xl border border-base-300 bg-base-100 p-3 shadow-sm"
      >
        <div class="mb-3 flex items-center justify-between px-1">
          <h2 class="text-lg font-bold">段落列表</h2>
          <button
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

        <div class="space-y-2">
          <div
            v-for="passage in filteredPassages"
            :key="passage.name"
            class="flex items-center justify-between gap-2"
          >
            <button
              type="button"
              class="flex-1 flex items-center justify-between rounded-xl border px-3 py-2 text-left transition"
              :class="
                selectedPassage === passage.name
                  ? 'border-primary bg-primary/10'
                  : 'border-base-300 bg-base-200 hover:border-primary/70'
              "
              @click="selectPassage(passage.name)"
            >
              <span class="truncate font-medium">{{ passage.name }}</span>
              <span class="badge badge-ghost badge-sm">{{
                passage.tags.length || 0
              }}</span>
            </button>
            <div class="flex items-center gap-1">
              <button
                class="btn btn-xs btn-ghost btn-square tooltip tooltip-left"
                data-tip="复制段落名"
                type="button"
                @click.stop="copyPassageName(passage.name)"
              >
                <Icon icon="mdi:content-copy" class="text-sm" />
              </button>
            </div>
          </div>
        </div>
      </aside>

      <main
        class="rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm"
      >
        <div class="mb-4 space-y-2.5 bg-base-200/40 p-3 rounded-xl border border-base-200">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <input
              v-model="story.title"
              class="input input-bordered input-sm flex-1 min-w-60 font-bold text-base bg-base-100"
              placeholder="故事标题..."
            />
            <div class="flex items-center gap-1 shrink-0">
              <div class="tooltip tooltip-bottom" data-tip="导入文件 (.txt/.json/.html)">
                <button class="btn btn-sm btn-ghost btn-square" type="button" @click="importStory">
                  <Icon icon="mdi:file-upload-outline" class="text-lg" />
                </button>
              </div>
              <div class="tooltip tooltip-bottom" data-tip="从剪贴板粘贴导入">
                <button class="btn btn-sm btn-ghost btn-square" type="button" @click="pasteImport">
                  <Icon icon="mdi:content-paste" class="text-lg" />
                </button>
              </div>
              <div class="tooltip tooltip-bottom" data-tip="导出文本源码 (.txt)">
                <button class="btn btn-sm btn-ghost btn-square" type="button" @click="exportStory">
                  <Icon icon="mdi:file-download-outline" class="text-lg" />
                </button>
              </div>
              <div class="tooltip tooltip-bottom" data-tip="编译导出 HTML 文件">
                <button class="btn btn-sm btn-ghost btn-square" type="button" @click="buildStory">
                  <Icon icon="mdi:hammer" class="text-lg" />
                </button>
              </div>
              <div class="divider divider-horizontal my-1 mx-0.5"></div>
              <div class="tooltip tooltip-bottom" data-tip="保存至服务器">
                <button class="btn btn-sm btn-primary shadow-xs gap-1" type="button" @click="saveToServer">
                  <Icon icon="mdi:content-save-outline" class="text-base" />
                  <span>保存</span>
                </button>
              </div>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <div class="flex-1 min-w-70 flex items-center gap-1.5 bg-base-100 rounded-lg px-2 border border-base-300 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition">
              <Icon icon="mdi:text-box-outline" class="text-base text-base-content/50 shrink-0" />
              <input
                v-model="story.description"
                class="input input-sm border-none focus:outline-none w-full px-1"
                placeholder="故事描述/简述..."
              />
            </div>
            <div class="w-full sm:w-72 flex items-center gap-1.5 bg-base-100 rounded-lg px-2 border border-base-300 focus-within:border-primary focus-within:ring-1 focus-within:ring-primary transition">
              <Icon icon="mdi:tag-multiple-outline" class="text-base text-base-content/50 shrink-0" />
              <input
                v-model="storyTagsStr"
                class="input input-sm border-none focus:outline-none w-full px-1"
                placeholder="故事标签（逗号分隔，如: 奇幻, 动作）"
              />
            </div>
          </div>
        </div>

        <div class="tools mb-4 flex flex-wrap gap-1 items-center bg-base-200/60 p-1.5 rounded-xl border border-base-200">
          <div class="tooltip tooltip-bottom" data-tip="插入链接 [[段落|显示]]">
            <button class="btn btn-sm btn-ghost btn-square" type="button" @click="insertSnippet('[[' + selectedPassage + '|]]')">
              <Icon icon="mdi:link-variant" class="text-lg" />
            </button>
          </div>

          <div class="tooltip tooltip-bottom" data-tip="插入条件分支 (if:)">
            <button class="btn btn-sm btn-ghost btn-square" type="button" @click="insertSnippet('(if: $var > 0)[文本](else:)[文本]')">
              <Icon icon="mdi:source-branch" class="text-lg" />
            </button>
          </div>

          <div class="tooltip tooltip-bottom" data-tip="变量赋值 (set:)">
            <button class="btn btn-sm btn-ghost btn-square" type="button" @click="insertSnippet('(set: $score to $score + 1)')">
              <Icon icon="mdi:plus-box-outline" class="text-lg" />
            </button>
          </div>

          <div class="tooltip tooltip-bottom" data-tip="打印变量 (print:)">
            <button class="btn btn-sm btn-ghost btn-square" type="button" @click="insertSnippet('(print: $score)')">
              <Icon icon="mdi:code-json" class="text-lg" />
            </button>
          </div>

          <div class="divider divider-horizontal my-1 mx-0.5"></div>

          <div class="tooltip tooltip-bottom" data-tip="粗体 ''文字''">
            <button class="btn btn-sm btn-ghost btn-square" type="button" @click="wrapSelection(`''`, `''`)">
              <Icon icon="mdi:format-bold" class="text-lg" />
            </button>
          </div>

          <div class="tooltip tooltip-bottom" data-tip="斜体 //文字//">
            <button class="btn btn-sm btn-ghost btn-square" type="button" @click="wrapSelection(`//`, `//`)">
              <Icon icon="mdi:format-italic" class="text-lg" />
            </button>
          </div>

          <div class="tooltip tooltip-bottom" data-tip="删除线 ~~文字~~">
            <button class="btn btn-sm btn-ghost btn-square" type="button" @click="wrapSelection(`~~`, `~~`)">
              <Icon icon="mdi:format-strikethrough" class="text-lg" />
            </button>
          </div>

          <div class="tooltip tooltip-bottom" data-tip="上标 ^^文字^^">
            <button class="btn btn-sm btn-ghost btn-square" type="button" @click="wrapSelection(`^^`, `^^`)">
              <Icon icon="mdi:format-superscript" class="text-lg" />
            </button>
          </div>

          <div class="tooltip tooltip-bottom" data-tip="下标 ,,文字,,">
            <button class="btn btn-sm btn-ghost btn-square" type="button" @click="wrapSelection(',,', ',,')">
              <Icon icon="mdi:format-subscript" class="text-lg" />
            </button>
          </div>

          <div class="divider divider-horizontal my-1 mx-0.5"></div>

          <div class="tooltip tooltip-bottom" data-tip="嵌入段落 (display:)">
            <button class="btn btn-sm btn-ghost btn-square" type="button" @click='insertSnippet(`(display: "Intro")`)'>
              <Icon icon="mdi:file-replace-outline" class="text-lg" />
            </button>
          </div>

          <div class="tooltip tooltip-bottom" data-tip="插入全局 JS 函数 (fn:)">
            <button class="btn btn-sm btn-ghost btn-square" type="button" @click="insertJsGlobalSnippet">
              <Icon icon="mdi:code-braces" class="text-lg" />
            </button>
          </div>

          <div class="tooltip tooltip-bottom" data-tip="调用 JS 函数 (call:)">
            <button class="btn btn-sm btn-ghost btn-square" type="button" @click="insertCallSnippet">
              <Icon icon="mdi:play-circle-outline" class="text-lg" />
            </button>
          </div>

          <div class="tooltip tooltip-bottom" data-tip="插入 CSS 样式块 <style>">
            <button class="btn btn-sm btn-ghost btn-square" type="button" @click='insertSnippet(`<style>\n.demo-callout { padding: 0.5rem; }\n</style>`)'>
              <Icon icon="mdi:language-css3" class="text-lg" />
            </button>
          </div>
          <div class="tooltip tooltip-bottom" data-tip="显示语法说明书">
            <button class="btn btn-sm btn-ghost btn-square" type="button" @click="showManual = true">
              <Icon icon="mdi:book-open-variant" class="text-lg" />
            </button>
          </div>
        </div>

        <div class="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div class="rounded-xl border border-base-300 bg-base-200/50 p-3">
            <div class="mb-2 flex items-center justify-between">
              <div class="flex items-center gap-2">
                <label class="text-sm font-bold flex items-center gap-1">
                  <Icon icon="mdi:square-edit-outline" class="text-base text-primary" />
                  <span>段落编辑</span>
                </label>
                <span class="badge badge-neutral badge-sm font-mono">{{ selectedPassage }}</span>
              </div>
              <div class="flex items-center gap-1">
                <div class="tooltip tooltip-bottom" data-tip="重命名当前段落">
                  <button
                    class="btn btn-xs btn-ghost btn-square"
                    type="button"
                    @click="renamePassage"
                  >
                    <Icon icon="mdi:pencil-outline" class="text-base" />
                  </button>
                </div>
                <div class="tooltip tooltip-bottom" data-tip="删除当前段落">
                  <button
                    class="btn btn-xs btn-ghost btn-square text-error"
                    type="button"
                    @click="deletePassage"
                  >
                    <Icon icon="mdi:trash-can-outline" class="text-base" />
                  </button>
                </div>
              </div>
            </div>
            <textarea
              v-model="selectedPassageContent"
              class="h-105 w-full resize-none rounded-xl border border-base-300 bg-base-100 p-3 font-mono text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
              spellcheck="false"
            />
            <div class="mt-3 flex items-center gap-2">
              <label class="text-xs text-base-content/70 flex items-center gap-1">
                <Icon icon="mdi:tag-multiple-outline" class="text-sm" />
                <span>Tags：</span>
              </label>
              <input
                v-model="tagEditValue"
                class="input input-sm flex-1 input-bordered"
                placeholder="逗号分隔段落标签"
              />
              <button
                class="btn btn-xs btn-primary gap-1"
                type="button"
                @click="saveTags"
              >
                <Icon icon="mdi:check" class="text-sm" />
                <span>保存标签</span>
              </button>
            </div>
          </div>

          <div class="space-y-4 rounded-xl border border-base-300 bg-base-200/50 p-3">
            <div class="flex items-center justify-between mb-2">
              <div class="tabs tabs-boxed bg-base-200 p-0.5">
                <a :class="['tab tab-xs font-semibold', activeRightTab === 'preview' ? 'tab-active' : '']" @click.prevent="activeRightTab = 'preview'">
                  <Icon icon="mdi:play-circle-outline" class="mr-1 text-sm" />预览
                </a>
                <a :class="['tab tab-xs font-semibold', activeRightTab === 'vars' ? 'tab-active' : '']" @click.prevent="activeRightTab = 'vars'">
                  <Icon icon="mdi:variable" class="mr-1 text-sm" />变量
                </a>
              </div>
              <div class="flex items-center gap-1">
                <select v-if="activeRightTab === 'preview'" v-model="previewPassage" class="select select-xs select-bordered">
                  <option v-for="p in story.passages" :key="p.name" :value="p.name">{{ p.name }}</option>
                </select>
                <div v-if="activeRightTab === 'preview'" class="tooltip tooltip-bottom" data-tip="刷新预览">
                  <button class="btn btn-ghost btn-xs" type="button" @click="refreshPreview">
                    <Icon icon="mdi:refresh" size="16px" />
                  </button>
                </div>
                <div class="tooltip tooltip-bottom" data-tip="重置变量到初始状态">
                  <button class="btn btn-ghost btn-xs" type="button" @click="resetPreviewVars">
                    <Icon icon="material-symbols-light:reset-settings" size="16px" />
                  </button>
                </div>
              </div>
            </div>

            <div v-if="activeRightTab === 'preview'">
              <StoryPlayView
                :external="true"
                :storyProp="story"
                :currentPassageProp="previewPassage"
                :variablesProp="variables"
                @update:variables="handleUpdateVariables($event)"
                @update:currentPassage="handleUpdateCurrentPassage($event)"
              />
            </div>

            <div v-else>
              <div class="mb-2">
                <input v-model="varFilter" placeholder="筛选变量" class="input input-sm w-full" />
              </div>

              <div class="space-y-2 text-sm">
                <div v-if="filteredVariableEntries.length === 0" class="text-base-content/60">暂无变量</div>
                <div v-for="([key, value]) in filteredVariableEntries" :key="key" class="flex items-center justify-between gap-2 rounded-lg bg-base-200 px-2 py-1">
                  <div class="flex-1">
                    <div class="text-xs text-base-content/70">{{ key }}</div>
                    <div class="truncate">{{ displayVar(value) }}</div>
                  </div>
                  <div class="flex items-center gap-2">
                    <button class="btn btn-xs btn-ghost tooltip" data-tip="插入变量"  type="button" @click="insertVariableToEditor(key)">
                      <Icon icon="dashicons:insert" />
                    </button>
                    <div v-if="!builtinVariableNames.has(key)">
                      <button class="btn btn-xs btn-ghost tooltip" data-tip="编辑变量" type="button" @click="openEditVar(key)">
                        <Icon icon="dashicons:edit" />
                      </button>
                    </div>
                    <div v-else class="tooltip" :data-tip="key + ' 为内置变量，不能编辑'">
                      <button class="btn btn-xs btn-ghost btn-square" type="button" disabled>
                        <Icon icon="mdi:lock" class="text-sm" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>

    <dialog id="json-editor-dialog" class="modal">
      <div class="modal-box w-11/12 max-w-3xl">
        <h3 class="text-lg font-bold">编辑变量 JSON</h3>
        <div class="py-4" ref="jsonEditorRef">
          <textarea style="width:100%;height:400px;"></textarea>
        </div>
        <div class="modal-action">
          <button class="btn btn-ghost" type="button" @click="closeJsonEditor">取消</button>
          <button class="btn btn-primary" type="button" @click="saveEditedVar">保存</button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop"><button type="submit">close</button></form>
    </dialog>
    <SyntaxManual v-if="showManual" @close="showManual = false" />
  </div>
</template>
<script setup lang="ts">
import { computed, onMounted, ref, nextTick, onBeforeUnmount, watch } from "vue";
import { useRouter, useRoute } from "vue-router";
import { getStory, createStory, updateStory } from "@/api/stories";
import StoryPlayView from "@/views/StoryPlayView.vue";
import {
  createDefaultStory,
  parseStorySource,
  serializeStory,
  buildInitialVariables,
  type StoryData,
  buildStandaloneExport,
} from "@/lib/storyEngine";
import {} from "@/lib/storyEngine";

// CodeMirror v5 for JSON editing
import CodeMirror from "codemirror";
import "codemirror/lib/codemirror.css";
import "codemirror/theme/dracula.css";
import "codemirror/mode/javascript/javascript";
import msg from "@/components/msg";
import { useAppStore } from "@/stores/modules/app";
import { omit } from "lodash-es";
import SyntaxManual from "@/components/SyntaxManual.vue";

const appStore = useAppStore();
const isDark = computed(() => appStore.getTheme === "dark");

const router = useRouter();
const dialogRef = ref<HTMLDialogElement | null>(null);
const jsonEditorRef = ref<HTMLDivElement | null>(null);
const cmInstance = ref<any>(null);
const jsonEditorValue = ref("");
const editingVarName = ref("");
const showManual = ref(false);

const story = ref<StoryData>(createDefaultStory());
const route = useRoute();
const currentStoryId = ref<string | null>(null);
const selectedPassage = ref("Start");
const variables = ref<Record<string, unknown>>({});
const previewPassage = ref<string>("Start");
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
const activeRightTab = ref<'preview'|'vars'>('preview');
const varFilter = ref("");
const filteredVariableEntries = computed(() => {
  const q = (varFilter.value || "").toLowerCase();
  return Object.entries(variables.value).filter(([k]) => k.toLowerCase().includes(q));
});
const builtinVariableNames = new Set<string>(['passage', 'storyTitle']);

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

const displayVar = (v: unknown) => {
  if (v === null || v === undefined) return String(v);
  if (typeof v === "object") return JSON.stringify(v);
  return String(v);
};

function insertSnippet(snippet: string) {
  const textarea = document.querySelector("textarea") as HTMLTextAreaElement | null;
  if (!textarea) return;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const content = textarea.value;
  textarea.value = `${content.slice(0, start)}${snippet}${content.slice(end)}`;
  textarea.selectionStart = textarea.selectionEnd = start + snippet.length;
  textarea.focus();
}

function wrapSelection(before: string, after?: string) {
  const textarea = document.querySelector("textarea") as HTMLTextAreaElement | null;
  const a = after ?? before;
  if (!textarea) {
    insertSnippet(before + a);
    return;
  }
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const content = textarea.value;
  if (start !== end) {
    const selected = content.slice(start, end);
    const replaced = before + selected + a;
    textarea.value = content.slice(0, start) + replaced + content.slice(end);
    textarea.selectionStart = start;
    textarea.selectionEnd = start + replaced.length;
    textarea.focus();
  } else {
    const inserted = before + a;
    textarea.value = `${content.slice(0, start)}${inserted}${content.slice(end)}`;
    const cursorPos = start + before.length;
    textarea.selectionStart = textarea.selectionEnd = cursorPos;
    textarea.focus();
  }
}

function insertJsGlobalSnippet() {
  insertSnippet(`(fn:\"myFunc\")[console.log(\"hello\"); return 123]`);
}

function insertCallSnippet() {
  insertSnippet(`(call:\"myFunc\")`);
}

const insertVariableToEditor = (key: string) => {
  insertSnippet(`$${key}`);
};

const openEditVar = async (key: string) => {
  editingVarName.value = key;
  jsonEditorValue.value = JSON.stringify(variables.value[key], null, 2);
  // show modal
  await nextTick();
  const dlg = document.getElementById("json-editor-dialog") as HTMLDialogElement | null;
  if (dlg) dlg.showModal();
  // init CodeMirror
  await nextTick();
  const currentTheme = isDark.value ? "dracula" : "default";
  if (jsonEditorRef.value && !cmInstance.value) {
    const textarea = jsonEditorRef.value.querySelector("textarea") as HTMLTextAreaElement | null;
    if (textarea) {
      textarea.value = jsonEditorValue.value;
      cmInstance.value = CodeMirror.fromTextArea(textarea, {
        mode: { name: "javascript", json: true },
        theme: currentTheme,
        lineNumbers: true,
        tabSize: 2,
        autofocus: true,
      });
      cmInstance.value.setSize("100%", 400);
    }
  } else if (cmInstance.value) {
    cmInstance.value.setOption("theme", currentTheme);
    cmInstance.value.setValue(jsonEditorValue.value);
  }
};

const saveEditedVar = () => {
  if (!editingVarName.value) return;
  let raw = jsonEditorValue.value;
  if (cmInstance.value) raw = cmInstance.value.getValue();
  try {
    const parsed = JSON.parse(raw);
    variables.value[editingVarName.value] = parsed;
  } catch (e) {
    // fallback: treat as string
    variables.value[editingVarName.value] = raw;
  }
  const dlg = document.getElementById("json-editor-dialog") as HTMLDialogElement | null;
  if (dlg) dlg.close();
};

const closeJsonEditor = () => {
  const dlg = document.getElementById("json-editor-dialog") as HTMLDialogElement | null;
  if (dlg) dlg.close();
};

const refreshPreview = () => {
  // preview is controlled by StoryPlayView via props; updating refs will re-render automatically
  // keep a tiny tick to allow reactive updates
  previewPassage.value = previewPassage.value;
};

const resetPreviewVars = () => {
  variables.value = buildInitialVariables(story.value);
};

const insertSelectedVar = () => {
  if (!selectedInsertVar.value) return;
  insertSnippet(`$${selectedInsertVar.value}`);
};


onBeforeUnmount(() => {
  if (cmInstance.value) {
    try { cmInstance.value.toTextArea(); } catch {}
    cmInstance.value = null;
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
  input.accept = ".txt,.md,.json,.html";
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
      selectedPassage.value = story.value.startPassage || story.value.passages[0]?.name || selectedPassage.value;
      previewPassage.value = selectedPassage.value;
      refreshPreview();
      window.alert('导入成功');
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
      window.alert('导入失败');
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
  try {
    const text = await navigator.clipboard.readText();
    if (!text || !text.trim()) {
      // eslint-disable-next-line no-alert
      msg.error("剪贴板没有可用文本。");
      return;
    }

    const parsed = parseStorySource(text);
    if (!parsed || !parsed.passages || parsed.passages.length === 0) {
      msg.error("未检测到可导入的段落内容。");
      return;
    }

    story.value.passages = [];

    let added = 0;
    for (const p of parsed.passages) {
      const exists = story.value.passages.some((q) => q.name === p.name);
      const toAdd = { ...p };
      if (exists) {
        toAdd.name = generateUniquePassageName(p.name);
      }
      story.value.passages.push(toAdd);
      added += 1;
    }

    // Update variables with any newly introduced names (merge defaults)
    const newVars = buildInitialVariables(story.value);
    for (const [k, v] of Object.entries(newVars)) {
      if (variables.value[k] === undefined) variables.value[k] = v;
    }

    // Select the first newly added passage
    if (added > 0) {
      selectedPassage.value =
        story.value.passages[story.value.passages.length - added].name;
    }

    msg.success(`已从剪贴板导入 ${added} 个段落。`);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    msg.error("从剪贴板读取失败，请确保已授权并包含文本。");
  }
};

const exportStory = () => {
  const source = serializeStory(story.value);
  const blob = new Blob([source], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${(story.value.title || "story").replace(/\s+/g, "-")}.txt`;
  anchor.click();
  URL.revokeObjectURL(url);
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
  localStorage.setItem("haide-story-variables", JSON.stringify(variables.value));
};

const saveToServer = async () => {
  // Create payload compatible with server CreateStoryDto: title + content
  const payload = {
    ...omit(story.value, ["passages"]),
    content: serializeStory(story.value),
    passageSize: story.value.passages.length,
  };
  try {
    if (currentStoryId.value) {
      await updateStory(currentStoryId.value, payload);
      msg.success('已保存');
    } else {
      const res = await createStory(payload);
      const newId = res?.id;
      if (newId) {
        currentStoryId.value = newId;
        // navigate to editor with id
        router.replace({ name: 'story-editor', params: { storyId: newId } });
      }
      msg.success('已保存');
    }
  } catch (e) {
    // fallback to local save
    saveDraft();
    msg.error('保存到服务器失败，已保存到本地草稿');
  }
};

const confirmRun = () => {
  const payload = {
    story: story.value,
    currentPassage: selectedPassage.value,
    variables: variables.value,
  };
  localStorage.setItem("haide-story-session", JSON.stringify(payload));
  localStorage.removeItem("haide-story-play-cache");
  closeDialog();
  router.push({ name: "story-play", params: { storyId: "current" } });
};

const closeDialog = () => {
  dialogRef.value?.close();
};

const selectPassage = (name: string) => {
  selectedPassage.value = name;
};

// keep tag editor sync with selected passage
watch(selectedPassage, () => {
  const p = story.value.passages.find((x) => x.name === selectedPassage.value);
  tagEditValue.value = (p?.tags || []).join(", ");
});

const renamePassage = () => {
  const current = story.value.passages.find(
    (passage) => passage.name === selectedPassage.value,
  );
  if (!current) {
    return;
  }
  const nextName = window.prompt("新段落名：", current.name);
  if (!nextName || !nextName.trim()) {
    return;
  }
  current.name = nextName.trim();
  selectedPassage.value = current.name;
};

const deletePassage = () => {
  if (story.value.passages.length <= 1) {
    return;
  }
  story.value.passages = story.value.passages.filter(
    (passage) => passage.name !== selectedPassage.value,
  );
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
  const draft = localStorage.getItem("haide-story-draft");
  if (draft) {
    try {
      story.value = JSON.parse(draft) as StoryData;
      selectedPassage.value = story.value.passages[0]?.name ?? "Start";
    } catch {
      story.value = createDefaultStory();
    }
  }

  variables.value = buildInitialVariables(story.value);
  previewPassage.value = selectedPassage.value || story.value.passages[0]?.name || "Start";
  // load story if id provided
  const sid = (route.params.storyId as string) || null;
  if (sid) {
    currentStoryId.value = sid;
    getStory(sid).then((data) => {
      if (data) {
        data.tags = data.tags.split(',');
        story.value = data;
        story.value.passages = parseStorySource(data.content).passages;
        variables.value = buildInitialVariables(story.value);
        selectedPassage.value = story.value.startPassage || story.value.passages[0]?.name || selectedPassage.value;
        previewPassage.value = selectedPassage.value;
        refreshPreview();
      }
    }).catch(() => {});
  }
});

watch([previewPassage, () => story.value, variables], () => {
  refreshPreview();
}, { deep: true });
</script>
