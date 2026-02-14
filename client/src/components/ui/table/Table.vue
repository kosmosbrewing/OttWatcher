<script setup>
import { cn } from "@/lib/utils";

const props = defineProps({
  class: { type: String, default: "" },
});
</script>

<template>
  <div class="relative w-full overflow-auto border-y-2 border-border bg-card">
    <table :class="cn('w-full caption-bottom text-body', props.class)">
      <slot />
    </table>
  </div>
</template>
