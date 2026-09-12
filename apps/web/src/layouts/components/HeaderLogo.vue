<template>
  <RouterLink class="text-xl tracking-[0.2em] space-x-2 flex items-center" to="/">
    <Icon icon="svg-icon:logo" size="1.2em" />
    <span class="md:inline" v-if="!appStore.customHeaderTitle || !appStore.isMobile">
      织言<span class="hidden md:inline">·Tellory</span>
    </span>
  </RouterLink>
</template>

<script setup lang="ts">
import { useAppStore } from "@/stores/modules/app";
import { RouterLink } from "vue-router";
const appStore = useAppStore();
</script>
