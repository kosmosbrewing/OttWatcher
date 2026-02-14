<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, RouterLink } from "vue-router";
import { fetchTrends } from "@/api";
import { useServices } from "@/composables/useServices";
import { useSEO } from "@/composables/useSEO";
import { formatNumber, countryFlag } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

const route = useRoute();
const { services, loadServices } = useServices();

const trends = ref(null);
const loading = ref(false);
const error = ref(null);

const currentService = computed(() =>
  services.value.find((service) => service.slug === route.params.serviceSlug)
);

const pageTitle = computed(() => {
  const serviceName = currentService.value?.name || route.params.serviceSlug;
  return `${serviceName} 가격 트렌드 | OTT 가격 비교`;
});

const pageDescription = computed(() => {
  const serviceName = currentService.value?.name || route.params.serviceSlug;
  return `${serviceName} 최근 가격 하락 국가와 절약률 상위 국가를 확인하세요.`;
});

useSEO({
  title: pageTitle,
  description: pageDescription,
});

function fmtKrw(value) {
  if (value == null) return "-";
  return `₩${formatNumber(Math.round(value))}`;
}

function fmtLocal(row) {
  if (row.localMonthly == null) return "-";
  return `${formatNumber(row.localMonthly)} ${row.currency}`;
}

function fmtDelta(value) {
  if (value == null) return "-";
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatNumber(value)}원`;
}

function fmtPercent(value) {
  if (value == null) return "-";
  const sign = value > 0 ? "+" : "";
  return `${sign}${value}%`;
}

async function loadTrendData() {
  loading.value = true;
  error.value = null;

  try {
    await loadServices();
    trends.value = await fetchTrends(route.params.serviceSlug);
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

onMounted(loadTrendData);
watch(() => route.params.serviceSlug, () => loadTrendData());
</script>

<template>
  <div class="container py-8">
    <div v-if="loading" class="text-center py-20">
      <div class="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      <p class="mt-4 text-body text-muted-foreground">트렌드 데이터를 불러오는 중...</p>
    </div>

    <div v-else-if="error" class="text-center py-20">
      <p class="text-destructive text-body">{{ error }}</p>
    </div>

    <div v-else-if="trends">
      <section class="retro-panel overflow-hidden mb-6">
        <div class="retro-titlebar">
          <h1 class="retro-title">{{ currentService?.name || route.params.serviceSlug }} Trend Board</h1>
          <span class="retro-kbd">TOP 10</span>
        </div>
        <div class="p-4 flex items-center justify-between flex-wrap gap-3">
          <p class="text-caption text-muted-foreground">
            기준일: {{ trends.asOf || "-" }} · 비교 기준: {{ trends.previousSnapshotDate || "-" }}
          </p>
          <div class="flex items-center gap-2 text-caption">
            <RouterLink :to="`/${route.params.serviceSlug}`" class="retro-button-subtle">가격표 보기</RouterLink>
            <RouterLink to="/report" class="retro-button-subtle">가격 제보</RouterLink>
          </div>
        </div>
      </section>

      <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card class="retro-panel overflow-hidden">
          <div class="retro-titlebar">
            <h2 class="retro-title">최저가 TOP 10 (개인)</h2>
          </div>
          <CardHeader>
            <CardTitle>현재 시점 기준</CardTitle>
          </CardHeader>
          <CardContent class="p-0 sm:p-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>국가</TableHead>
                  <TableHead class="text-right">현지 가격</TableHead>
                  <TableHead class="text-right">KRW</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="(row, index) in trends.cheapest" :key="`cheap-${row.countryCode}`">
                  <TableCell>{{ index + 1 }}</TableCell>
                  <TableCell>
                    <RouterLink :to="`/${route.params.serviceSlug}/${row.countryCode.toLowerCase()}`" class="hover:text-primary transition-colors">
                      {{ countryFlag(row.countryCode) }} {{ row.country }}
                    </RouterLink>
                  </TableCell>
                  <TableCell class="text-right tabular-nums">{{ fmtLocal(row) }}</TableCell>
                  <TableCell class="text-right tabular-nums font-medium">{{ fmtKrw(row.krw) }}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card class="retro-panel overflow-hidden">
          <div class="retro-titlebar">
            <h2 class="retro-title">한국 대비 절약률 TOP 10</h2>
          </div>
          <CardHeader>
            <CardTitle>개인 요금제 기준</CardTitle>
          </CardHeader>
          <CardContent class="p-0 sm:p-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>국가</TableHead>
                  <TableHead class="text-right">절약률</TableHead>
                  <TableHead class="text-right">KRW</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="(row, index) in trends.highestSavings" :key="`save-${row.countryCode}`">
                  <TableCell>{{ index + 1 }}</TableCell>
                  <TableCell>
                    <RouterLink :to="`/${route.params.serviceSlug}/${row.countryCode.toLowerCase()}`" class="hover:text-primary transition-colors">
                      {{ countryFlag(row.countryCode) }} {{ row.country }}
                    </RouterLink>
                  </TableCell>
                  <TableCell class="text-right tabular-nums text-savings">-{{ row.savingsPercent }}%</TableCell>
                  <TableCell class="text-right tabular-nums">{{ fmtKrw(row.krw) }}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card class="mt-6 retro-panel overflow-hidden">
        <div class="retro-titlebar">
          <h2 class="retro-title">최근 가격 변동 TOP 10 (개인 · KRW)</h2>
        </div>
        <CardHeader>
          <CardTitle>하락/상승 동시 표시</CardTitle>
        </CardHeader>
        <CardContent class="p-0 sm:p-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>#</TableHead>
                <TableHead>국가</TableHead>
                <TableHead class="text-right">이전</TableHead>
                <TableHead class="text-right">현재</TableHead>
                <TableHead class="text-right">변동</TableHead>
                <TableHead class="text-right">변동률</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="(row, index) in trends.biggestDrops" :key="`drop-${row.countryCode}`">
                <TableCell>{{ index + 1 }}</TableCell>
                <TableCell>
                  <RouterLink :to="`/${route.params.serviceSlug}/${row.countryCode.toLowerCase()}`" class="hover:text-primary transition-colors">
                    {{ countryFlag(row.countryCode) }} {{ row.country }}
                  </RouterLink>
                </TableCell>
                <TableCell class="text-right tabular-nums">{{ fmtKrw(row.previousKrw) }}</TableCell>
                <TableCell class="text-right tabular-nums">{{ fmtKrw(row.currentKrw) }}</TableCell>
                <TableCell class="text-right tabular-nums" :class="row.changeKrw < 0 ? 'text-savings' : 'text-destructive'">
                  {{ fmtDelta(row.changeKrw) }}
                </TableCell>
                <TableCell class="text-right tabular-nums" :class="row.changePercent < 0 ? 'text-savings' : 'text-destructive'">
                  {{ fmtPercent(row.changePercent) }}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
