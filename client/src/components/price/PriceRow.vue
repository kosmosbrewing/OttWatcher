<script setup>
import { computed } from "vue";
import { RouterLink } from "vue-router";
import { TableRow, TableCell } from "@/components/ui/table";
import SavingsBadge from "./SavingsBadge.vue";
import { formatNumber, countryFlag } from "@/lib/utils";

const props = defineProps({
  item: { type: Object, required: true },
  rank: { type: Number, required: true },
  selectedPlan: { type: String, required: true },
  displayCurrency: { type: String, required: true },
  basePrice: { type: Number, default: null },
  serviceSlug: { type: String, required: true },
});

// 현지 통화 가격
const localPrice = computed(() => {
  const plan = props.item.plans?.[props.selectedPlan];
  if (!plan?.monthly) return null;
  return { amount: plan.monthly, currency: props.item.currency };
});

// 환산 가격 (KRW 또는 USD)
const convertedPrice = computed(() => {
  return props.item.converted?.[props.selectedPlan]?.[props.displayCurrency] ?? null;
});

// 환산 가격 포맷
const formattedConverted = computed(() => {
  if (convertedPrice.value == null) return "-";
  if (props.displayCurrency === "krw") {
    return `₩${formatNumber(Math.round(convertedPrice.value))}`;
  }
  return `$${convertedPrice.value.toFixed(2)}`;
});

// 현지 통화 포맷
const formattedLocal = computed(() => {
  if (!localPrice.value) return "-";
  return `${formatNumber(localPrice.value.amount)} ${localPrice.value.currency}`;
});

// 국기 이모지
const flag = computed(() => countryFlag(props.item.countryCode));
</script>

<template>
  <TableRow class="group odd:bg-background even:bg-muted/20">
    <!-- 순위 -->
    <TableCell class="w-12 text-center text-caption text-muted-foreground tabular-nums font-semibold">
      {{ rank }}
    </TableCell>

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
