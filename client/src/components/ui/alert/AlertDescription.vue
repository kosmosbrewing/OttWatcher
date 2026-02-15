<script setup lang="ts">
import { AlertCircle } from "lucide-vue-next";
import { cn } from "@/lib/utils";

const props = defineProps({
  class: { type: String, default: "" },
});
</script>

<template>
  <div :class="cn('flex items-center gap-2 text-caption text-destructive', props.class)">
    <AlertCircle class="w-3 h-3 flex-shrink-0" />
    <span class="flex-1 text-caption">
      <slot />
    </span>
  </div>
</template>
