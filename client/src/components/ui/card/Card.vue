<script setup>
import { cn } from "@/lib/utils";

const props = defineProps({
  class: { type: String, default: "" },
});
</script>

<template>
  <div
    :class="cn('rounded-sm border-2 border-border bg-card text-card-foreground', props.class)"
  >
    <slot />
  </div>
</template>
