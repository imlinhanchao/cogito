<template>
  <div class="rounded-xl border border-base-300 bg-base-200/50">
    <div class="tools px-3 pt-3 z-100 sticky top-17.5 mb-4 flex flex-wrap items-center bg-base-200 rounded-xl border border-base-200">
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

      <div class="tooltip tooltip-bottom" data-tip="插入成就 (point: 名称|描述)">
        <button class="btn btn-sm btn-ghost btn-square" type="button" @click="insertSnippet('(point: Achievement|描述)')">
          <Icon icon="mdi:star-circle" class="text-lg" />
        </button>
      </div>

      <div class="tooltip tooltip-bottom" data-tip="插入结局 (end: 名称|描述)">
        <button class="btn btn-sm btn-ghost btn-square" type="button" @click="insertSnippet('(end: Ending|描述)')">
          <Icon icon="mdi:flag-checkered" class="text-lg" />
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
        <button class="btn btn-sm btn-ghost btn-square" type="button" @click="$emit('insert-display')">
          <Icon icon="mdi:file-replace-outline" class="text-lg" />
        </button>
      </div>

      <div class="tooltip tooltip-bottom" data-tip="插入全局 JS 函数 (fn:)">
        <button class="btn btn-sm btn-ghost btn-square" type="button" @click="insertSnippet(`(fn:&quot;myFunc&quot;)[\n\tconsole.log(&quot;hello&quot;);\n\treturn 123\n]\n`)">
          <Icon icon="mdi:code-braces" class="text-lg" />
        </button>
      </div>

      <div class="tooltip tooltip-bottom" data-tip="调用 JS 函数 (call:)">
        <button class="btn btn-sm btn-ghost btn-square" type="button" @click="insertSnippet(`(call:&quot;myFunc&quot;)`)">
          <Icon icon="mdi:play-circle-outline" class="text-lg" />
        </button>
      </div>

      <div class="tooltip tooltip-bottom" data-tip="插入 CSS 样式块 <style>">
        <button class="btn btn-sm btn-ghost btn-square" type="button" @click="$emit('insert-style')">
          <Icon icon="mdi:language-css3" class="text-lg" />
        </button>
      </div>
      <div class="tooltip tooltip-bottom" data-tip="显示语法说明书">
        <button class="btn btn-sm btn-ghost btn-square" type="button" @click="$emit('show-manual')">
          <Icon icon="mdi:book-open-variant" class="text-lg" />
        </button>
      </div>
      <div class="divider divider-horizontal my-1 mx-0.5"></div>
      <div class="tooltip tooltip-bottom" data-tip="初始化语法示例">
        <button class="btn btn-sm btn-ghost btn-square" type="button" @click="$emit('init-default')">
          <Icon icon="mdi:play-circle-outline" class="text-lg" />
        </button>
      </div>
    </div>

    <div class="mb-2 flex items-center justify-between px-3">
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
            v-if="!readOnly"
            class="btn btn-xs btn-ghost btn-square"
            type="button"
            @click="$emit('rename-passage')"
          >
            <Icon icon="mdi:pencil-outline" class="text-base" />
          </button>
        </div>
        <div class="tooltip tooltip-bottom" data-tip="删除当前段落">
          <button
            v-if="!readOnly"
            class="btn btn-xs btn-ghost btn-square text-error"
            type="button"
            @click="$emit('delete-passage')"
          >
            <Icon icon="mdi:trash-can-outline" class="text-base" />
          </button>
        </div>
      </div>
    </div>
    <section class="px-3">
      <textarea
        ref="storyCmTextarea"
        data-cm="story"
        :readonly="readOnly"
        class="h-105 w-full resize-none rounded-xl border border-base-300 bg-base-100 p-0 font-mono text-sm outline-none transition"
        spellcheck="false"
      />
    </section>
    <div class="mt-3 flex items-center gap-2 px-3 pb-3">
      <label class="text-xs text-base-content/70 flex items-center gap-1">
        <Icon icon="mdi:tag-multiple-outline" class="text-sm" />
        <span>Tags：</span>
      </label>
      <input
        v-model="localTagEdit"
        :readonly="readOnly"
        class="input input-sm flex-1 input-bordered"
        placeholder="逗号分隔段落标签"
      />
      <button
        v-if="!readOnly"
        class="btn btn-xs btn-primary gap-1"
        type="button"
        @click="$emit('save-tags', localTagEdit)"
      >
        <Icon icon="mdi:check" class="text-sm" />
        <span>保存标签</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onBeforeUnmount } from 'vue';
import Icon from '@/components/Icon/src/Icon.vue';
import CodeMirror from 'codemirror';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/dracula.css';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/addon/mode/simple';
// register the simple mode for our story syntax here so syntax highlighting
// is available when this component initializes the editor.
(CodeMirror as any).defineSimpleMode &&
  (CodeMirror as any).defineSimpleMode("haideStory", {
    start: [
      { regex: /::\s*[^\n]+/, token: "header" },
      {
        regex: /\(set:|\(if:|\(print:|\(display:|\(call:|\(fn:|\(link:|\(point:|\(end:/,
        token: "keyword",
      },
      { regex: /\[\[[^\]]+\]\]/, token: "link" },
      { regex: /<style>[\s\S]*?<\/style>/, token: "style-tag" },
      { regex: /"(?:[^"\\]|\\.)*"/, token: "string" },
      { regex: /'(?:[^'\\]|\\.)*'/, token: "string" },
      { regex: /\$[A-Za-z0-9_]+/, token: "variable-2" },
      { regex: /\/\/.*$/, token: "comment" },
      { regex: /\/.+?\//, token: "string" },
    ],
    meta: {
      dontIndentStates: ["comment"],
      lineComment: "//",
    },
  });

const props = defineProps<{
  readOnly?: boolean;
  story: any;
  selectedPassage: string;
  content: string;
  tagEditValue: string;
  variables: Record<string, unknown>;
}>();

const emits = defineEmits([
  'update:content',
  'update:selectedPassage',
  'update:tagEditValue',
  'update:variables',
  'paste-import',
  'import-story',
  'export-story',
  'build-story',
  'save-to-server',
  'submit-for-review',
  'refresh-preview',
  'reset-preview-vars',
  'save-tags',
  'rename-passage',
  'delete-passage',
  'copy-passage-name',
  // UI events
  'show-manual',
  'init-default',
  'insert-display',
  'insert-style',
]);

const storyCmTextarea = ref<HTMLTextAreaElement | null>(null);
let storyCmInstance: any = null;

const localTagEdit = ref(props.tagEditValue || '');

watch(
  () => props.tagEditValue,
  (v) => {
    localTagEdit.value = v || '';
  },
);

watch(
  () => props.content,
  (v) => {
    if (!storyCmInstance) return;
    const cur = storyCmInstance.getValue();
    if (cur !== (v || '')) storyCmInstance.setValue(v || '');
  },
);

watch(
  () => props.selectedPassage,
  async () => {
    await nextTick();
    if (!storyCmInstance) return;
    const expected = props.content || '';
    const cur = storyCmInstance.getValue();
    if (cur !== expected) storyCmInstance.setValue(expected);
  },
);

watch(
  () => props.readOnly,
  (r) => {
    if (storyCmInstance) storyCmInstance.setOption('readOnly', r ? 'nocursor' : false);
  },
);

onBeforeUnmount(() => {
  if (storyCmInstance) {
    try {
      storyCmInstance.toTextArea();
    } catch {}
    storyCmInstance = null;
  }
});

// initialize CodeMirror when mounted/updated
watch(
  () => [props.readOnly, props.story && props.selectedPassage],
  async () => {
    await nextTick();
    const ta = storyCmTextarea.value || (document.querySelector('textarea[data-cm="story"]') as HTMLTextAreaElement | null);
    if (!ta) return;
    const theme = 'dracula';
    if (!storyCmInstance) {
      ta.value = props.content || '';
      storyCmInstance = CodeMirror.fromTextArea(ta, {
        mode: 'haideStory',
        theme,
        lineNumbers: true,
        lineWrapping: true,
        tabSize: 2,
        extraKeys: { Tab: (cm: any) => cm.replaceSelection('  ', 'end') },
        readOnly: props.readOnly ? 'nocursor' : false,
      });
      storyCmInstance.setSize('100%', '420px');
      storyCmInstance.on('change', (cm: any) => {
        const v = cm.getValue();
        emits('update:content', v);
      });
      storyCmInstance.setOption('readOnly', props.readOnly ? 'nocursor' : false);
    } else {
      storyCmInstance.setOption('theme', theme);
      storyCmInstance.setOption('readOnly', props.readOnly ? 'nocursor' : false);
    }
  },
  { immediate: true },
);

function insertSnippet(snippet: string) {
  if (props.readOnly) return;
  if (storyCmInstance) {
    const doc = storyCmInstance.getDoc();
    const sel = doc.getSelection();
    doc.replaceSelection(snippet);
    storyCmInstance.focus();
    return;
  }
  const textarea = document.querySelector('textarea') as HTMLTextAreaElement | null;
  if (!textarea) return;
  const start = textarea.selectionStart;
  const end = textarea.selectionEnd;
  const content = textarea.value;
  textarea.value = `${content.slice(0, start)}${snippet}${content.slice(end)}`;
  textarea.selectionStart = textarea.selectionEnd = start + snippet.length;
  textarea.focus();
}

function wrapSelection(before: string, after?: string) {
  const a = after ?? before;
  if (props.readOnly) return;
  if (storyCmInstance) {
    const doc = storyCmInstance.getDoc();
    const sel = doc.getSelection();
    if (sel && sel.length > 0) {
      doc.replaceSelection(before + sel + a);
      storyCmInstance.focus();
    } else {
      doc.replaceSelection(before + a);
      const cursor = doc.getCursor();
      doc.setCursor({ line: cursor.line, ch: cursor.ch - a.length });
      storyCmInstance.focus();
    }
    return;
  }
  const textarea = document.querySelector('textarea') as HTMLTextAreaElement | null;
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

// expose helper methods to parent via defineExpose so parent can call them
defineExpose({ insertSnippet, wrapSelection });
// expose events list (already declared above)
emits;
</script>

<style scoped>
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
