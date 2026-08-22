<template>
  <div class="min-h-screen bg-base-200 text-base-content h-full flex flex-col">
    <Header
      :brand="appStore.brand"
      :nav-items="appStore.navItems"
      :theme="appStore.theme"
      :theme-label="appStore.themeLabel"
      @toggle-theme="appStore.toggleTheme"
    />
    <Content>
      <slot />
    </Content>
    <Footer />
  </div>
</template>

<script setup lang="ts">
import { useAppStore } from '@/stores/app'

import Content from './components/Content.vue'
import Footer from './components/Footer.vue'
import Header from './components/Header.vue'

const appStore = useAppStore()
</script>
