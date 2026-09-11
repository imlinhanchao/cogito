<template>
  <footer
    class="footer footer-center sm:footer-horizontal py-4 text-base-content"
  >
    <div
      class="flex flex-col items-center gap-2 sm:flex-row sm:justify-between"
    >
      <p class="text-sm text-base-content/70">
        All rights reserved.
        <br />
        Copyright © {{ new Date().getFullYear() }} <a href="https://github.com/imlinhanchao/tellory/" target="_blank" rel="noopener noreferrer">Tellory</a>
      </p>
    </div>
  </footer>
</template>

<script setup lang="ts">
import { RouterLink } from "vue-router";
</script>
