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
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import SavingsBadge from "@/components/price/SavingsBadge.vue";
import { ArrowLeft } from "lucide-vue-next";

const route = useRoute();
const { services, loadServices } = useServices();
const { priceData, loading, error, baseCountryPrice, loadPrices } = usePrices();
const trendData = ref<TrendsResponse | null>(null);
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
  return `${svc} ${country} 가격 | OTT 가격 비교`;
});

const pageDescription = computed(() => {
  const svc = currentService.value?.name || serviceSlug.value;
  const country = countryData.value?.country || countryCode.value.toUpperCase();
  const krw = countryData.value?.converted?.individual?.krw;
  const savings = krw && baseCountryPrice.value?.converted?.individual?.krw
    ? calcSavingsPercent(krw, baseCountryPrice.value.converted.individual.krw)
    : 0;
  if (savings > 0) {
    return `${svc} ${country} 월 ₩${formatNumber(Math.round(krw))} — 한국 대비 ${savings}% 절약. 요금제별 상세 가격 비교.`;
  }
  return `${svc} ${country} 구독 요금 상세 정보. 개인/가족/학생 요금제별 가격 비교.`;
});

useSEO({ title: pageTitle, description: pageDescription });

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
  <div class="container py-8">
    <!-- 로딩 -->
    <div v-if="loading" class="text-center py-20">
      <div class="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      <p class="mt-4 text-body text-muted-foreground">가격 정보를 불러오는 중...</p>
    </div>

    <!-- 에러 / 국가 없음 -->
    <div v-else-if="error || (!loading && !countryData)" class="text-center py-20">
      <p class="text-destructive text-body mb-4">
        {{ error || '해당 국가의 가격 정보를 찾을 수 없습니다.' }}
      </p>
      <RouterLink
        :to="`/${serviceSlug}`"
        class="text-primary text-body hover:underline"
      >
        ← 전체 가격표로 돌아가기
      </RouterLink>
    </div>

    <!-- 국가 상세 -->
    <div v-else-if="countryData">
      <!-- 뒤로가기 -->
      <RouterLink
        :to="`/${serviceSlug}`"
        class="retro-button-subtle mb-4"
      >
        <ArrowLeft class="h-3.5 w-3.5" />
        전체 가격표
      </RouterLink>

      <!-- 헤더 -->
      <section class="retro-panel overflow-hidden mb-6">
        <div class="retro-titlebar">
          <h1 class="retro-title">{{ countryData.country }} 국가 상세</h1>
          <span class="retro-kbd">RANK {{ rank || "-" }}</span>
        </div>
        <div class="retro-panel-content flex items-start gap-4">
          <span class="text-4xl">{{ flag }}</span>
          <div>
            <h2 class="text-h2 mb-1">
              {{ currentService?.name || serviceSlug }} {{ countryData.country }} 가격
            </h2>
            <div class="flex flex-wrap items-center gap-2 text-caption text-muted-foreground">
              <span class="retro-chip">통화 {{ countryData.currency }}</span>
              <span class="retro-chip" v-if="rank">전체 {{ priceData.prices.length }}개국 중 {{ rank }}위</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 요금제별 가격 카드 -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <Card
          v-for="plan in planPrices"
          :key="plan.id"
          class="relative overflow-hidden retro-panel"
        >
          <CardHeader class="pb-3">
            <div class="flex items-center justify-between">
              <CardTitle class="text-heading">{{ plan.name }}</CardTitle>
              <SavingsBadge
                v-if="plan.krw != null && plan.baseKrw != null"
                :price="plan.krw"
                :base-price="plan.baseKrw"
              />
            </div>
            <p class="text-caption text-muted-foreground">{{ plan.nameEn }}</p>
          </CardHeader>
          <CardContent class="space-y-3">
            <!-- KRW 환산 (메인) -->
            <div>
              <p class="text-tiny text-muted-foreground uppercase">월 구독료 (KRW)</p>
              <p class="text-h2 text-primary">{{ fmtKrw(plan.krw) }}</p>
            </div>

            <!-- USD 환산 -->
            <div>
              <p class="text-tiny text-muted-foreground uppercase">USD</p>
              <p class="text-body font-medium">{{ fmtUsd(plan.usd) }}</p>
            </div>

            <!-- 현지 통화 -->
            <div>
              <p class="text-tiny text-muted-foreground uppercase">현지 가격</p>
              <p class="text-body">{{ fmtLocal(plan.localMonthly, countryData.currency) }}</p>
            </div>

            <!-- 한국 가격 비교 -->
            <div v-if="plan.baseKrw != null" class="pt-3 border-t">
              <p class="text-tiny text-muted-foreground">한국 가격</p>
              <p class="text-caption text-muted-foreground">{{ fmtKrw(plan.baseKrw) }}/월</p>
              <p v-if="plan.krw != null && plan.baseKrw > plan.krw" class="text-caption text-savings font-medium mt-1">
                월 {{ fmtKrw(plan.baseKrw - plan.krw) }} 절약
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <!-- 메타 정보 -->
      <Card class="mb-8 retro-panel overflow-hidden">
        <div class="retro-titlebar">
          <h2 class="retro-title">데이터 메타</h2>
        </div>
        <CardContent>
          <div class="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            <div>
              <p class="text-tiny text-muted-foreground uppercase">마지막 업데이트</p>
              <p class="text-caption font-medium">{{ priceData.lastUpdated }}</p>
            </div>
            <div>
              <p class="text-tiny text-muted-foreground uppercase">환율 기준일</p>
              <p class="text-caption font-medium">{{ priceData.exchangeRateDate }}</p>
            </div>
            <div>
              <p class="text-tiny text-muted-foreground uppercase">대륙</p>
              <p class="text-caption font-medium">{{ countryData.continent }}</p>
            </div>
            <div>
              <p class="text-tiny text-muted-foreground uppercase">순위</p>
              <p class="text-caption font-medium">{{ rank }} / {{ priceData.prices.length }}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card class="mb-8 retro-panel overflow-hidden">
        <CardHeader>
          <CardTitle>최근 변동 이력 (개인 요금제)</CardTitle>
        </CardHeader>
        <CardContent>
          <ul v-if="countryHistory.length > 0" class="space-y-2">
            <li
              v-for="(point, idx) in countryHistory"
              :key="`${point.date}-${idx}`"
              class="flex items-center justify-between text-caption"
            >
              <span>{{ point.date }}</span>
              <span class="tabular-nums font-medium">{{ fmtKrw(point.krw) }}</span>
            </li>
          </ul>
          <p v-else class="text-caption text-muted-foreground">표시할 변동 이력이 없습니다.</p>
        </CardContent>
      </Card>

      <Card class="mb-8 retro-panel overflow-hidden">
        <CardHeader>
          <CardTitle>가격 하락 알림 (베타)</CardTitle>
        </CardHeader>
        <CardContent>
          <form class="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end" @submit.prevent="submitAlert">
            <label class="sm:col-span-2 space-y-1">
              <span class="text-caption text-muted-foreground">이메일</span>
              <input
                v-model="alertEmail"
                required
                type="email"
                placeholder="you@example.com"
                class="retro-input"
              />
            </label>
            <label class="space-y-1">
              <span class="text-caption text-muted-foreground">목표가 (KRW)</span>
              <input
                v-model="alertTargetPrice"
                required
                min="1"
                type="number"
                class="retro-input"
              />
            </label>
            <div class="sm:col-span-3 flex items-center gap-3">
              <button
                type="submit"
                :disabled="alertSubmitting"
                class="retro-button disabled:opacity-50"
              >
                {{ alertSubmitting ? "신청 중..." : "알림 신청" }}
              </button>
            </div>
          </form>
          <p v-if="alertError" class="text-caption text-destructive mt-3">{{ alertError }}</p>
          <p v-if="alertSuccess" class="text-caption text-savings mt-3">{{ alertSuccess }}</p>
        </CardContent>
      </Card>

      <!-- 같은 대륙 국가 비교 -->
      <Card v-if="nearbyCountries.length > 0" class="retro-panel overflow-hidden">
        <div class="retro-titlebar">
          <h2 class="retro-title">같은 대륙 다른 국가</h2>
          <span class="text-tiny text-muted-foreground">가격순 상위 5개</span>
        </div>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>국가</TableHead>
                <TableHead class="text-right">개인 (KRW)</TableHead>
                <TableHead class="text-right">절약률</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="nearby in nearbyCountries" :key="nearby.countryCode">
                <TableCell>
                  <RouterLink
                    :to="`/${serviceSlug}/${nearby.countryCode.toLowerCase()}`"
                    class="inline-flex items-center gap-2 hover:text-primary transition-colors"
                  >
                    <span>{{ countryFlag(nearby.countryCode) }}</span>
                    <span class="text-body font-medium">{{ nearby.country }}</span>
                  </RouterLink>
                </TableCell>
                <TableCell class="text-right text-body tabular-nums">
                  {{ fmtKrw(nearby.converted?.individual?.krw) }}
                </TableCell>
                <TableCell class="text-right">
                  <SavingsBadge
                    v-if="nearby.converted?.individual?.krw != null && baseCountryPrice?.converted?.individual?.krw != null"
                    :price="nearby.converted.individual.krw"
                    :base-price="baseCountryPrice.converted.individual.krw"
                  />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
