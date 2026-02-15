<script setup lang="ts">
import { cn } from "@/lib/utils";

const props = defineProps({
  class: { type: String, default: "" },
});
</script>

<template>
  <div
    :class="cn('rounded-none border-0 bg-card text-card-foreground shadow-none', props.class)"
  >
    <slot />
  </div>
</template>
