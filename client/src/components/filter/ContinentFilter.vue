<script setup>
import { cn } from "@/lib/utils";

const props = defineProps({
  continents: { type: Object, required: true },
  modelValue: { type: String, required: true },
});

const emit = defineEmits(["update:modelValue"]);
</script>

<template>
  <div class="flex flex-wrap gap-2">
    <button
      :class="cn(
        'px-3 py-1.5 rounded-sm text-caption font-semibold border-2 transition-colors',
        modelValue === 'all'
          ? 'bg-primary text-primary-foreground border-border shadow-[2px_2px_0px_0px_hsl(var(--border))]'
          : 'bg-background text-muted-foreground border-border hover:border-border hover:text-foreground hover:bg-accent'
      )"
      @click="emit('update:modelValue', 'all')"
    >
      전체
    </button>
    <button
      v-for="(info, key) in continents"
      :key="key"
      :class="cn(
        'px-3 py-1.5 rounded-sm text-caption font-semibold border-2 transition-colors',
        modelValue === key
          ? 'bg-primary text-primary-foreground border-border shadow-[2px_2px_0px_0px_hsl(var(--border))]'
          : 'bg-background text-muted-foreground border-border hover:border-border hover:text-foreground hover:bg-accent'
      )"
      @click="emit('update:modelValue', key)"
    >
      {{ info.name }}
    </button>
  </div>
</template>
