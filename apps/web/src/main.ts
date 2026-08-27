import { createApp } from "vue";
import { createPinia } from "pinia";

import App from "./App.vue";
import router from "./router/index.ts";
import { useAppStore } from "./stores/app.ts";
import "uno.css";
import "./styles/main.css";

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

const appStore = useAppStore(pinia);
const syncTheme = (theme: string) => {
  document.documentElement.setAttribute("data-theme", theme);
};

syncTheme(appStore.theme);
appStore.$subscribe((_, state) => {
  syncTheme(state.theme);
});

app.mount("#app");
