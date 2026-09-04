<template>
  <div class="min-h-screen bg-base-200 text-base-content h-full flex flex-col">
    <Header />
    <Content>
      <slot />
    </Content>
    <Footer />
  </div>
</template>

<script setup lang="ts">
import { useAppStore } from "@/stores/modules/app.ts";

import Content from "./components/Content.vue";
import Footer from "./components/Footer.vue";
import Header from "./components/Header.vue";

const appStore = useAppStore();
</script>
