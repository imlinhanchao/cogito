<template>
  <div class="navbar-end flex items-center gap-2">
    <label class="gap-2 rounded-btn cursor-pointer">
      <Icon :icon="isDark ? 'twemoji:waxing-crescent-moon' : 'twemoji:sun'" />
      <input
        ref="themeRef"
        :checked="isDark"
        class="theme-controller toggle toggle-sm hidden"
        type="checkbox"
        value="dark"
        @change="appStore.toggleTheme()"
      />
    </label>
    <div v-if="isAuthenticated">
      <span>欢迎，{{ authStore.user.name }}</span>
    </div>
    <div v-else>
      <router-link to="/login"><Icon icon="basil:login-solid" /> 登录</router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAppStore } from "@/stores/modules/app";
import { useAuthStore } from "@/stores/modules/auth";
import { computed } from "vue";

const authStore = useAuthStore();
const appStore = useAppStore();

const isDark = computed(() => appStore.theme === 'dark');
const isAuthenticated = computed(() => authStore.isAuthenticated);
</script>
