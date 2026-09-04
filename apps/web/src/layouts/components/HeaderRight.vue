<template>
  <div class="navbar-end flex items-center gap-1">
    <label class="toggle" :class="{ 'text-[#3c3f44]': isDark, 'text-[#c2c2c4] bg-[#8e96aa24]': !isDark }">
      <input
        ref="themeRef"
        :checked="isDark"
        class="theme-controller toggle toggle-sm hidden"
        type="checkbox"
        value="dark"
        @change="appStore.toggleTheme()"
      />
      <Icon aria-label="enabled" icon="twemoji:sun" size="1.2em" color="#fbb247" class="bg-white rounded-full shadow" />
      <Icon aria-label="disabled" icon="akar-icons:moon-fill" size="1.2em" color="#f5ec39" class="fill-black rounded-full" />
    </label>
    <div class="divider divider-horizontal my-2"></div>
    <div class="avatar" v-if="isAuthenticated && authStore.getUser">
      <div class="w-9 rounded-full">
        <img :src="authStore.getUser.avatar" />
      </div>
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

const isDark = computed(() => appStore.getTheme === 'dark');
const isAuthenticated = computed(() => authStore.isAuthenticated);
</script>
