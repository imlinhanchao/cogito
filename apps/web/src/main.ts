import { createApp } from "vue";
import 'virtual:svg-icons-register';
import App from "./App.vue";
import router from "./router/";
import "./styles/main.css";
import { setupStore } from "./stores/";
import { registerComponents } from './components'

function bootstrap() {
  const app = createApp(App);
  
  setupStore(app);
  app.use(router);
  registerComponents(app)

  app.mount("#app");
}

bootstrap();
