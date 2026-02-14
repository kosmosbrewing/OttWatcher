<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, RouterLink } from "vue-router";
import { usePrices } from "@/composables/usePrices";
import { useServices } from "@/composables/useServices";
import { useSEO } from "@/composables/useSEO";
import { fetchContinents, fetchTrends } from "@/api";
import { formatNumber } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import PriceTable from "@/components/price/PriceTable.vue";
import PlanSelector from "@/components/filter/PlanSelector.vue";
import ContinentFilter from "@/components/filter/ContinentFilter.vue";
import SortToggle from "@/components/filter/SortToggle.vue";
import CurrencyToggle from "@/components/filter/CurrencyToggle.vue";

const route = useRoute();
const { services, loadServices } = useServices();
const {
  priceData,
  loading,
  error,
  selectedPlan,
  selectedContinent,
  sortOrder,
  displayCurrency,
  filteredPrices,
  baseCountryPrice,
  loadPrices,
} = usePrices();

const continents = ref({});
const trendData = ref(null);
const trendLoading = ref(false);

// 현재 서비스 메타 정보
const currentService = computed(() =>
  services.value.find((s) => s.slug === route.params.serviceSlug)
);

// 서비스명으로 SEO 동적 설정
const pageTitle = computed(() => {
  const name = currentService.value?.name || route.params.serviceSlug;
  return `${name} 국가별 가격 비교 | OTT 가격 비교`;
});

const pageDescription = computed(() => {
  const name = currentService.value?.name || route.params.serviceSlug;
  return `${name} 구독 요금을 30개국 기준으로 비교하세요. 가장 저렴한 나라와 절약률을 확인합니다.`;
});

useSEO({
  title: pageTitle,
  description: pageDescription,
});

function fmtKrw(val) {
  if (val == null) return "-";
  return `₩${formatNumber(Math.round(val))}`;
}

async function loadTrendData(serviceSlug) {
  trendLoading.value = true;
  try {
    trendData.value = await fetchTrends(serviceSlug);
  } catch {
    trendData.value = null;
  } finally {
    trendLoading.value = false;
  }
}

async function init() {
  await loadServices();
  loadPrices(route.params.serviceSlug);
  loadTrendData(route.params.serviceSlug);

  try {
    continents.value = await fetchContinents();
  } catch {
    // 대륙 데이터 로드 실패 시 무시 (필터만 비활성화)
  }
}

onMounted(init);

watch(
  () => route.params.serviceSlug,
  (slug) => {
    if (!slug) return;
    loadPrices(slug);
    loadTrendData(slug);
  }
);
</script>

<template>
  <div class="container py-8">
    <!-- 로딩 -->
    <div v-if="loading" class="text-center py-20">
      <div class="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      <p class="mt-4 text-body text-muted-foreground">가격 정보를 불러오는 중...</p>
    </div>

    <!-- 에러 -->
    <div v-else-if="error" class="text-center py-20">
      <p class="text-destructive text-body">{{ error }}</p>
    </div>

    <!-- 가격 데이터 -->
    <div v-else-if="priceData">
      <section class="retro-panel overflow-hidden mb-6">
        <div class="retro-titlebar">
          <h1 class="retro-title">{{ currentService?.name || route.params.serviceSlug }} Price Board</h1>
          <RouterLink :to="`/${route.params.serviceSlug}/trends`" class="retro-kbd hover:bg-primary-foreground/25">
            TRENDS
          </RouterLink>
        </div>
        <div class="p-4 space-y-3">
          <div class="flex items-center gap-3">
            <div
              v-if="currentService"
              class="w-10 h-10 rounded-sm flex items-center justify-center text-white font-bold text-body border-2 border-border"
              :style="{ backgroundColor: currentService.color }"
            >
              {{ currentService.name.charAt(0) }}
            </div>
            <p class="text-body">
              {{ currentService?.name || route.params.serviceSlug }} 국가별 가격 비교
            </p>
          </div>
          <div class="flex flex-wrap gap-2 text-tiny">
            <span class="retro-chip">업데이트 {{ priceData.lastUpdated }}</span>
            <span class="retro-chip">환율 기준 {{ priceData.exchangeRateDate }}</span>
            <span class="retro-chip">국가 {{ filteredPrices.length }}개</span>
          </div>
        </div>
      </section>

      <!-- 필터 영역 -->
      <Card class="mb-6 retro-panel">
        <CardContent class="space-y-4">
          <!-- 요금제 선택 + 통화/정렬 -->
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <PlanSelector
              v-if="currentService"
              :plans="currentService.plans"
              v-model="selectedPlan"
            />
            <div class="flex items-center gap-2">
              <CurrencyToggle v-model="displayCurrency" />
              <SortToggle v-model="sortOrder" />
            </div>
          </div>

          <!-- 대륙 필터 -->
          <ContinentFilter
            v-if="Object.keys(continents).length > 0"
            :continents="continents"
            v-model="selectedContinent"
          />
        </CardContent>
      </Card>

      <!-- 가격 테이블 -->
      <Card class="retro-panel overflow-hidden">
        <div class="retro-titlebar">
          <h2 class="retro-title">국가별 가격 리스트</h2>
          <span class="text-tiny text-primary-foreground/90">정렬/필터 반영 실시간</span>
        </div>
        <CardContent class="p-0 sm:p-2">
          <PriceTable
            :prices="filteredPrices"
            :selected-plan="selectedPlan"
            :display-currency="displayCurrency"
            :base-country-price="baseCountryPrice"
            :service-slug="route.params.serviceSlug"
          />
        </CardContent>
      </Card>

      <Card class="mt-6 retro-panel overflow-hidden">
        <div class="retro-titlebar">
          <h2 class="retro-title">최근 가격 변동 TOP 10</h2>
          <RouterLink :to="`/${route.params.serviceSlug}/trends`" class="retro-kbd hover:bg-primary-foreground/25">
            MORE
          </RouterLink>
        </div>
        <CardContent>
          <div class="flex items-center justify-between mb-3">
            <p class="text-caption text-muted-foreground">이전 스냅샷 대비 KRW 변동</p>
          </div>

          <div v-if="trendLoading" class="text-caption text-muted-foreground">트렌드 데이터 로딩 중...</div>
          <div v-else-if="trendData?.biggestDrops?.length">
            <ul class="space-y-2">
              <li
                v-for="item in trendData.biggestDrops"
                :key="item.countryCode"
                class="flex items-center justify-between gap-3 text-caption"
              >
                <RouterLink :to="`/${route.params.serviceSlug}/${item.countryCode.toLowerCase()}`" class="hover:text-primary">
                  {{ countryFlag(item.countryCode) }} {{ item.country }}
                </RouterLink>
                <div class="tabular-nums">
                  <span :class="item.changeKrw < 0 ? 'text-savings' : 'text-destructive'">
                    {{ item.changeKrw > 0 ? "+" : "" }}{{ formatNumber(item.changeKrw) }}원
                  </span>
                  <span class="text-muted-foreground ml-2">현재 {{ fmtKrw(item.currentKrw) }}</span>
                </div>
              </li>
            </ul>
          </div>
          <div v-else class="text-caption text-muted-foreground">
            비교할 변동 데이터가 없습니다.
          </div>

          <div class="mt-4 pt-3 border-t text-caption flex items-center gap-2">
            <RouterLink to="/report" class="retro-link">가격 제보하기</RouterLink>
            <span class="text-muted-foreground ml-2">정보가 다르면 바로 제보해 주세요.</span>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
