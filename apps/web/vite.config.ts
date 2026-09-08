import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { createSvgIconsPlugin } from 'vite-plugin-svg-icons';
import { resolve } from "path";
import { defineConfig } from "vite";

export default defineConfig({
  base: './',
  plugins: [
    vue(), 
    tailwindcss(),
    createSvgIconsPlugin({
      iconDirs: [resolve(process.cwd(), 'src/assets/icons')],
      symbolId: 'icon-[dir]-[name]',
    }),

  ],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  build: {
    target: 'es2015',
    outDir: '../../release/public',
    emptyOutDir: true,
  },
  server: {
    allowedHosts: true,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
});
