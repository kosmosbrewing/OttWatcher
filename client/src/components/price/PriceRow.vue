<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import type { CountryPrice } from "@/api";
import type { SortOrder } from "@/composables/usePrices";
import { TableRow, TableCell } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import SavingsBadge from "./SavingsBadge.vue";
import { formatNumber, countryFlag } from "@/lib/utils";

const props = defineProps<{
  item: CountryPrice;
  selectedPlan: string;
  baseKrw: number | null;
  serviceSlug: string;
  rank: number;
  isBase: boolean;
  sortOrder: SortOrder;
}>();

// 현지 통화 가격
const localPrice = computed(() => {
  const plan = props.item.plans?.[props.selectedPlan];
  if (plan?.monthly == null) return null;
  return { amount: plan.monthly, currency: props.item.currency };
});

// USD 환산가
const usdPrice = computed<number | null>(() =>
  props.item.converted?.[props.selectedPlan]?.usd ?? null
);

// KRW 환산가
const krwPrice = computed<number | null>(() =>
  props.item.converted?.[props.selectedPlan]?.krw ?? null
);

// 현지 통화 포맷
const formattedLocal = computed(() => {
  if (!localPrice.value) return "-";
  return `${formatNumber(localPrice.value.amount)} ${localPrice.value.currency}`;
});

// USD 포맷
const formattedUsd = computed(() => {
  if (usdPrice.value == null) return "-";
  return `$${usdPrice.value.toFixed(2)}`;
});

// KRW 포맷
const formattedKrw = computed(() => {
  if (krwPrice.value == null) return "-";
  return `${formatNumber(Math.round(krwPrice.value))}원`;
});

const flag = computed(() => countryFlag(props.item.countryCode));
</script>

<template>
  <TableRow
    class="group/price-row hover:bg-primary/10"
    :class="isBase ? 'bg-accent/40' : ''"
  >
    <!-- 국가 -->
    <TableCell>
      <RouterLink
        :to="`/${serviceSlug}/${item.countryCode.toLowerCase()}`"
        class="inline-flex items-center gap-2 transition-colors font-semibold group-hover/price-row:text-primary"
      >
        <!-- 순번: asc 1~3위는 메달, 나머지는 숫자 -->
        <span v-if="sortOrder === 'asc' && rank === 1" class="text-body shrink-0 mr-1" title="1위">🥇</span>
        <span v-else-if="sortOrder === 'asc' && rank === 2" class="text-body shrink-0 mr-1" title="2위">🥈</span>
        <span v-else-if="sortOrder === 'asc' && rank === 3" class="text-body shrink-0 mr-1" title="3위">🥉</span>
        <span v-else class="text-tiny text-muted-foreground tabular-nums shrink-0 w-5 text-right mr-1">#{{ rank }}</span>
        <!-- 국기는 항상 표시 -->
        <span class="text-body">{{ flag }}</span>
        <span class="text-caption">{{ item.country }}</span>
        <span v-if="isBase" class="text-[0.62rem] font-bold text-muted-foreground border border-border/60 px-1 py-0.5 leading-none">내 요금</span>
      </RouterLink>
    </TableCell>

    <!-- 현지 가격 (데스크톱) -->
    <TableCell class="text-right text-tiny text-muted-foreground/70 tabular-nums hidden sm:table-cell w-[116px]">
      {{ formattedLocal }}
    </TableCell>

    <!-- USD 환산가 (데스크톱) -->
    <TableCell class="text-right text-tiny text-muted-foreground/70 tabular-nums hidden sm:table-cell w-[64px]">
      {{ formattedUsd }}
    </TableCell>

    <!-- KRW 환산가 -->
    <TableCell class="text-right font-semibold text-body tabular-nums w-[112px]">
      {{ formattedKrw }}
    </TableCell>

    <!-- 절약률 -->
    <TableCell class="text-right w-[64px]">
      <Badge
        v-if="isBase"
        variant="neutral"
        class="h-5 w-[50px] justify-center px-0 py-0 text-tiny font-bold leading-none !text-white"
      >기준</Badge>
      <SavingsBadge
        v-else-if="baseKrw != null && krwPrice != null"
        :price="krwPrice"
        :base-price="baseKrw"
      />
    </TableCell>
  </TableRow>
</template>
