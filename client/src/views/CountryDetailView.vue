<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, RouterLink } from "vue-router";
import { usePrices } from "@/composables/usePrices";
import { useServices } from "@/composables/useServices";
import { useSEO } from "@/composables/useSEO";
import {
  fetchTrends,
  subscribePriceAlert,
  type CountryPrice,
  type ServiceInfo,
  type ServicePlan,
  type TrendPoint,
  type TrendsResponse,
} from "@/api";
import { formatNumber, calcSavingsPercent, countryFlag } from "@/lib/utils";
import { getSiteUrl } from "@/lib/site";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { LoadingSpinner } from "@/components/ui/loading";
import SavingsBadge from "@/components/price/SavingsBadge.vue";
import { ArrowLeft } from "lucide-vue-next";

const route = useRoute();
const { services, loadServices } = useServices();
const { priceData, loading, error, baseCountryPrice, loadPrices } = usePrices();
const trendData = ref<TrendsResponse | null>(null);
const siteUrl = getSiteUrl();
const serviceSlug = computed(() => {
  const slug = route.params.serviceSlug;
  return typeof slug === "string" ? slug : "";
});
const countryCode = computed(() => {
  const code = route.params.countryCode;
  return typeof code === "string" ? code : "";
});

const alertEmail = ref("");
const alertTargetPrice = ref("");
const alertSubmitting = ref(false);
const alertSuccess = ref("");
const alertError = ref("");

// 현재 서비스 메타
const currentService = computed<ServiceInfo | undefined>(() =>
  services.value.find((s) => s.slug === serviceSlug.value)
);

// 현재 국가 데이터
const countryData = computed<CountryPrice | null>(() => {
  if (!priceData.value?.prices) return null;
  const code = countryCode.value.toUpperCase();
  return priceData.value.prices.find((p) => p.countryCode === code) || null;
});

// 국기 이모지
const flag = computed(() => countryFlag(countryData.value?.countryCode));

// 이 국가의 전체 순위 (개인 요금제 KRW 기준)
const rank = computed<number | null>(() => {
  if (!priceData.value?.prices || !countryData.value) return null;
  const sorted = [...priceData.value.prices].sort(
    (a, b) => (a.converted?.individual?.krw ?? Infinity) - (b.converted?.individual?.krw ?? Infinity)
  );
  return sorted.findIndex((p) => p.countryCode === countryData.value.countryCode) + 1;
});

// 같은 대륙 다른 국가 (최대 5개, 가격순)
const nearbyCountries = computed<CountryPrice[]>(() => {
  if (!priceData.value?.prices || !countryData.value) return [];
  return priceData.value.prices
    .filter(
      (p) =>
        p.continent === countryData.value.continent &&
        p.countryCode !== countryData.value.countryCode
    )
    .sort((a, b) => (a.converted?.individual?.krw ?? Infinity) - (b.converted?.individual?.krw ?? Infinity))
    .slice(0, 5);
});

const countryHistory = computed<TrendPoint[]>(() => {
  const code = countryData.value?.countryCode?.toUpperCase();
  if (!code || !trendData.value?.countryChanges) return [];
  return trendData.value.countryChanges[code] || [];
});

type PlanPriceRow = ServicePlan & {
  localMonthly?: number;
  localYearly?: number;
  usd?: number;
  krw?: number;
  baseKrw?: number;
};

// 요금제별 가격 정보 배열로 변환
const planPrices = computed<PlanPriceRow[]>(() => {
  if (!currentService.value || !countryData.value) return [];
  return (currentService.value.plans || []).map((plan) => {
    const local = countryData.value.plans?.[plan.id];
    const converted = countryData.value.converted?.[plan.id];
    const baseConverted = baseCountryPrice.value?.converted?.[plan.id];
    return {
      ...plan,
      localMonthly: local?.monthly,
      localYearly: local?.yearly,
      usd: converted?.usd,
      krw: converted?.krw,
      baseKrw: baseConverted?.krw,
    };
  });
});

// SEO
const pageTitle = computed(() => {
  const svc = currentService.value?.name || serviceSlug.value;
  const country = countryData.value?.country || countryCode.value.toUpperCase();
  return `${svc} ${country} 가격 · 나라별 구독료 비교 | OTT 가격 비교`;
});

const pageDescription = computed(() => {
  const svc = currentService.value?.name || serviceSlug.value;
  const country = countryData.value?.country || countryCode.value.toUpperCase();
  const krw = countryData.value?.converted?.individual?.krw;
  const savings = krw && baseCountryPrice.value?.converted?.individual?.krw
    ? calcSavingsPercent(krw, baseCountryPrice.value.converted.individual.krw)
    : 0;
  if (savings > 0) {
    return `${svc} ${country} 월 ₩${formatNumber(Math.round(krw))} — 한국 대비 ${savings}% 절약. 국가별 요금제 상세 가격 비교.`;
  }
  return `${svc} ${country} 구독 요금 상세 정보. 개인/가족/학생 요금제별 나라별 가격 비교.`;
});

const countryDetailJsonLd = computed<Record<string, unknown> | undefined>(() => {
  if (!countryData.value) return undefined;

  const normalizedCountryCode = countryData.value.countryCode.toLowerCase();
  const serviceName = currentService.value?.name || "유튜브 프리미엄";
  const countryName = countryData.value.country || normalizedCountryCode.toUpperCase();

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          {
            "@type": "ListItem",
            position: 1,
            name: "홈",
            item: `${siteUrl}/`,
          },
          {
            "@type": "ListItem",
            position: 2,
            name: serviceName,
            item: `${siteUrl}/${serviceSlug.value}`,
          },
          {
            "@type": "ListItem",
            position: 3,
            name: countryName,
            item: `${siteUrl}/${serviceSlug.value}/${normalizedCountryCode}`,
          },
        ],
      },
    ],
  };
});

useSEO({
  title: pageTitle,
  description: pageDescription,
  ogImage: `${siteUrl}/og-image.png`,
  jsonLd: countryDetailJsonLd,
});

// 통화 포맷 헬퍼
function fmtKrw(val: number | null | undefined): string {
  if (val == null) return "-";
  return `₩${formatNumber(Math.round(val))}`;
}

function fmtUsd(val: number | null | undefined): string {
  if (val == null) return "-";
  return `$${val.toFixed(2)}`;
}

function fmtLocal(val: number | null | undefined, currency: string | undefined): string {
  if (val == null) return "-";
  return `${formatNumber(val)} ${currency || ""}`.trim();
}

async function loadTrendData(service: string): Promise<void> {
  try {
    trendData.value = await fetchTrends(service);
  } catch {
    trendData.value = null;
  }
}

async function submitAlert(): Promise<void> {
  if (!countryData.value || !currentService.value || !serviceSlug.value) return;
  alertError.value = "";
  alertSuccess.value = "";
  alertSubmitting.value = true;

  try {
    const response = await subscribePriceAlert({
      serviceSlug: serviceSlug.value,
      countryCode: countryData.value.countryCode,
      planId: "individual",
      targetPriceKrw: Number(alertTargetPrice.value),
      email: alertEmail.value.trim(),
    });
    alertSuccess.value = String(response.message || "알림 신청이 완료되었습니다.");
    alertTargetPrice.value = "";
  } catch (e: unknown) {
    alertError.value = e instanceof Error ? e.message : "신청 처리 중 오류가 발생했습니다.";
  } finally {
    alertSubmitting.value = false;
  }
}

async function init(): Promise<void> {
  await loadServices();
  if (!serviceSlug.value) return;
  await Promise.all([loadPrices(serviceSlug.value), loadTrendData(serviceSlug.value)]);
}

onMounted(init);

watch(
  [serviceSlug, countryCode],
  () => {
    if (!serviceSlug.value) return;
    void Promise.all([loadPrices(serviceSlug.value), loadTrendData(serviceSlug.value)]);
  }
);
</script>

<template>
  <div class="container py-6">
    <!-- 로딩 -->
    <LoadingSpinner v-if="loading" message="가격 정보를 불러오는 중..." />

    <!-- 에러 / 국가 없음 -->
    <div v-else-if="error || (!loading && !countryData)" class="text-center py-20">
      <p class="text-destructive text-body mb-4">
        {{ error || '해당 국가의 가격 정보를 찾을 수 없습니다.' }}
      </p>
      <RouterLink :to="`/${serviceSlug}`" class="text-primary text-body hover:underline">
        ← 전체 가격표로 돌아가기
      </RouterLink>
    </div>

    <!-- 국가 상세 -->
    <div v-else-if="countryData" class="space-y-4">

      <!-- 뒤로가기 -->
      <RouterLink :to="`/${serviceSlug}`" class="retro-button-subtle inline-flex items-center gap-1">
        <ArrowLeft class="h-3.5 w-3.5" />
        전체 가격표
      </RouterLink>

      <!-- 헤더 -->
      <section class="retro-panel overflow-hidden">
        <div class="retro-titlebar">
          <h1 class="retro-title">{{ currentService?.name || serviceSlug }} — {{ countryData.country }}</h1>
          <span v-if="rank" class="retro-kbd text-[0.62rem]">{{ rank }}위 / {{ priceData.prices.length }}개국</span>
        </div>
        <div class="retro-panel-content flex items-center gap-4">
          <span class="text-[3rem] leading-none shrink-0">{{ flag }}</span>
          <div class="min-w-0">
            <div class="flex flex-wrap items-center gap-1.5 mb-1">
              <span class="retro-kbd text-[0.62rem]">{{ countryData.currency }}</span>
              <span class="retro-kbd text-[0.62rem]">{{ countryData.continent }}</span>
            </div>
            <p class="text-tiny text-muted-foreground">
              데이터 기준 {{ priceData.lastUpdated }} · 환율 기준 {{ priceData.exchangeRateDate }}
            </p>
          </div>
        </div>
      </section>

      <!-- 요금제별 가격 카드 -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div
          v-for="plan in planPrices"
          :key="plan.id"
          class="retro-panel overflow-hidden border border-border/40"
        >
          <div class="retro-titlebar">
            <span class="retro-title">{{ plan.name }}</span>
            <SavingsBadge
              v-if="plan.krw != null && plan.baseKrw != null"
              :price="plan.krw"
              :base-price="plan.baseKrw"
            />
          </div>
          <div class="p-3 space-y-2.5">
            <!-- KRW 메인 -->
            <div>
              <p class="text-[0.62rem] uppercase tracking-wide text-muted-foreground">월 원화 환산</p>
              <p class="text-h2 text-primary tabular-nums mt-0.5">{{ fmtKrw(plan.krw) }}</p>
            </div>
            <!-- USD + 현지가격 -->
            <div class="grid grid-cols-2 gap-2">
              <div class="border border-border/50 px-2 py-1.5">
                <p class="text-[0.62rem] uppercase tracking-wide text-muted-foreground">달러(USD)</p>
                <p class="text-caption font-medium tabular-nums mt-0.5">{{ fmtUsd(plan.usd) }}</p>
              </div>
              <div class="border border-border/50 px-2 py-1.5">
                <p class="text-[0.62rem] uppercase tracking-wide text-muted-foreground">현지 가격</p>
                <p class="text-caption font-medium tabular-nums mt-0.5">{{ fmtLocal(plan.localMonthly, countryData.currency) }}</p>
              </div>
            </div>
            <!-- 한국 대비 -->
            <div v-if="plan.baseKrw != null" class="border-t border-border/50 pt-2 flex items-center justify-between">
              <div>
                <p class="text-[0.62rem] text-muted-foreground">한국 {{ fmtKrw(plan.baseKrw) }}/월</p>
                <p v-if="plan.krw != null && plan.baseKrw > plan.krw" class="text-caption font-semibold text-savings mt-0.5">
                  월 {{ fmtKrw(plan.baseKrw - plan.krw) }} 절약
                </p>
                <p v-else-if="plan.krw != null && plan.baseKrw <= plan.krw" class="text-caption text-muted-foreground mt-0.5">
                  한국보다 비싸거나 동일
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- 최근 가격 변동 -->
      <div class="retro-panel overflow-hidden border border-border/40">
        <div class="retro-titlebar">
          <h2 class="retro-title">최근 가격 변동</h2>
          <span class="text-tiny text-muted-foreground">개인 요금제 기준</span>
        </div>
        <div class="retro-panel-content">
          <ul v-if="countryHistory.length > 0" class="divide-y divide-border/40">
            <li
              v-for="(point, idx) in countryHistory"
              :key="`${point.date}-${idx}`"
              class="flex items-center justify-between py-2 first:pt-0 last:pb-0"
            >
              <span class="text-caption text-muted-foreground">{{ point.date }}</span>
              <span class="text-caption tabular-nums font-semibold">{{ fmtKrw(point.krw) }}</span>
            </li>
          </ul>
          <p v-else class="text-caption text-muted-foreground">표시할 변동 이력이 없습니다.</p>
        </div>
      </div>

      <!-- 가격 하락 알림 -->
      <div class="retro-panel overflow-hidden border border-border/40">
        <div class="retro-titlebar">
          <h2 class="retro-title">가격 하락 알림</h2>
          <span class="retro-kbd text-[0.62rem]">베타</span>
        </div>
        <div class="retro-panel-content">
          <form class="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end" @submit.prevent="submitAlert">
            <label class="sm:col-span-2 space-y-1">
              <span class="text-tiny text-muted-foreground">이메일</span>
              <input v-model="alertEmail" required type="email" placeholder="you@example.com" class="retro-input" />
            </label>
            <label class="space-y-1">
              <span class="text-tiny text-muted-foreground">목표가 (원화)</span>
              <input v-model="alertTargetPrice" required min="1" type="number" class="retro-input" />
            </label>
            <div class="sm:col-span-3">
              <button type="submit" :disabled="alertSubmitting" class="retro-button disabled:opacity-50">
                {{ alertSubmitting ? "신청 중..." : "알림 신청" }}
              </button>
            </div>
          </form>
          <p v-if="alertError" class="text-caption text-destructive mt-3">{{ alertError }}</p>
          <p v-if="alertSuccess" class="text-caption text-savings mt-3">{{ alertSuccess }}</p>
        </div>
      </div>

      <!-- 같은 대륙 국가 비교 -->
      <div v-if="nearbyCountries.length > 0" class="retro-panel overflow-hidden border border-border/40">
        <div class="retro-titlebar">
          <h2 class="retro-title">같은 대륙 국가 비교</h2>
          <span class="text-tiny text-muted-foreground">개인 요금제 · 가격순 상위 5개</span>
        </div>
        <Table>
          <TableHeader class="[&_th]:bg-background/95">
            <TableRow>
              <TableHead>국가</TableHead>
              <TableHead class="text-right w-[100px]">원화</TableHead>
              <TableHead class="text-right w-[64px]">절약률</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="nearby in nearbyCountries"
              :key="nearby.countryCode"
              class="group/row hover:bg-primary/10"
              :class="nearby.countryCode === countryData.countryCode ? 'bg-accent/40' : ''"
            >
              <TableCell>
                <RouterLink
                  :to="`/${serviceSlug}/${nearby.countryCode.toLowerCase()}`"
                  class="inline-flex items-center gap-2 transition-colors font-semibold group-hover/row:text-primary"
                >
                  <span class="text-body">{{ countryFlag(nearby.countryCode) }}</span>
                  <span class="text-caption">{{ nearby.country }}</span>
                </RouterLink>
              </TableCell>
              <TableCell class="text-right font-semibold text-body tabular-nums w-[100px]">
                {{ fmtKrw(nearby.converted?.individual?.krw) }}
              </TableCell>
              <TableCell class="text-right w-[64px]">
                <SavingsBadge
                  v-if="nearby.converted?.individual?.krw != null && baseCountryPrice?.converted?.individual?.krw != null"
                  :price="nearby.converted.individual.krw"
                  :base-price="baseCountryPrice.converted.individual.krw"
                />
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

    </div>
  </div>
</template>
