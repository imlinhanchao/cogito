import { defineStore } from "pinia";

export type ThemeName = "dark" | "light";

interface NavItem {
  label: string;
  path: string;
}

export const useAppStore = defineStore("app", {
  state: () => ({
    brand: "Haide UI",
    theme:
      (localStorage.getItem("theme") as ThemeName) || ("light" as ThemeName),
    navItems: [
      {
        label: "概览",
        path: "/",
      },
      {
        label: "组件预览",
        path: "/playground",
      },
      {
        label: "故事编辑器",
        path: "/story-editor",
      },
      {
        label: "故事播放",
        path: "/story-play/current",
      },
    ] as NavItem[],
  }),
  getters: {
    themeLabel: (state) => (state.theme === "light" ? "浅色" : "深色"),
  },
  actions: {
    toggleTheme() {
      this.theme = this.theme === "light" ? "dark" : "light";
      localStorage.setItem("theme", this.theme);
    },
  },
});
