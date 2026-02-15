<script setup lang="ts">
import { ArrowUp, ArrowDown } from "lucide-vue-next";
import type { SortOrder } from "@/composables/usePrices";
import { cn } from "@/lib/utils";

const props = defineProps<{
  modelValue: SortOrder;
}>();

const emit = defineEmits<{
  (e: "update:modelValue", value: SortOrder): void;
}>();

function toggle(): void {
  emit("update:modelValue", props.modelValue === "asc" ? "desc" : "asc");
}
</script>

<template>
  <button
    :class="cn(
      'inline-flex items-center gap-1.5 px-2.5 py-1 text-body font-medium border-b-2 border-border/70 transition-colors',
      'bg-transparent text-foreground hover:border-primary hover:text-primary'
    )"
    @click="toggle"
  >
    <ArrowUp v-if="modelValue === 'asc'" class="h-3.5 w-3.5" />
    <ArrowDown v-else class="h-3.5 w-3.5" />
    {{ modelValue === 'asc' ? '싼 순' : '비싼 순' }}
  </button>
</template>
