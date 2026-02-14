<script setup>
import { computed } from "vue";
import { Badge } from "@/components/ui/badge";
import { calcSavingsPercent } from "@/lib/utils";

const props = defineProps({
  price: { type: Number, required: true },
  basePrice: { type: Number, required: true },
});

const percent = computed(() => calcSavingsPercent(props.price, props.basePrice));

// 양수 = 절약, 음수 = 더 비쌈
const label = computed(() => {
  if (percent.value > 0) return `-${percent.value}%`;
  if (percent.value < 0) return `+${Math.abs(percent.value)}%`;
  return "기준";
});

const variant = computed(() => {
  if (percent.value > 0) return "savings";
  if (percent.value < 0) return "destructive";
  return "secondary";
});
</script>

<template>
  <Badge :variant="variant" class="text-tiny tabular-nums">
    {{ label }}
  </Badge>
</template>
