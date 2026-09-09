<template>
  <header class="sticky top-0 z-40 backdrop-blur px-5">
    <div class="navbar app-container px-0">
      <!-- 默认导航：logo + 居中菜单 + 右侧操作（daisyUI 三栏式布局） -->
      <template v-if="!appStore.customHeaderTitle">
        <div class="navbar-start gap-3">
          <HeaderLogo class="inline-flex rounded-full p-3" />
        </div>

        <HeaderNav />

        <div class="navbar-end">
          <HeaderRight />
        </div>
      </template>

      <!--
        自定义故事标题模式：不依赖 daisyUI 的 50%/50% 三栏网格，
        改用 logo / 右侧操作固定宽度、标题区 flex-1 min-w-0 可收缩省略的布局，
        避免长标题把 HeaderRight 挤出屏幕。
      -->
      <template v-else>
        <HeaderLogo class="shrink-0 inline-flex rounded-full p-3 bg-base-300 shadow" />

        <h2
          class="flex-1 min-w-0 truncate px-2 text-center font-serif font-bold text-lg text-base-content tracking-wide"
        >
          {{ appStore.customHeaderTitle }}
        </h2>

        <HeaderRight />
      </template>
    </div>
  </header>
</template>

<script setup lang="ts">
import { useAppStore } from "@/stores/modules/app";
import HeaderLogo from "./HeaderLogo.vue";
import HeaderNav from "./HeaderNav.vue";
import HeaderRight from "./HeaderRight.vue";

const appStore = useAppStore();
</script>
