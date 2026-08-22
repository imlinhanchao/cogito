<template>
  <MainLayout>
    <RouterView />
  </MainLayout>
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'

import MainLayout from '@/layouts/MainLayout.vue'
</script>
