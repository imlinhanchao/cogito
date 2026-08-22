import { defineConfig, presetAttributify, presetUno } from 'unocss'

export default defineConfig({
  presets: [presetUno(), presetAttributify()],
  shortcuts: {
    'app-container': 'mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8',
    'surface-panel': 'rounded-[2rem] border border-base-300/70 bg-base-100/90 shadow-xl shadow-base-300/20 backdrop-blur',
    'section-gap': 'py-8 sm:py-12',
  },
})
