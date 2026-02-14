<script setup>
import { onMounted, computed } from "vue";
import { RouterLink } from "vue-router";
import { useServices } from "@/composables/useServices";
import { useSEO } from "@/composables/useSEO";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";

const { services, loading, error, loadServices } = useServices();

const activeCount = computed(() => services.value.length);
const totalPlans = computed(() =>
  services.value.reduce((acc, service) => acc + (service.plans?.length || 0), 0)
);

useSEO({
  title: "OTT 가격 비교 | 국가별 구독 요금 한눈에",
  description: "유튜브 프리미엄, 넷플릭스 등 OTT 서비스의 국가별 구독 요금을 비교하세요. 가장 저렴한 나라를 찾아드립니다.",
});

onMounted(() => {
  loadServices();
});
</script>

<template>
  <div class="container py-8">
    <section class="retro-panel overflow-hidden mb-6">
      <div class="retro-titlebar">
        <h1 class="retro-title">OTT Price Community Board</h1>
        <span class="retro-kbd">LIVE</span>
      </div>
      <div class="p-4">
        <p class="text-body leading-relaxed">
          OTT 국가별 요금 데이터를 게시판처럼 빠르게 탐색하고, 트렌드와 반영 로그를 통해 가격 변동을 추적하세요.
        </p>
        <div class="mt-4 flex flex-wrap items-center gap-2">
          <RouterLink to="/changelog" class="retro-button-subtle">최근 반영 로그</RouterLink>
          <RouterLink to="/report" class="retro-button-subtle">가격 제보하기</RouterLink>
          <RouterLink to="/about" class="retro-button-subtle">서비스 소개</RouterLink>
        </div>
      </div>
    </section>

    <section class="retro-stat-grid mb-6">
      <div class="retro-stat">
        <p class="retro-stat-label">활성 서비스</p>
        <p class="retro-stat-value">{{ activeCount }}</p>
      </div>
      <div class="retro-stat">
        <p class="retro-stat-label">요금제 수</p>
        <p class="retro-stat-value">{{ totalPlans }}</p>
      </div>
      <div class="retro-stat">
        <p class="retro-stat-label">트렌드 페이지</p>
        <p class="retro-stat-value">{{ activeCount }}</p>
      </div>
      <div class="retro-stat">
        <p class="retro-stat-label">커뮤니티 메뉴</p>
        <p class="retro-stat-value">제보 · 로그</p>
      </div>
    </section>

    <section class="grid grid-cols-1 gap-6 lg:grid-cols-3">
      <div class="lg:col-span-2">
        <div class="retro-panel overflow-hidden">
          <div class="retro-titlebar">
            <h2 class="retro-title">서비스 목록</h2>
            <span class="text-tiny text-primary-foreground/90">가격표 + 트렌드 진입</span>
          </div>
          <div class="p-4">
            <div v-if="loading" class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Card v-for="i in 4" :key="i" class="animate-pulse">
                <CardContent class="p-4">
                  <div class="h-5 bg-muted rounded mb-3"></div>
                  <div class="h-3 bg-muted rounded w-2/3"></div>
                </CardContent>
              </Card>
            </div>

            <div v-else-if="error" class="text-center py-12">
              <p class="text-destructive text-body">{{ error }}</p>
            </div>

            <div v-else class="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <RouterLink
                v-for="service in services"
                :key="service.id"
                :to="`/${service.slug}`"
                class="block group"
              >
                <Card class="h-full transition-colors hover:bg-accent/40">
                  <CardHeader class="pb-2">
                    <div class="flex items-center gap-3">
                      <div
                        class="w-10 h-10 rounded-sm flex items-center justify-center text-white font-bold text-body border-2 border-border"
                        :style="{ backgroundColor: service.color }"
                      >
                        {{ service.name.charAt(0) }}
                      </div>
                      <CardTitle>{{ service.name }}</CardTitle>
                    </div>
                    <CardDescription class="text-caption">
                      {{ service.plans.map((p) => p.name).join(" · ") }}
                    </CardDescription>
                  </CardHeader>
                  <CardContent class="pt-0">
                    <div class="flex items-center justify-between">
                      <span class="retro-chip">가격표</span>
                      <span class="text-caption text-primary group-hover:underline">
                        보드 입장 →
                      </span>
                    </div>
                    <span class="text-tiny text-muted-foreground mt-2 inline-flex">
                      상세 페이지에서 트렌드 확인 가능
                    </span>
                  </CardContent>
                </Card>
              </RouterLink>
            </div>
          </div>
        </div>
      </div>

      <aside class="space-y-4">
        <div class="retro-panel overflow-hidden">
          <div class="retro-titlebar">
            <h3 class="retro-title">커뮤니티 메뉴</h3>
          </div>
          <div class="retro-board-list">
            <RouterLink to="/changelog" class="retro-board-item">
              <span>최근 반영 로그</span>
              <span class="retro-chip">NEW</span>
            </RouterLink>
            <RouterLink to="/report" class="retro-board-item">
              <span>가격 제보하기</span>
              <span class="retro-chip">WRITE</span>
            </RouterLink>
            <RouterLink to="/about" class="retro-board-item">
              <span>운영 방식</span>
              <span class="retro-chip">INFO</span>
            </RouterLink>
          </div>
        </div>

        <div class="retro-panel overflow-hidden">
          <div class="retro-titlebar">
            <h3 class="retro-title">빠른 시작</h3>
          </div>
          <div class="p-4 text-caption text-muted-foreground leading-relaxed space-y-2">
            <p>1. 서비스 선택 후 국가별 가격표 확인</p>
            <p>2. 트렌드 페이지에서 최근 변동 비교</p>
            <p>3. 차이가 보이면 제보 폼으로 업데이트 요청</p>
          </div>
        </div>
      </aside>
    </section>
  </div>
</template>
