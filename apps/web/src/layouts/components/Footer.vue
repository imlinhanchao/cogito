<template>
  <footer
    class="footer footer-center sm:footer-horizontal app-container border-t border-base-300 bg-base-200 px-4 py-8 text-base-content"
  >
    <div
      class="flex flex-col items-center gap-2 sm:flex-row sm:justify-between"
    >
      <p class="text-sm text-base-content/70">Copyright © {{ new Date().getFullYear() }} Tellory</p>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router";
</script>
