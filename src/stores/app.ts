import { defineStore } from 'pinia'

export type ThemeName = 'dark' | 'light'

interface NavItem {
  label: string
  path: string
}

export const useAppStore = defineStore('app', {
  state: () => ({
    brand: 'Haide UI',
    theme: 'light' as ThemeName,
    navItems: [
      {
        label: '概览',
        path: '/',
      },
      {
        label: '组件预览',
        path: '/playground',
      },
    ] as NavItem[],
  }),
  getters: {
    themeLabel: (state) => (state.theme === 'light' ? '浅色' : '深色'),
  },
  actions: {
    toggleTheme() {
      this.theme = this.theme === 'light' ? 'dark' : 'light'
    },
  },
})
