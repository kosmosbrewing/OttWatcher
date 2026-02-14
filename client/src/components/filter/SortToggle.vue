<script setup>
import { ArrowUp, ArrowDown } from "lucide-vue-next";
import { cn } from "@/lib/utils";

const props = defineProps({
  modelValue: { type: String, required: true },
});

const emit = defineEmits(["update:modelValue"]);

function toggle() {
  emit("update:modelValue", props.modelValue === "asc" ? "desc" : "asc");
}
</script>

<template>
  <button
    :class="cn(
      'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm text-caption font-semibold border-2 transition-colors',
      'bg-background text-foreground border-border shadow-[2px_2px_0px_0px_hsl(var(--border))] hover:bg-accent'
    )"
    @click="toggle"
  >
    <ArrowUp v-if="modelValue === 'asc'" class="h-3.5 w-3.5" />
    <ArrowDown v-else class="h-3.5 w-3.5" />
    {{ modelValue === 'asc' ? '싼 순' : '비싼 순' }}
  </button>
</template>
