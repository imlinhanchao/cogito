import { defineAsyncComponent } from 'vue';
import type { App, Component } from 'vue';

const modules = import.meta.glob(['./*/*.ts']);

export const components: Record<string, Component> = {};

for (const path in modules) {
  const p = path.split('/')[1];
  if (p) components[p] = defineAsyncComponent(modules[path] as any);
}

export function registerComponents(app: App) {
  for (const path in modules) {
    const name = path.split('/')[1];
    if (name && components[name]) {
      app.component(name, components[name]);
    }
  }
}
