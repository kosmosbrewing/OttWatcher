<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, RouterLink } from "vue-router";
import { usePrices } from "@/composables/usePrices";
import { useServices } from "@/composables/useServices";
import { useSEO } from "@/composables/useSEO";
import { fetchTrends, type TrendsResponse } from "@/api";
import { formatNumber, countryFlag } from "@/lib/utils";
import { getSiteUrl } from "@/lib/site";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { LoadingSpinner } from "@/components/ui/loading";
import PriceTable from "@/components/price/PriceTable.vue";
import PlanSelector from "@/components/filter/PlanSelector.vue";
import SortToggle from "@/components/filter/SortToggle.vue";
import CurrencyToggle from "@/components/filter/CurrencyToggle.vue";
import AnonymousCommunityPanel from "@/components/community/AnonymousCommunityPanel.vue";

const route = useRoute();
const { services, loadServices } = useServices();
const {
  priceData,
  loading,
  error,
  selectedPlan,
  sortOrder,
  displayCurrency,
  filteredPrices,
  baseCountryPrice,
  loadPrices,
} = usePrices();

const showTrendTop10 = false;
const trendData = ref<TrendsResponse | null>(null);
const trendLoading = ref(false);
const serviceSlug = computed(() => {
  const slug = route.params.serviceSlug;
  return typeof slug === "string" ? slug : "";
});

// 현재 서비스 메타 정보
const currentService = computed(() =>
  services.value.find((s) => s.slug === serviceSlug.value)
);

const SEO_MAP: Record<string, { title: string; description: string }> = {
  "youtube-premium": {
    title: "유튜브 프리미엄 국가별 가격 비교 · 최저가 순위",
    description:
      "유튜브 프리미엄 국가별 구독료를 한눈에 비교. 터키·인도 등 해외 결제로 최대 80% 절약 가능. 현재 환율 기준 최저가 국가 순위를 확인하세요.",
  },
};

const boardHeading = computed(() => {
  const labelMap: Record<string, string> = {
    "youtube-premium": "유튜브 프리미엄 국가별 최저가 비교",
  };

  if (labelMap[serviceSlug.value]) {
    return labelMap[serviceSlug.value];
  }

  return `${currentService.value?.name || serviceSlug.value} 국가별 가격 비교`;
});

// 서비스명으로 SEO 동적 설정
const pageTitle = computed(() => {
  return (
    SEO_MAP[serviceSlug.value]?.title ||
    "유튜브 프리미엄 국가별 가격 비교 · 최저가 순위"
  );
});

const pageDescription = computed(() => {
  return (
    SEO_MAP[serviceSlug.value]?.description ||
    "유튜브 프리미엄 구독 요금을 국가별로 비교하고 가장 저렴한 나라와 절약률을 확인하세요."
  );
});

type SummaryPriceRow = {
  countryCode: string;
  country: string;
  krw: number;
};

function toNumber(value: unknown): number | null {
  if (value == null) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

const siteUrl = getSiteUrl();

const individualPriceRows = computed<SummaryPriceRow[]>(() => {
  if (!priceData.value?.prices) return [];

  return priceData.value.prices
    .map((country) => {
      const krw = toNumber(country.converted?.individual?.krw);
      if (krw == null) return null;

      return {
        countryCode: country.countryCode,
        country: typeof country.country === "string" ? country.country : country.countryCode,
        krw,
      };
    })
    .filter((row): row is SummaryPriceRow => row !== null);
});

const cheapestSummary = computed<SummaryPriceRow | null>(() => {
  if (!individualPriceRows.value.length) return null;

  return [...individualPriceRows.value].sort((a, b) => a.krw - b.krw)[0] || null;
});

const baseCountrySummary = computed<SummaryPriceRow | null>(() => {
  const baseCountryCode = (priceData.value?.baseCountry || "").toUpperCase();
  if (!baseCountryCode) return null;

  return (
    individualPriceRows.value.find((country) => country.countryCode === baseCountryCode) || null
  );
});

const summarySavingsPercent = computed(() => {
  if (!cheapestSummary.value || !baseCountrySummary.value || baseCountrySummary.value.krw <= 0) {
    return 0;
  }

  return Math.max(
    0,
    Math.round(
      ((baseCountrySummary.value.krw - cheapestSummary.value.krw) / baseCountrySummary.value.krw) *
        100
    )
  );
});

const summaryTitle = computed(() => {
  const name = currentService.value?.name || serviceSlug.value;
  return `${name} 최저가 요약`;
});

const itemListElements = computed<Record<string, unknown>[]>(() => {
  const base = baseCountrySummary.value;
  const baseCountryName = base?.country || "한국";
  const baseKrw = base?.krw || null;

  return [...individualPriceRows.value]
    .sort((a, b) => a.krw - b.krw)
    .slice(0, 10)
    .map((row, index) => {
      const savingsPercent =
        baseKrw && baseKrw > 0
          ? Math.max(0, Math.round(((baseKrw - row.krw) / baseKrw) * 100))
          : null;
      const description =
        savingsPercent != null
          ? `월 ${fmtKrw(row.krw)} (${baseCountryName} 대비 ${savingsPercent}% 저렴)`
          : `월 ${fmtKrw(row.krw)}`;

      return {
        "@type": "ListItem",
        position: index + 1,
        name: row.country,
        description,
      };
    });
});

const seoJsonLd = computed<Record<string, unknown> | undefined>(() => {
  const cheapest = cheapestSummary.value;
  const serviceName = currentService.value?.name || serviceSlug.value;
  if (!cheapest || !serviceName) return undefined;

  const base = baseCountrySummary.value;
  const baseCountryName = base?.country || "한국";
  const baseCountryCode = (priceData.value?.baseCountry || "").toUpperCase();

  const cheapestAnswer =
    base && summarySavingsPercent.value > 0
      ? `현재 환율 기준 ${cheapest.country}가 월 ${fmtKrw(cheapest.krw)}으로 가장 저렴합니다. ${baseCountryName}(${fmtKrw(base.krw)}) 대비 약 ${summarySavingsPercent.value}% 저렴합니다.`
      : `현재 환율 기준 ${cheapest.country}가 월 ${fmtKrw(cheapest.krw)}으로 가장 저렴합니다.`;

  const baseAnswer = base
    ? `${base.country} ${serviceName} 개인 요금제는 월 ${fmtKrw(base.krw)}입니다.`
    : `${serviceName} 기본 요금은 서비스 상세 페이지에서 확인할 수 있습니다.`;

  const graph: Record<string, unknown>[] = [
    {
      "@type": "FAQPage",
      mainEntity: [
        {
          "@type": "Question",
          name: `${serviceName} 가장 저렴한 나라는?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: cheapestAnswer,
          },
        },
        {
          "@type": "Question",
          name:
            baseCountryCode === "KR"
              ? `한국 ${serviceName} 구독료는?`
              : `${baseCountryName} ${serviceName} 구독료는?`,
          acceptedAnswer: {
            "@type": "Answer",
            text: baseAnswer,
          },
        },
      ],
    },
  ];

  if (itemListElements.value.length > 0) {
    graph.push({
      "@type": "ItemList",
      name: `${serviceName} 국가별 가격 순위`,
      itemListElement: itemListElements.value,
    });
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
});

useSEO({
  title: pageTitle,
  description: pageDescription,
  ogImage: `${siteUrl}/dist/og.png`,
  jsonLd: seoJsonLd,
});

function fmtKrw(val: number | null | undefined): string {
  if (val == null) return "-";
  return `₩${formatNumber(Math.round(val))}`;
}

function fmtDeltaKrw(value: number | null | undefined): string {
  if (value == null) return "-";
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatNumber(value)}원`;
}

async function loadTrendData(service: string): Promise<void> {
  trendLoading.value = true;
  try {
    trendData.value = await fetchTrends(service);
  } catch {
    trendData.value = null;
  } finally {
    trendLoading.value = false;
  }
}

async function init(): Promise<void> {
  await loadServices();
  if (!serviceSlug.value) return;
  await loadPrices(serviceSlug.value);
  if (showTrendTop10) {
    await loadTrendData(serviceSlug.value);
  }
}

onMounted(init);

watch(
  serviceSlug,
  (slug) => {
    if (!slug) return;
    void loadPrices(slug);
    if (showTrendTop10) {
      void loadTrendData(slug);
    }
  }
);
</script>

<template>
  <div class="container py-6">
    <!-- 로딩 -->
    <LoadingSpinner v-if="loading" message="가격 정보를 불러오는 중..." />

    <!-- 에러 -->
    <div v-else-if="error" class="text-center py-20">
      <p class="text-destructive text-body">{{ error }}</p>
    </div>

    <!-- 가격 데이터 -->
    <div v-else-if="priceData" class="third-rate-board">
      <section class="retro-panel overflow-hidden mb-4">
        <div class="retro-titlebar">
          <h1 class="retro-title">{{ boardHeading }}</h1>
        </div>
      </section>

      <Card class="mb-4 retro-panel overflow-hidden">
        <div class="retro-titlebar">
          <h2 class="retro-title">{{ summaryTitle }}</h2>
        </div>
        <CardContent class="space-y-2">
          <p v-if="cheapestSummary" class="text-body">
            최저가:
            <span class="font-bold">
              {{ countryFlag(cheapestSummary.countryCode) }} {{ cheapestSummary.country }}
            </span>
            <span class="font-bold"> — {{ fmtKrw(cheapestSummary.krw) }}/월</span>
            <span
              v-if="baseCountrySummary && summarySavingsPercent > 0"
              class="text-savings font-bold"
            >
              ({{ baseCountrySummary.country }} 대비 {{ summarySavingsPercent }}% 저렴)
            </span>
          </p>
          <p v-if="baseCountrySummary" class="text-caption text-muted-foreground">
            기준 국가 가격: {{ fmtKrw(baseCountrySummary.krw) }}/월
          </p>
          <p class="text-caption text-muted-foreground">
            * 현재 환율 기준 / 해외 결제 방법은 별도 확인 필요
          </p>
        </CardContent>
      </Card>

      <!-- 필터 영역 -->
      <Card class="mb-4 retro-panel">
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
        </CardContent>
      </Card>

      <!-- 가격 테이블 + 우측 익명 커뮤니티 -->
      <section class="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]">
        <div class="space-y-4">
          <Card class="retro-panel overflow-hidden">
            <div class="retro-titlebar">
              <h2 class="retro-title">국가별 가격 랭킹</h2>
            </div>
            <CardContent>
              <PriceTable
                :prices="filteredPrices"
                :selected-plan="selectedPlan"
                :display-currency="displayCurrency"
                :base-country-price="baseCountryPrice"
                :service-slug="serviceSlug"
              />
              <div class="mt-2 flex flex-wrap items-center justify-end gap-2 text-[0.72rem] sm:text-[0.76rem] font-medium leading-tight">
                <span class="text-muted-foreground">총 {{ filteredPrices.length }}개국</span>
                <span class="text-muted-foreground">· 업데이트 {{ priceData.lastUpdated }}</span>
                <span class="text-muted-foreground">· 환율 기준 {{ priceData.exchangeRateDate }}</span>
              </div>
            </CardContent>
          </Card>

          <Card v-if="showTrendTop10" class="retro-panel overflow-hidden">
            <div class="retro-titlebar">
              <h2 class="retro-title">최근 가격 변동 TOP 10</h2>
              <RouterLink :to="`/${serviceSlug}/trends`" class="retro-kbd hover:bg-primary-foreground/25">
                MORE
              </RouterLink>
            </div>
            <CardContent>
              <LoadingSpinner v-if="trendLoading" variant="dots" size="sm" :center="false" />
              <div v-else-if="trendData?.biggestDrops?.length">
                <Table>
                  <TableHeader class="sticky top-0 z-10 bg-background">
                    <TableRow>
                      <TableHead class="text-body text-muted-foreground">국가</TableHead>
                      <TableHead class="text-body text-muted-foreground text-right">이전</TableHead>
                      <TableHead class="text-body text-muted-foreground text-right">현재</TableHead>
                      <TableHead class="text-body text-muted-foreground text-right">변동</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow v-for="item in trendData.biggestDrops" :key="item.countryCode">
                      <TableCell>
                        <RouterLink
                          :to="`/${serviceSlug}/${item.countryCode.toLowerCase()}`"
                          class="inline-flex items-center gap-2 hover:text-primary transition-colors font-semibold"
                        >
                          <span class="text-body">{{ countryFlag(item.countryCode) }}</span>
                          <span class="text-body">{{ item.country }}</span>
                        </RouterLink>
                      </TableCell>
                      <TableCell class="text-caption text-muted-foreground text-right tabular-nums">{{ fmtKrw(item.previousKrw) }}</TableCell>
                      <TableCell class="font-semibold text-body text-foreground text-right tabular-nums">{{ fmtKrw(item.currentKrw) }}</TableCell>
                      <TableCell
                        class="text-body text-right tabular-nums"
                        :class="item.changeKrw < 0 ? 'text-savings' : 'text-destructive'"
                      >
                        {{ fmtDeltaKrw(item.changeKrw) }}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              <div v-else class="text-caption text-muted-foreground">
                비교할 변동 데이터가 없습니다.
              </div>
            </CardContent>
          </Card>
        </div>

        <aside class="space-y-4">
          <AnonymousCommunityPanel :service-slug="serviceSlug" />
        </aside>
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

.third-rate-board :deep(th) {
  font-size: clamp(0.9rem, 1.3vw, 1.05rem);
  font-weight: 800;
}

.third-rate-board :deep(td) {
  font-size: clamp(0.9rem, 1.2vw, 1rem);
  font-weight: 650;
}
</style>
