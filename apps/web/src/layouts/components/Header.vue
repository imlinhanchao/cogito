<template>
  <header
    class="sticky top-0 z-40 border-b border-base-100 bg-base-200 backdrop-blur px-5"
  >
    <div class="navbar app-container px-0">
      <div class="navbar-start gap-3">
        <HeaderLogo />
      </div>

      <HeaderNav />

      <HeaderRight />
    </div>
  </header>
</template>

<script setup lang="ts">
import HeaderLogo from "./HeaderLogo.vue";
import HeaderNav from "./HeaderNav.vue";
import HeaderRight from "./HeaderRight.vue";
</script>
