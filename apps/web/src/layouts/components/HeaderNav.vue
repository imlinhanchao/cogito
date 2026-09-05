<template>
  <nav class="navbar-center hidden md:flex">
    <ul class="menu menu-horizontal rounded-box px-1">
      <li v-for="item in navItems" :key="item.path">
        <RouterLink
          :to="item.path"
          :class="route.path === item.path ? 'text-primary' : ''"
        >
          {{ item.label }}
        </RouterLink>
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { RouterLink, useRoute } from "vue-router";

interface NavItem {
  label: string;
  path: string;
}

const navItems = ref<NavItem[]>([
  {
    label: "首页",
    path: "/"
  },
  {
    label: "故事列表",
    path: "/stories"
  },
  {
    label: "我的故事",
    path: "/my-stories"
  }
]);

const route = useRoute();
</script>
