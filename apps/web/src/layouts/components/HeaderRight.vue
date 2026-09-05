<template>
  <div class="navbar-end flex items-center gap-1.5 sm:gap-2">
    <router-link
      to="/story-editor"
      class="btn btn-primary btn-xs sm:btn-sm gap-1 font-medium shadow-xs"
      title="创建故事"
    >
      <Icon icon="mdi:plus" class="w-4 h-4" />
      <span class="hidden sm:inline">创作故事</span>
    </router-link>

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
    <div class="divider divider-horizontal my-2 mx-2"></div>
    <div v-if="isAuthenticated && authStore.getUser" class="dropdown dropdown-end">
      <label tabindex="0" class="avatar">
        <div class="w-9 rounded-full">
          <div v-if="!userInfo.avatar" class="rounded-full bg-primary/15 text-primary flex items-center justify-center text-sm font-bold border border-primary/20">
            {{ (userInfo.nickname || userInfo.username || 'U').slice(0, 1) }}
          </div>
          <img v-else :src="userInfo.avatar" alt="avatar" class="rounded-full object-cover" />
        </div>
      </label>
      <ul tabindex="0" class="dropdown-content menu p-2 shadow bg-base-100 rounded-box w-44">
        <li>
          <router-link :to="{ path: profileUrl }">个人中心</router-link>
        </li>
        <li v-if="authStore.isAdmin">
          <router-link to="/admin/reviews">审核中心</router-link>
        </li>
        <span class="divider my-0"></span>
        <li>
          <a class="text-error" @click.prevent="handleLogout">退出登录</a>
        </li>
      </ul>
    </div>
    <div v-else>
      <router-link to="/login" class="btn btn-ghost btn-xs sm:btn-sm gap-1">
        <Icon icon="basil:login-solid" class="w-4 h-4" />
        <span>登录</span>
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useAppStore } from "@/stores/modules/app";
import { useAuthStore } from "@/stores/modules/auth";
import { computed } from "vue";
import { useRouter } from 'vue-router';
import { Icon } from "@iconify/vue";

const authStore = useAuthStore();
const appStore = useAppStore();
const router = useRouter();

const isDark = computed(() => appStore.getTheme === 'dark');
const isAuthenticated = computed(() => authStore.isAuthenticated);

function handleLogout() {
  authStore.logout();
  router.push({ path: '/' });
}

const userInfo = computed(() => authStore.getUser);
const profileUrl = computed(() => userInfo.value.from ? `/${userInfo.value.from}/${userInfo.value.username}` : `/${userInfo.value.username}`);
</script>
