<script setup lang="ts">
import { computed } from "vue";
import { Badge } from "@/components/ui/badge";
import { calcSavingsPercent } from "@/lib/utils";

const props = defineProps<{
  price: number;
  basePrice: number;
}>();

const percent = computed(() => calcSavingsPercent(props.price, props.basePrice));

// 양수 = 절약, 음수 = 더 비쌈
const label = computed(() => {
  if (percent.value > 0) return `-${percent.value}%`;
  if (percent.value < 0) return `+${Math.abs(percent.value)}%`;
  return "기준";
});

const variant = computed<"savings" | "destructive" | "neutral">(() => {
  if (percent.value > 0) return "savings";
  if (percent.value < 0) return "destructive";
  return "neutral";
});
</script>

<template>
  <Badge :variant="variant" class="h-6 w-[60px] justify-center px-0 py-0 text-[0.84rem] font-bold tabular-nums leading-none !text-white">
    {{ label }}
  </Badge>
</template>
