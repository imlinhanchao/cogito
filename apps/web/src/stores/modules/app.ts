import { defineStore } from "pinia";
import { ref, watch, computed } from "vue";

export type ThemeName = "dark" | "light";

export const useAppStore = defineStore("app", () => {
  const theme = ref(
    (localStorage.getItem("theme") as ThemeName) || ("light" as ThemeName),
  );
  const toggleTheme = () => {
    theme.value = theme.value === "light" ? "dark" : "light";
    localStorage.setItem("theme", theme.value);
  };

  watch(theme, (newTheme) => {
    document.documentElement.setAttribute("data-theme", newTheme);
  });

  const themeLabel = computed(() =>
    theme.value === "light" ? "浅色" : "深色",
  );

  if (theme.value === "light") {
    document.documentElement.setAttribute("data-theme", "light");
  } else {
    document.documentElement.setAttribute("data-theme", "dark");
  }

  const getTheme = computed(() => theme.value);

  // 页面/故事定制 Header 标题（如果设置了则优先显示并隐藏默认 nav）
  const customHeaderTitle = ref<string | null>(null);
  const setCustomHeaderTitle = (title: string | null) => {
    customHeaderTitle.value = title;
  };

  const isMobile = ref(window.matchMedia("(max-width: 767px)").matches);
  const updateIsMobile = () => {
    isMobile.value = window.matchMedia("(max-width: 767px)").matches;
  };
  window.addEventListener("resize", updateIsMobile);

  return {
    getTheme,
    themeLabel,
    toggleTheme,
    customHeaderTitle,
    setCustomHeaderTitle,
    isMobile,
  };
});
