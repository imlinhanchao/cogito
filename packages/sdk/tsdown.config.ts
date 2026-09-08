import { defineConfig } from 'tsdown';

export default defineConfig([
  {
    entry: ['src/index.ts'],
    outDir: './dist/',
    format: ['esm', 'cjs'],
    dts: {
      compilerOptions: {
        removeComments: false,
      },
    },
    minify: false,
    clean: true,
    sourcemap: true,
    external: []
  },
  {
    entry: ['src/index.ts'],
    outDir: './dist/',
    format: ['esm'],
    platform: 'browser',
    dts: {
      compilerOptions: {
        removeComments: false,
      },
    },
    minify: false,
    sourcemap: true,
    clean: true,
    treeshake: true,
    external: []
  },
]);