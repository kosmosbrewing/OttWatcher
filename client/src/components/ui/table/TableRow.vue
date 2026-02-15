<script setup lang="ts">
import { cn } from "@/lib/utils";

const props = defineProps({
  class: { type: String, default: "" },
});
</script>

<template>
  <tr :class="cn('border-b border-border/60 transition-colors hover:bg-accent/20', props.class)">
    <slot />
  </tr>
</template>
