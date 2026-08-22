<template>
  <section class="grid gap-6 p-4 sm:p-6 lg:grid-cols-[1.2fr_0.8fr] lg:p-8">
    <div class="card border border-base-300 bg-base-100 shadow-xl">
      <div class="card-body gap-6">
        <div class="badge badge-outline w-fit rounded-btn px-4 py-3 uppercase tracking-[0.35em]">
          layout starter
        </div>

        <div class="space-y-4">
          <h1 class="max-w-2xl text-4xl font-black leading-tight sm:text-5xl">
            一个按 daisyUI 规范组织的 Vue 模板，先把
            <span class="text-primary">页面结构</span>
            做对。
          </h1>
          <p class="max-w-2xl text-base leading-8 text-base-content/70 sm:text-lg">
            模板已经接好 Vue 3、TypeScript、Vite、Vue Router、Pinia、UnoCSS 和 daisyUI，适合直接开始做中后台、门户页或内部工具。
          </p>
        </div>

        <div class="card-actions">
          <RouterLink role="button" class="btn btn-primary rounded-btn" to="/playground">查看组件预览</RouterLink>
          <a class="btn rounded-btn" href="#features">了解模板结构</a>
        </div>

        <div class="stats stats-vertical lg:stats-horizontal border border-base-300 bg-base-200 shadow-sm">
          <div class="stat">
            <div class="stat-title">布局</div>
            <div class="stat-value text-2xl">Header</div>
            <div class="stat-desc">顶部导航与主题切换</div>
          </div>
          <div class="stat">
            <div class="stat-title">主体</div>
            <div class="stat-value text-2xl">Content</div>
            <div class="stat-desc">路由内容在主区域渲染</div>
          </div>
          <div class="stat">
            <div class="stat-title">页脚</div>
            <div class="stat-value text-2xl">Footer</div>
            <div class="stat-desc">用于版权、链接和状态信息</div>
          </div>
        </div>
      </div>
    </div>

    <div class="space-y-4">
      <article class="card border border-base-300 bg-base-100 shadow-xl">
        <div class="card-body gap-4">
          <h2 class="card-title">模板已包含的能力</h2>
          <ul class="list-disc space-y-3 pl-5 text-sm leading-7 text-base-content/70">
            <li>路由和布局分层，页面只负责内容。</li>
            <li>Pinia 负责共享状态，适合扩展主题、权限或导航。</li>
            <li>UnoCSS 负责高频布局和快捷样式。</li>
            <li>daisyUI 负责统一的组件风格和主题体系。</li>
          </ul>
        </div>
      </article>

      <article class="card border border-base-300 bg-base-100 shadow-xl">
        <div class="card-body gap-4">
          <p class="text-sm font-semibold uppercase tracking-[0.35em] text-base-content/60">建议起步方式</p>
          <p class="text-base leading-7 text-base-content/70">
            先把业务页面挂到路由里，再把表单、表格、详情页逐步拆成独立组件，模板的结构不会阻塞你继续扩展。
          </p>
        </div>
      </article>
    </div>
  </section>

  <section id="features" class="border-t border-base-300 p-4 sm:p-6 lg:p-8">
    <div class="grid gap-4 md:grid-cols-3">
      <article class="card border border-base-300 bg-base-100 shadow-sm">
        <div class="card-body">
          <h3 class="card-title">统一布局</h3>
          <p class="text-sm leading-7 text-base-content/70">Header、Content、Footer 固定壳子，让页面保持一致的骨架。</p>
        </div>
      </article>
      <article class="card border border-base-300 bg-base-100 shadow-sm">
        <div class="card-body">
          <h3 class="card-title">状态中心</h3>
          <p class="text-sm leading-7 text-base-content/70">Pinia 适合管理主题、菜单、登录态和业务缓存。</p>
        </div>
      </article>
      <article class="card border border-base-300 bg-base-100 shadow-sm">
        <div class="card-body">
          <h3 class="card-title">组件体系</h3>
          <p class="text-sm leading-7 text-base-content/70">daisyUI 提供统一的组件语义，减少页面间风格漂移。</p>
        </div>
      </article>
    </div>
  </section>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>
