<script setup lang="ts">
import { onMounted } from "vue";
import { RouterLink } from "vue-router";
import { useServices } from "@/composables/useServices";
import { useSEO } from "@/composables/useSEO";
import { Card, CardContent } from "@/components/ui/card";
import { getSiteUrl } from "@/lib/site";

const { services, loading, error, loadServices } = useServices();
const siteUrl = getSiteUrl();

useSEO({
  title: "유튜브 프리미엄 국가별 가격 비교 | 최저가 국가 순위",
  description:
    "유튜브 프리미엄 국가별 구독료를 한눈에 비교하세요. 현재 환율 기준으로 한국 대비 절약률과 최저가 국가 순위를 확인할 수 있습니다.",
  ogImage: `${siteUrl}/og-image.png`,
  jsonLd: {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "유튜브 프리미엄 가격 비교",
    url: siteUrl,
    description: "유튜브 프리미엄 국가별 구독료 최저가 비교",
    potentialAction: {
      "@type": "SearchAction",
      target: `${siteUrl}/?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  },
});

onMounted(() => {
  void loadServices();
});
</script>

<template>
  <div class="container py-6">
    <div class="third-rate-board">
      <section class="retro-panel overflow-hidden mb-4">
        <div class="retro-titlebar">
          <h1 class="retro-title">유튜브 프리미엄 국가별 최저가 비교</h1>
          <span class="retro-kbd">HOME</span>
        </div>
      </section>

      <section class="space-y-4">
        <Card class="retro-panel overflow-hidden">
          <div class="retro-titlebar">
            <h2 class="retro-title">서비스 목록</h2>
          </div>
          <CardContent>
            <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                v-for="i in 4"
                :key="i"
                class="retro-panel-muted animate-pulse p-3 sm:p-4"
              >
                <div class="h-5 bg-muted rounded mb-3"></div>
                <div class="h-3 bg-muted rounded w-2/3"></div>
              </div>
            </div>

            <div v-else-if="error" class="text-center py-12">
              <p class="text-destructive text-body">{{ error }}</p>
            </div>

            <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <RouterLink
                v-for="service in services"
                :key="service.id"
                :to="`/${service.slug}`"
                class="block group retro-panel-muted p-3 sm:p-4 transition-colors hover:bg-accent/20"
              >
                <div class="flex items-center justify-between gap-3">
                  <div class="flex items-center gap-3 min-w-0">
                    <div
                      class="w-10 h-10 rounded-sm flex items-center justify-center text-white font-bold text-body border border-border shrink-0"
                      :style="{ backgroundColor: service.color }"
                    >
                      {{ service.name.charAt(0) }}
                    </div>
                    <div class="min-w-0">
                      <p class="text-body font-semibold truncate">{{ service.name }}</p>
                      <p class="text-caption text-muted-foreground truncate">
                        {{ service.plans.map((p) => p.name).join(" · ") }}
                      </p>
                    </div>
                  </div>
                  <span class="retro-kbd shrink-0 transition-colors group-hover:text-foreground">
                    들어가기
                  </span>
                </div>
              </RouterLink>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  </div>
</template>

<style scoped>
.third-rate-board :deep(.retro-title) {
  font-size: clamp(1.5rem, 3.2vw, 2.5rem);
  font-weight: 900;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  text-shadow: 1px 1px 0 rgb(203 213 225 / 0.9);
}

.third-rate-board :deep(.retro-kbd) {
  font-size: clamp(0.9rem, 1.4vw, 1.1rem);
  font-weight: 800;
  letter-spacing: 0.05em;
}

.third-rate-board :deep(.text-body) {
  font-size: clamp(1rem, 1.65vw, 1.24rem);
  font-weight: 700;
}

.third-rate-board :deep(.text-caption) {
  font-size: clamp(0.9rem, 1.3vw, 1.05rem);
  font-weight: 700;
}

.third-rate-board :deep(.text-tiny) {
  font-size: clamp(0.84rem, 1.08vw, 0.96rem);
  font-weight: 700;
}
</style>
