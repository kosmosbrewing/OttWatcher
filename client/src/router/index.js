import { createRouter, createWebHistory } from "vue-router";

const routes = [
  {
    path: "/",
    name: "Home",
    component: () => import("@/views/HomeView.vue"),
    meta: { title: "OTT 가격 비교 | 국가별 구독 요금 한눈에" },
  },
  // 정적 라우트를 동적 라우트보다 먼저 배치
  {
    path: "/about",
    name: "About",
    component: () => import("@/views/AboutView.vue"),
    meta: { title: "소개 | OTT 가격 비교" },
  },
  {
    path: "/privacy",
    name: "Privacy",
    component: () => import("@/views/PrivacyView.vue"),
    meta: { title: "개인정보처리방침 | OTT 가격 비교" },
  },
  {
    path: "/report",
    name: "Report",
    component: () => import("@/views/ReportView.vue"),
    meta: { title: "가격 제보 | OTT 가격 비교" },
  },
  {
    path: "/changelog",
    name: "Changelog",
    component: () => import("@/views/ChangelogView.vue"),
    meta: { title: "반영 로그 | OTT 가격 비교" },
  },
  // 동적 라우트
  {
    path: "/:serviceSlug/trends",
    name: "ServiceTrends",
    component: () => import("@/views/TrendsView.vue"),
    meta: { title: "가격 트렌드" },
  },
  {
    path: "/:serviceSlug",
    name: "ServicePrice",
    component: () => import("@/views/ServicePriceView.vue"),
    meta: { title: "가격 비교" },
  },
  {
    path: "/:serviceSlug/:countryCode",
    name: "CountryDetail",
    component: () => import("@/views/CountryDetailView.vue"),
    meta: { title: "국가 상세" },
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition;
    return { top: 0 };
  },
});

// 페이지 타이틀 동적 변경
router.beforeEach((to, from, next) => {
  document.title = to.meta.title || "OTT 가격 비교";
  next();
});

export default router;
