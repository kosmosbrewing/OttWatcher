<script setup>
import { ref, computed, onMounted } from "vue";
import { RouterLink } from "vue-router";
import { useServices } from "@/composables/useServices";
import { useSEO } from "@/composables/useSEO";
import { fetchChangelog } from "@/api";
import { formatNumber, countryFlag } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

const { services, loadServices } = useServices();

const selectedServiceSlug = ref("");
const updates = ref([]);
const loading = ref(false);
const error = ref("");

const filteredUpdates = computed(() => {
  if (!selectedServiceSlug.value) return updates.value;
  return updates.value.filter((item) => item.serviceSlug === selectedServiceSlug.value);
});

useSEO({
  title: "반영 로그 | OTT 가격 비교",
  description: "가격 제보 반영 이력과 최근 데이터 수정 내역을 확인하세요.",
});

function formatDelta(value) {
  if (value == null) return "-";
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatNumber(value)}원`;
}

async function loadLogs() {
  loading.value = true;
  error.value = "";

  try {
    const [servicesData, logsData] = await Promise.all([
      loadServices(),
      fetchChangelog(selectedServiceSlug.value),
    ]);
    if (servicesData && services.value.length > 0 && !selectedServiceSlug.value) {
      selectedServiceSlug.value = "";
    }
    updates.value = logsData.updates || [];
  } catch (e) {
    error.value = e.message;
  } finally {
    loading.value = false;
  }
}

onMounted(loadLogs);
</script>

<template>
  <div class="container py-8">
    <section class="retro-panel overflow-hidden mb-6">
      <div class="retro-titlebar">
        <h1 class="retro-title">반영 로그 보드</h1>
        <span class="retro-kbd">AUDIT</span>
      </div>
      <div class="p-4">
        <p class="text-body text-muted-foreground">
          제보 검토 및 데이터 업데이트 이력을 투명하게 공개합니다.
        </p>
      </div>
    </section>

    <Card class="mb-6 retro-panel">
      <CardContent class="p-4">
        <div class="flex items-center gap-3 flex-wrap">
          <label class="text-caption text-muted-foreground">서비스 필터</label>
          <select
            v-model="selectedServiceSlug"
            class="retro-input min-w-[220px]"
          >
            <option value="">전체 서비스</option>
            <option v-for="service in services" :key="service.id" :value="service.slug">
              {{ service.name }}
            </option>
          </select>
          <button
            class="retro-button-subtle"
            @click="loadLogs"
          >
            새로고침
          </button>
        </div>
      </CardContent>
    </Card>

    <div v-if="loading" class="text-center py-16">
      <div class="inline-block w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      <p class="mt-4 text-body text-muted-foreground">반영 로그를 불러오는 중...</p>
    </div>

    <div v-else-if="error" class="text-center py-16">
      <p class="text-destructive text-body">{{ error }}</p>
    </div>

    <Card v-else class="retro-panel overflow-hidden">
      <div class="retro-titlebar">
        <h2 class="retro-title">최근 업데이트 {{ filteredUpdates.length }}건</h2>
      </div>
      <CardHeader>
        <CardTitle>서비스별 가격 변경 기록</CardTitle>
      </CardHeader>
      <CardContent class="p-0 sm:p-2">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>일시</TableHead>
              <TableHead>서비스/국가</TableHead>
              <TableHead>요금제</TableHead>
              <TableHead class="text-right">변동</TableHead>
              <TableHead>메모</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="item in filteredUpdates" :key="item.id">
              <TableCell class="text-caption">{{ item.updatedAt?.slice(0, 10) }}</TableCell>
              <TableCell>
                <RouterLink
                  :to="`/${item.serviceSlug}/${item.countryCode.toLowerCase()}`"
                  class="hover:text-primary"
                >
                  {{ countryFlag(item.countryCode) }} {{ item.serviceSlug }} / {{ item.countryCode }}
                </RouterLink>
              </TableCell>
              <TableCell>{{ item.planId }}</TableCell>
              <TableCell
                class="text-right tabular-nums"
                :class="item.deltaKrw < 0 ? 'text-savings' : 'text-destructive'"
              >
                {{ formatDelta(item.deltaKrw) }}
              </TableCell>
              <TableCell class="text-caption text-muted-foreground">{{ item.note }}</TableCell>
            </TableRow>
            <TableRow v-if="filteredUpdates.length === 0">
              <TableCell colspan="5" class="text-center py-10 text-muted-foreground">
                반영 로그가 없습니다.
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  </div>
</template>
