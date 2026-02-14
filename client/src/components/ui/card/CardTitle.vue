<script setup>
import { cn } from "@/lib/utils";

const props = defineProps({
  class: { type: String, default: "" },
});
</script>

<template>
  <h3 :class="cn('text-heading leading-none tracking-tight font-bold', props.class)">
    <slot />
  </h3>
</template>
