<script setup lang="ts">
import { cn } from "@/lib/utils";

const props = defineProps({
  class: { type: String, default: "" },
});
</script>

<template>
  <thead :class="cn('[&_tr]:border-b [&_tr]:border-border/80', props.class)">
    <slot />
  </thead>
</template>
