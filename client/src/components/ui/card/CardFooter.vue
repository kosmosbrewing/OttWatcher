<script setup lang="ts">
import { cn } from "@/lib/utils";

const props = defineProps({
  class: { type: String, default: "" },
});
</script>

<template>
  <div :class="cn('flex items-center px-4 pb-4 pt-0 sm:px-5 sm:pb-5', props.class)">
    <slot />
  </div>
</template>
