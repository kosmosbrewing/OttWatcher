import { createApp } from "vue";
import { createHead } from "@vueuse/head";
import App from "./App.vue";
import router from "./router";
import "./assets/css/main.css";
import { initAnalytics } from "./lib/analytics";

function bootstrap(): void {
  const app = createApp(App);
  const head = createHead();

  app.use(router);
  app.use(head);
  initAnalytics();
  app.mount("#app");
}

try {
  bootstrap();
} catch (error) {
  console.error("[bootstrap] failed", error);
}
