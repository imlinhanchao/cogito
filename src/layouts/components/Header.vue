<template>
  <header class="sticky top-0 z-40 border-b border-base-300 bg-base-100/90 backdrop-blur">
    <div class="navbar app-container min-h-20 px-0">
      <div class="navbar-start gap-3">
        <HeaderLogo :brand="brand" />
      </div>

      <HeaderNav :nav-items="navItems" />

      <HeaderRight :theme="theme" :theme-label="themeLabel" @toggle-theme="toggleTheme" />
    </div>
  </header>
</template>

<script setup lang="ts">
import HeaderLogo from './HeaderLogo.vue'
import HeaderNav from './HeaderNav.vue'
import HeaderRight from './HeaderRight.vue'

defineProps<{
  brand: string
  navItems: Array<{ label: string; path: string }>
  theme: 'light' | 'dark'
  themeLabel: string
}>()

defineEmits<{
  toggleTheme: []
}>()
</script>