<template>
  <section class="grid gap-6 p-4 sm:p-6 lg:grid-cols-[0.9fr_1.1fr] lg:p-8">
    <article class="card border border-base-300 bg-base-100 shadow-xl">
      <div class="card-body gap-4">
        <p class="text-sm font-semibold uppercase tracking-[0.35em] text-base-content/60">Preview</p>
        <h1 class="text-3xl font-black">组件与布局预览页</h1>
        <p class="text-sm leading-7 text-base-content/70">
          这个页面用于检查 daisyUI 的按钮、卡片和主题切换是否在当前 layout 中工作正常。
        </p>

        <div class="card-actions">
          <span class="badge badge-outline rounded-btn px-4 py-3">Route: /playground</span>
        </div>
      </div>
    </article>

    <div class="space-y-4">
      <article class="card border border-base-300 bg-base-100 shadow-xl">
        <div class="card-body gap-4">
          <h2 class="card-title">布局区域</h2>
          <div class="grid gap-3 sm:grid-cols-3">
            <div class="rounded-box border border-base-300 bg-base-200 p-4">
              <p class="text-xs uppercase tracking-[0.3em] text-base-content/60">Header</p>
              <p class="mt-2 text-sm leading-6 text-base-content/70">品牌、导航、主题切换。</p>
            </div>
            <div class="rounded-box border border-base-300 bg-base-200 p-4">
              <p class="text-xs uppercase tracking-[0.3em] text-base-content/60">Content</p>
              <p class="mt-2 text-sm leading-6 text-base-content/70">当前路由页面和业务组件。</p>
            </div>
            <div class="rounded-box border border-base-300 bg-base-200 p-4">
              <p class="text-xs uppercase tracking-[0.3em] text-base-content/60">Footer</p>
              <p class="mt-2 text-sm leading-6 text-base-content/70">说明、版权、补充链接。</p>
            </div>
          </div>
        </div>
      </article>

      <article class="card border border-base-300 bg-base-100 shadow-xl">
        <div class="card-body gap-4">
          <h2 class="card-title">主题状态</h2>
          <p class="text-sm leading-7 text-base-content/70">
            右上角通过 daisyUI 的 theme-controller 切换主题，视觉状态由组件体系统一管理。
          </p>
          <div class="card-actions">
            <button class="btn" type="button">Default</button>
            <button class="btn btn-outline" type="button">Outline</button>
            <button class="btn btn-ghost" type="button">Ghost</button>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>
