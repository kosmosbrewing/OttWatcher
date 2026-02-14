<script setup>
import { cn } from "@/lib/utils";

const props = defineProps({
  class: { type: String, default: "" },
});
</script>

<template>
  <tr :class="cn('border-b border-border/70 transition-colors hover:bg-accent/50', props.class)">
    <slot />
  </tr>
</template>
