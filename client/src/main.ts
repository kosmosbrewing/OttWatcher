import { createApp } from "vue";
import { createHead } from "@vueuse/head";
import App from "./App.vue";
import router from "./router";
import "./assets/css/main.css";
import { initAnalytics, trackPageView } from "./lib/analytics";

async function bootstrap(): Promise<void> {
  const app = createApp(App);
  const head = createHead();

  app.use(router);
  app.use(head);
  initAnalytics();

  try {
    await router.isReady();
    const currentRoute = router.currentRoute.value;
    const routeTitle =
      typeof currentRoute.meta.title === "string" ? currentRoute.meta.title : document.title;
    trackPageView(currentRoute.fullPath, routeTitle);
  } catch {
    // 라우터 준비 실패 시에도 앱은 마운트
  }

  app.mount("#app");
}

bootstrap().catch((error) => {
  console.error("[bootstrap] failed", error);
});
