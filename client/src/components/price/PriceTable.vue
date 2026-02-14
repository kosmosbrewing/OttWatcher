<script setup>
import { computed } from "vue";
import { Table, TableHeader, TableBody, TableRow, TableHead } from "@/components/ui/table";
import PriceRow from "./PriceRow.vue";

const props = defineProps({
  prices: { type: Array, required: true },
  selectedPlan: { type: String, required: true },
  displayCurrency: { type: String, required: true },
  baseCountryPrice: { type: Object, default: null },
  serviceSlug: { type: String, required: true },
});

// 기준 국가(한국)의 환산 가격
const baseConverted = computed(() => {
  if (!props.baseCountryPrice) return null;
  return props.baseCountryPrice.converted?.[props.selectedPlan]?.[props.displayCurrency] ?? null;
});

const currencyLabel = computed(() =>
  props.displayCurrency === "krw" ? "KRW 환산" : "USD 환산"
);
</script>

<template>
  <div>
    <!-- 결과 수 표시 -->
    <p class="text-caption text-muted-foreground mb-3 px-1">
      총 {{ prices.length }}개국
    </p>

    <Table>
      <TableHeader>
        <TableRow>
          <TableHead class="w-12 text-center">#</TableHead>
          <TableHead>국가</TableHead>
          <TableHead class="text-right hidden sm:table-cell">현지 가격</TableHead>
          <TableHead class="text-right">{{ currencyLabel }}</TableHead>
          <TableHead class="text-right">절약률</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        <template v-for="(item, index) in prices" :key="item.countryCode">
          <PriceRow
            :item="item"
            :rank="index + 1"
            :selected-plan="selectedPlan"
            :display-currency="displayCurrency"
            :base-price="baseConverted"
            :service-slug="serviceSlug"
          />
        </template>
      </TableBody>
    </Table>

    <!-- 데이터 없음 -->
    <div v-if="prices.length === 0" class="text-center py-12">
      <p class="text-body text-muted-foreground">해당 조건에 맞는 국가가 없습니다.</p>
    </div>
  </div>
</template>
