<template>
  <RouterLink class="btn btn-ghost text-lg font-black tracking-[0.28em]" to="/">
    <span
      class="inline-flex h-10 w-10 items-center justify-center rounded-btn bg-primary text-primary-content"
      >H</span
    >
    <span class="hidden sm:inline">{{ brand }}</span>
  </RouterLink>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router";

defineProps<{
  brand: string;
}>();
</script>
