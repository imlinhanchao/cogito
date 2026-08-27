<template>
  <nav class="navbar-center hidden md:flex">
    <ul class="menu menu-horizontal rounded-box px-1">
      <li v-for="item in navItems" :key="item.path">
        <RouterLink
          :to="item.path"
          :class="route.path === item.path ? 'active' : ''"
        >
          {{ item.label }}
        </RouterLink>
      </li>
    </ul>
  </nav>
</template>

<script setup lang="ts">
import { RouterLink, useRoute } from "vue-router";

interface NavItem {
  label: string;
  path: string;
}

defineProps<{
  navItems: NavItem[];
}>();

const route = useRoute();
</script>
