<template>
  <div class="story-shell h-full min-h-[calc(100vh-10rem)] p-4 lg:p-6">
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
            <div class="flex items-center gap-2">
              <button
                class="btn btn-xs btn-ghost"
                type="button"
                @click.stop="copyPassageName(passage.name)"
                title="复制段落名"
              >
                复制
              </button>
            </div>
          </div>
        </div>
      </aside>

      <main
        class="rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm"
      >
        <div class="mb-4 flex flex-wrap items-center gap-2">
          <input
            v-model="story.title"
            class="input input-bordered flex-1 min-w-[200px]"
            placeholder="故事标题"
          />
          <button class="btn btn-primary" type="button" @click="runStory">
            运行
          </button>
          <button class="btn btn-outline" type="button" @click="importStory">
            导入
          </button>
          <button class="btn btn-outline" type="button" @click="pasteImport">
            粘贴
          </button>
          <button class="btn btn-outline" type="button" @click="exportStory">
            导出
          </button>
          <button class="btn btn-outline" type="button" @click="buildStory">
            编译
          </button>
          <button class="btn btn-ghost" type="button" @click="saveDraft">
            保存
          </button>
        </div>

        <div class="mb-4 flex flex-wrap gap-2">
          <button
            class="btn btn-sm btn-outline"
            type="button"
            @click="insertSnippet('[[' + selectedPassage + '|]]')"
          >
            链接
          </button>
          <button
            class="btn btn-sm btn-outline"
            type="button"
            @click="insertSnippet('(if: $var > 0)[文本](else:)[文本]')"
          >
            分支
          </button>
          <button
            class="btn btn-sm btn-outline"
            type="button"
            @click="insertSnippet('(set: $score to $score + 1)')"
          >
            赋值
          </button>
          <button
            class="btn btn-sm btn-outline"
            type="button"
            @click="insertSnippet('(print: $score)')"
          >
            打印
          </button>
          <button
            class="btn btn-sm btn-outline"
            type="button"
            @click="insertJsGlobalSnippet"
          >
            全局 JS 定义
          </button>
          <button
            class="btn btn-sm btn-outline"
            type="button"
            @click="insertCallSnippet"
          >
            调用 JS 函数
          </button>
        </div>

        <div class="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div class="rounded-xl border border-base-300 bg-base-200 p-3">
            <div class="mb-2 flex items-center justify-between">
              <div class="flex items-center gap-3">
                <label class="text-sm font-semibold">段落编辑</label>
                <span class="text-sm text-base-content/60"
                  >场景：{{ selectedPassage }}</span
                >
              </div>
              <div class="flex items-center gap-2">
                <button
                  class="btn btn-xs btn-outline"
                  type="button"
                  @click="renamePassage"
                >
                  重命名
                </button>
                <button
                  class="btn btn-xs btn-error btn-outline"
                  type="button"
                  @click="deletePassage"
                >
                  删除
                </button>
              </div>
            </div>
            <textarea
              v-model="selectedPassageContent"
              class="h-[420px] w-full resize-none rounded-xl border border-base-300 bg-base-100 p-3 font-mono text-sm outline-none focus:border-primary"
              spellcheck="false"
            />
            <div class="mt-3 flex items-center gap-2">
              <label class="text-sm">Tags：</label>
              <input
                v-model="tagEditValue"
                class="input input-sm flex-1"
                placeholder="用逗号分隔标签"
              />
              <button
                class="btn btn-xs btn-primary"
                type="button"
                @click="saveTags"
              >
                保存
              </button>
            </div>
          </div>

          <div
            class="space-y-4 rounded-xl border border-base-300 bg-base-200 p-3"
          >
            <div class="rounded-xl bg-base-100 p-3">
              <p
                class="mb-2 text-sm font-semibold uppercase tracking-[0.24em] text-base-content/70"
              >
                故事信息
              </p>
              <ul class="space-y-2 text-sm text-base-content/80">
                <li>
                  标题: <strong>{{ story.title || "未命名故事" }}</strong>
                </li>
                <li>
                  起始段落:
                  <strong>{{ story.startPassage || selectedPassage }}</strong>
                </li>
                <li>
                  段落数: <strong>{{ story.passages.length }}</strong>
                </li>
              </ul>
            </div>

            <div class="rounded-xl bg-base-100 p-3">
              <p
                class="mb-2 text-sm font-semibold uppercase tracking-[0.24em] text-base-content/70"
              >
                变量面板
              </p>
              <div class="space-y-2 text-sm">
                <div
                  v-if="Object.keys(variables).length === 0"
                  class="text-base-content/60"
                >
                  暂无变量
                </div>
                <div
                  v-for="(value, key) in variables"
                  :key="key"
                  class="flex items-center justify-between gap-2 rounded-lg bg-base-200 px-2 py-1"
                >
                  <span>{{ key }}</span>
                  <strong>{{ value }}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>

        <section
          class="mt-6 rounded-2xl border border-base-300 bg-base-100 p-4 shadow-sm"
        >
          <div class="mb-4 flex items-center justify-between gap-3">
            <div>
              <p
                class="text-xs font-semibold uppercase tracking-[0.28em] text-base-content/50"
              >
                Syntax Manual
              </p>
              <h3 class="mt-1 text-lg font-bold">语法说明书</h3>
            </div>
            <span class="badge badge-outline">Harlowe / 轻量支持</span>
          </div>

          <div class="grid gap-4 lg:grid-cols-2">
            <article class="rounded-2xl border border-base-300 bg-base-200 p-4">
              <h4 class="mb-3 font-semibold">变量与赋值</h4>
              <div class="space-y-3 text-sm leading-7 text-base-content/80">
                <div
                  class="rounded-xl bg-base-100 p-3 font-mono text-xs leading-6"
                >
                  (set: $health to 10)<br />
                  (set: $name to "小明")<br />
                  (set: $score to $score + 1)<br />
                  (set: $msg to $a + $b)
                </div>
                <p>
                  变量以 <strong>$</strong> 开头。支持数值运算与字符串连接。
                </p>
              </div>
            </article>

            <article class="rounded-2xl border border-base-300 bg-base-200 p-4">
              <h4 class="mb-3 font-semibold">条件分支</h4>
              <div class="space-y-3 text-sm leading-7 text-base-content/80">
                <div
                  class="rounded-xl bg-base-100 p-3 font-mono text-xs leading-6"
                >
                  (if: $health > 5)[你很强壮]<br />
                  (if: $hasKey)[门开了](else:)[门锁着]<br />
                  (if: $score eq 0)[分数为零]
                </div>
                <p>
                  支持
                  <strong>&gt;</strong
                  >、<strong>&lt;</strong>、<strong>&gt;=</strong>、<strong>&lt;=</strong>、<strong>is</strong>、<strong
                    >is not</strong
                  >、<strong>eq</strong>、<strong>ne</strong>。
                </p>
              </div>
            </article>

            <article class="rounded-2xl border border-base-300 bg-base-200 p-4">
              <h4 class="mb-3 font-semibold">链接与跳转</h4>
              <div class="space-y-3 text-sm leading-7 text-base-content/80">
                <div
                  class="rounded-xl bg-base-100 p-3 font-mono text-xs leading-6"
                >
                  [[去森林|Forest]]<br />
                  [[去湖边]]<br />
                  (link:"点击我")[(goto:"NextPassage")]<br />
                  [[开门|Hall]](set: $doorOpen to true)
                </div>
                <p>
                  快捷链接、按钮链接都可用。`[[显示文字|段落名]]`
                  左边显示文字，右边是目标段落。
                </p>
              </div>
            </article>

            <article class="rounded-2xl border border-base-300 bg-base-200 p-4">
              <h4 class="mb-3 font-semibold">显示与样式</h4>
              <div class="space-y-3 text-sm leading-7 text-base-content/80">
                <div
                  class="rounded-xl bg-base-100 p-3 font-mono text-xs leading-6"
                >
                  (display: "Intro")<br />
                  (print: $health)<br />
                  ''粗体'' //斜体// ~~删除线~~ ^^上标^^ ,,下标,,
                </div>
                <p>
                  可直接在段落里插入其他段落内容，也可以打印变量值和基础文本样式。
                </p>
              </div>
            </article>

            <article
              class="rounded-2xl border border-base-300 bg-base-200 p-4 lg:col-span-2"
            >
              <h4 class="mb-3 font-semibold">HTML 与样式</h4>
              <div class="space-y-3 text-sm leading-7 text-base-content/80">
                <div
                  class="rounded-xl bg-base-100 p-3 font-mono text-xs leading-6"
                >
                  &lt;style&gt;<br />
                  .demo-callout { color: #1e3a8a; }<br />
                  &lt;/style&gt;<br />
                  &lt;div class="demo-callout" title="提示"&gt;支持安全的 HTML
                  内容&lt;/div&gt;
                </div>
                <p>
                  支持 <strong>style</strong> 标签与安全 HTML 属性，如
                  id、class、style、title 等。事件属性会被忽略。
                </p>
              </div>
            </article>

            <article
              class="rounded-2xl border border-base-300 bg-base-200 p-4 lg:col-span-2"
            >
              <h4 class="mb-3 font-semibold">JS 函数（扩展）</h4>
              <div class="space-y-3 text-sm leading-7 text-base-content/80">
                <div
                  class="rounded-xl bg-base-100 p-3 font-mono text-xs leading-6"
                >
                  (fn:"greet")[return 'Hello, ' + (args[0] || vars.name ||
                  '访客') + '!']<br />
                  (call:"greet" "小红")<br />
                  <br />
                  (fn:"incScore")[vars.score = (Number(vars.score)||0) +
                  (Number(args[0])||1); return vars.score]<br />
                  (call:"incScore" 5)<br />
                  (set: $newScore to (call:"incScore" 2))<br />
                  (print: $newScore)
                </div>
                <p>
                  定义格式：<strong>(fn:"name")[代码]</strong>；调用格式：<strong
                    >(call:"name" arg1 arg2)</strong
                  >。
                </p>
                <p>
                  函数由
                  <strong>new Function('vars','args', code)</strong> 执行，接收
                  <strong>vars</strong>（变量字典引用）和
                  <strong>args</strong>（参数数组）。函数可以读取与修改
                  <strong>vars</strong>，并通过 <code>return</code> 返回值，可用
                  <strong>(set: $x to (call:"name" ...))</strong>
                  将返回值赋给变量。
                </p>
                <p class="text-sm text-base-content/60">
                  安全提示：该功能会执行任意
                  JS，仅在受信任环境使用；导出或公开使用时请谨慎或启用沙箱策略。
                </p>
              </div>
            </article>
          </div>
        </section>
      </main>
    </div>

    <dialog ref="dialogRef" class="modal">
      <div class="modal-box">
        <h3 class="text-lg font-bold">故事运行</h3>
        <p class="py-4">当前故事已准备好播放，是否切换到播放视图？</p>
        <div class="modal-action">
          <button class="btn btn-ghost" type="button" @click="closeDialog">
            取消
          </button>
          <button class="btn btn-primary" type="button" @click="confirmRun">
            确认
          </button>
        </div>
      </div>
      <form method="dialog" class="modal-backdrop">
        <button type="submit">close</button>
      </form>
    </dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import {
  createDefaultStory,
  parseStorySource,
  serializeStory,
  buildInitialVariables,
  type StoryData,
  buildStandaloneExport,
} from "@/lib/storyEngine";

const router = useRouter();
const dialogRef = ref<HTMLDialogElement | null>(null);
const story = ref<StoryData>(createDefaultStory());
const selectedPassage = ref("Start");
const variables = ref<Record<string, unknown>>({});

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
    if (!file) {
      return;
    }
    const text = await file.text();
    const parsed = parseStorySource(text);
    story.value = parsed;
    selectedPassage.value = parsed.passages[0]?.name ?? "Start";
    variables.value = buildInitialVariables(parsed);
  };
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
      window.alert("剪贴板没有可用文本。");
      return;
    }

    const parsed = parseStorySource(text);
    if (!parsed || !parsed.passages || parsed.passages.length === 0) {
      window.alert("未检测到可导入的段落内容。");
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

    window.alert(`已从剪贴板导入 ${added} 个段落。`);
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error(e);
    window.alert("从剪贴板读取失败，请确保已授权并包含文本。");
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
  localStorage.setItem(
    "haide-story-variables",
    JSON.stringify(variables.value),
  );
};

const runStory = () => {
  if (dialogRef.value) {
    dialogRef.value.showModal();
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
import { watch } from "vue";
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

const insertSnippet = (snippet: string) => {
  const textarea = document.querySelector(
    "textarea",
  ) as HTMLTextAreaElement | null;
  if (!textarea) {
    return;
  }
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const content = textarea.value;
  textarea.value = `${content.slice(0, start)}${snippet}${content.slice(end)}`;
  textarea.selectionStart = textarea.selectionEnd = start + snippet.length;
  textarea.focus();
};

const insertJsGlobalSnippet = () => {
  insertSnippet(`(fn:"myFunc")[console.log("hello"); return 123]`);
};

const insertCallSnippet = () => {
  insertSnippet(`(call:"myFunc")`);
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

const uniqueTags = computed(() => {
  const set = new Set<string>();
  for (const p of story.value.passages) {
    for (const t of p.tags ?? []) set.add(t);
  }
  return Array.from(set);
});

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

const insertJsFunctionsEntry = () => {
  // ensure JSFunctions passage exists
  ensurePassage("JSFunctions");
  // add link in current passage content
  const p = story.value.passages.find((x) => x.name === selectedPassage.value);
  if (p && !p.content.includes("JSFunctions")) {
    p.content = `${p.content}\n\n[[进入 JSFunctions|JSFunctions]]`;
  }
  // mark current passage with tag
  if (p) {
    p.tags = Array.from(new Set([...(p.tags || []), "js-entry"]));
  }
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
});
</script>
