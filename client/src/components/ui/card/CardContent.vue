<script setup lang="ts">
import { cn } from "@/lib/utils";

const props = defineProps({
  class: { type: String, default: "" },
});
</script>

<template>
  <div :class="cn('px-4 py-3 sm:px-5 sm:py-4', props.class)">
    <slot />
  </div>
</template>
