<template>
  <svg v-if="isLocal" class="svg-icon" :style="{ fontSize }" aria-hidden="true">
    <use :xlink:href="symbolId" />
  </svg>
  <IconifyIcon class="inline-block" v-else :icon="(symbolId as string)" :style="{ fontSize, color: props.color }" />
</template>

<script setup lang="ts">
import { isNumber, isString } from '@/utils/is';
import { Icon as IconifyIcon } from '@iconify/vue';
import { computed, unref } from 'vue';

const props = defineProps<{
  icon: string
  size?: string | number
  color?: string
}>()

const fontSize = computed(() => {
  if (props.size === undefined) return '1em';
  if (isNumber(props.size)) return `${props.size}px`;
  return props.size;
});
const isLocal = computed(() => isString(props.icon) && props.icon.startsWith('svg-icon:'));
const symbolId = computed(() => {
  return isString(props.icon) && unref(isLocal)
    ? `#icon-${props.icon.split('svg-icon:')[1].toLocaleLowerCase()}`
    : props.icon;
});
</script>

<style scoped>
.svg-icon {
  display: inline-block;
  vertical-align: middle;
  width: 1em;
  height: 1em;
}
</style>
