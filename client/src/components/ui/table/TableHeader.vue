<script setup>
import { cn } from "@/lib/utils";

const props = defineProps({
  class: { type: String, default: "" },
});
</script>

<template>
  <thead :class="cn('bg-muted [&_tr]:border-b-2 [&_tr]:border-border', props.class)">
    <slot />
  </thead>
</template>
