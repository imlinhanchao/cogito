<template>
  <RouterView />
</template>

<script setup lang="ts">
import { RouterView } from "vue-router";
import { useAuthStore } from "@/stores/modules/auth";
const authStore = useAuthStore();

if (authStore.isAuthenticated) {
  authStore.loadProfile();
}

</script>
