<script setup>
import { cn } from "@/lib/utils";

const props = defineProps({
  modelValue: { type: String, required: true },
});

const emit = defineEmits(["update:modelValue"]);

const options = [
  { value: "krw", label: "₩ KRW" },
  { value: "usd", label: "$ USD" },
];
</script>

<template>
  <div class="inline-flex rounded-sm border-2 border-border bg-muted p-1 gap-1">
    <button
      v-for="opt in options"
      :key="opt.value"
      :class="cn(
        'px-3 py-1.5 rounded-sm text-caption font-semibold border border-transparent transition-colors',
        modelValue === opt.value
          ? 'bg-background text-foreground border-border shadow-[2px_2px_0px_0px_hsl(var(--border))]'
          : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
      )"
      @click="emit('update:modelValue', opt.value)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>
