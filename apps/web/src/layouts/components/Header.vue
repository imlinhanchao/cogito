<template>
  <header class="sticky top-0 z-40 backdrop-blur px-5">
    <div class="navbar app-container px-0">
      <div class="navbar-start gap-3">
        <HeaderLogo class="inline-flex rounded-full p-3 bg-base-300 shadow" />
      </div>

      <!-- 如果有自定义故事标题，则直接居中显示故事标题并隐藏导航，否则显示默认导航栏 -->
      <div
        v-if="appStore.customHeaderTitle"
        class="navbar-center flex items-center justify-center max-w-md"
      >
        <h2
          class="font-serif font-bold text-lg text-base-content tracking-wide truncate"
        >
          {{ appStore.customHeaderTitle }}
        </h2>
      </div>
      <HeaderNav v-else />

      <HeaderRight />
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
