<script setup>
import { cn } from "@/lib/utils";

const props = defineProps({
  plans: { type: Array, required: true },
  modelValue: { type: String, required: true },
});

const emit = defineEmits(["update:modelValue"]);
</script>

<template>
  <div class="inline-flex flex-wrap rounded-sm border-2 border-border bg-muted p-1 gap-1">
    <button
      v-for="plan in plans"
      :key="plan.id"
      :class="cn(
        'px-3 py-1.5 rounded-sm text-caption font-semibold border border-transparent transition-colors',
        modelValue === plan.id
          ? 'bg-background text-foreground border-border shadow-[2px_2px_0px_0px_hsl(var(--border))]'
          : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
      )"
      @click="emit('update:modelValue', plan.id)"
    >
      {{ plan.name }}
    </button>
  </div>
</template>
