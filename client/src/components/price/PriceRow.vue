<script setup lang="ts">
import { computed } from "vue";
import { RouterLink } from "vue-router";
import type { CountryPrice } from "@/api";
import type { DisplayCurrency } from "@/composables/usePrices";
import { TableRow, TableCell } from "@/components/ui/table";
import SavingsBadge from "./SavingsBadge.vue";
import { formatNumber, countryFlag } from "@/lib/utils";

const props = defineProps<{
  item: CountryPrice;
  selectedPlan: string;
  displayCurrency: DisplayCurrency;
  basePrice: number | null;
  serviceSlug: string;
}>();

// 현지 통화 가격
const localPrice = computed(() => {
  const plan = props.item.plans?.[props.selectedPlan];
  if (plan?.monthly == null) return null;
  return { amount: plan.monthly, currency: props.item.currency };
});

// 환산 가격 (KRW 또는 USD)
const convertedPrice = computed<number | null>(() => {
  return props.item.converted?.[props.selectedPlan]?.[props.displayCurrency] ?? null;
});

function formatDisplayPrice(value: number | null): string {
  if (value == null) return "-";
  if (props.displayCurrency === "krw") {
    return `₩${formatNumber(Math.round(value))}`;
  }
  return `$${value.toFixed(2)}`;
}

// 환산 가격 포맷
const formattedConverted = computed(() => formatDisplayPrice(convertedPrice.value));

// 현지 통화 포맷
const formattedLocal = computed(() => {
  if (!localPrice.value) return "-";
  return `${formatNumber(localPrice.value.amount)} ${localPrice.value.currency}`;
});

// 국기 이모지
const flag = computed(() => countryFlag(props.item.countryCode));
</script>

<template>
  <TableRow class="group">
    <!-- 국가 -->
    <TableCell>
      <RouterLink
        :to="`/${serviceSlug}/${item.countryCode.toLowerCase()}`"
        class="inline-flex items-center gap-2 hover:text-primary transition-colors font-semibold"
      >
        <span class="text-body">{{ flag }}</span>
        <span class="text-body">{{ item.country }}</span>
      </RouterLink>
    </TableCell>

    <!-- 현지 가격 -->
    <TableCell class="text-right text-caption text-muted-foreground tabular-nums hidden sm:table-cell">
      {{ formattedLocal }}
    </TableCell>

    <!-- 환산 가격 -->
    <TableCell class="text-right font-semibold text-body tabular-nums">
      {{ formattedConverted }}
    </TableCell>

    <!-- 절약률 -->
    <TableCell class="text-right">
      <SavingsBadge
        v-if="basePrice != null && convertedPrice != null"
        :price="convertedPrice"
        :base-price="basePrice"
      />
    </TableCell>
  </TableRow>
</template>
