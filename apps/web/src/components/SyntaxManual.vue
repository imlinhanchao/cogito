<template>
  <div>
    <div class="fixed inset-0 bg-black/40 z-40" @click="close"></div>
    <aside class="fixed right-0 top-0 h-full w-96 z-50 bg-base-100 border-l border-base-300 shadow-xl overflow-auto">
      <div class="p-4">
        <div class="flex items-center justify-between mb-3">
          <h3 class="text-lg font-bold">语法说明书</h3>
          <button class="btn btn-ghost btn-sm btn-square" type="button" @click="close">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 011.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
            </svg>
          </button>
        </div>

        <div class="space-y-4">
          <section class="rounded-2xl border border-base-300 bg-base-200 p-4">
            <h4 class="mb-3 font-semibold">变量与赋值</h4>
            <div class="space-y-3 text-sm leading-7 text-base-content/80">
              <div class="rounded-xl bg-base-100 p-3 font-mono text-xs leading-6">
                (set: $health to 10)<br />
                (set: $name to "小明")<br />
                (set: $score to $score + 1)<br />
                (set: $msg to $a + $b)
              </div>
              <p>变量以 <strong>$</strong> 开头。支持数值运算与字符串连接。</p>
            </div>
          </section>

          <section class="rounded-2xl border border-base-300 bg-base-200 p-4">
            <h4 class="mb-3 font-semibold">条件分支</h4>
            <div class="space-y-3 text-sm leading-7 text-base-content/80">
              <div class="rounded-xl bg-base-100 p-3 font-mono text-xs leading-6">
                (if: $health > 5)[你很强壮]<br />
                (if: $hasKey)[门开了](else:)[门锁着]<br />
                (if: $score eq 0)[分数为零]
              </div>
              <p>支持 <strong>&gt;</strong>、<strong>&lt;</strong>、<strong>&gt;=</strong>、<strong>&lt;=</strong>、<strong>is</strong>、<strong>is not</strong>、<strong>eq</strong>、<strong>ne</strong>。</p>
            </div>
          </section>

          <section class="rounded-2xl border border-base-300 bg-base-200 p-4">
            <h4 class="mb-3 font-semibold">链接与跳转</h4>
            <div class="space-y-3 text-sm leading-7 text-base-content/80">
              <div class="rounded-xl bg-base-100 p-3 font-mono text-xs leading-6">
                [[去森林|Forest]]<br />
                [[去湖边]]<br />
                (link:"点击我")[(goto:"NextPassage")]<br />
                [[开门|Hall]](set: $doorOpen to true)
              </div>
              <p>快捷链接、按钮链接都可用。`[[显示文字|段落名]]` 左边显示文字，右边是目标段落。</p>
            </div>
          </section>

          <section class="rounded-2xl border border-base-300 bg-base-200 p-4">
            <h4 class="mb-3 font-semibold">显示与样式</h4>
            <div class="space-y-3 text-sm leading-7 text-base-content/80">
              <div class="rounded-xl bg-base-100 p-3 font-mono text-xs leading-6">
                (display: "Intro")<br />
                (print: $health)<br />
                ''粗体'' //斜体// ~~删除线~~ ^^上标^^ ,,下标,,
              </div>
              <p>可直接在段落里插入其他段落内容，也可以打印变量值和基础文本样式。</p>
            </div>
          </section>

          <section class="rounded-2xl border border-base-300 bg-base-200 p-4">
            <h4 class="mb-3 font-semibold">HTML 与样式</h4>
            <div class="space-y-3 text-sm leading-7 text-base-content/80">
              <div class="rounded-xl bg-base-100 p-3 font-mono text-xs leading-6">
                &lt;style&gt;<br />
                .demo-callout { color: #1e3a8a; }<br />
                &lt;/style&gt;<br />
                &lt;div class="demo-callout" title="提示"&gt;支持安全的 HTML 内容&lt;/div&gt;
              </div>
              <p>支持 <strong>style</strong> 标签与安全 HTML 属性，如 id、class、style、title 等。事件属性会被忽略。</p>
            </div>
          </section>

          <section class="rounded-2xl border border-base-300 bg-base-200 p-4">
            <h4 class="mb-3 font-semibold">JS 函数（扩展）</h4>
            <div class="space-y-3 text-sm leading-7 text-base-content/80">
              <div class="rounded-xl bg-base-100 p-3 font-mono text-xs leading-6">
                (fn:"greet")[return 'Hello, ' + (args[0] || vars.name || '访客') + '!']<br />
                (call:"greet" "小红")<br /><br />
                (fn:"incScore")[vars.score = (Number(vars.score)||0) + (Number(args[0])||1); return vars.score]<br />
                (call:"incScore" 5)<br />
                (set: $newScore to (call:"incScore" 2))<br />
                (print: $newScore)
              </div>
              <p>定义格式：<strong>(fn:"name")[代码]</strong>；调用格式：<strong>(call:"name" arg1 arg2)</strong>。</p>
              <p class="text-sm text-base-content/60">安全提示：该功能会执行任意 JS，仅在受信任环境使用；导出或公开使用时请谨慎或启用沙箱策略。</p>
            </div>
          </section>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits(['close']);
const close = () => emit('close');
</script>

<style scoped>
/* small scrollbar styling for the drawer */
.aside-scroll::-webkit-scrollbar { height: 8px; width: 8px; }
</style>
