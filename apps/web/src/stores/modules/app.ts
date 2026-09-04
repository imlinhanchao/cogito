import { defineStore } from "pinia";
import { ref, watch, computed } from "vue";

export type ThemeName = "dark" | "light";

export const useAppStore = defineStore("app", () => {
  const theme = ref((localStorage.getItem("theme") as ThemeName) || ("light" as ThemeName));
  const toggleTheme = () => {
    theme.value = theme.value === "light" ? "dark" : "light";
    localStorage.setItem("theme", theme.value);
  };

  watch(theme, (newTheme) => {
    document.documentElement.setAttribute("data-theme", newTheme);
  });

  const themeLabel = computed(() => (theme.value === "light" ? "浅色" : "深色"));

  if (theme.value === "light") {
    document.documentElement.setAttribute("data-theme", "light");
  } else {
    document.documentElement.setAttribute("data-theme", "dark");
  }

  const getTheme = computed(() => theme.value);

  return {
    getTheme,
    themeLabel,
    toggleTheme,
  };
});
