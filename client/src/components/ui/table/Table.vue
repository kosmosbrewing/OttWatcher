<script setup lang="ts">
import { cn } from "@/lib/utils";

const props = defineProps({
  class: { type: String, default: "" },
  wrapperClass: { type: String, default: "" },
});
</script>

<template>
  <div :class="cn('relative w-full overflow-auto', props.wrapperClass)">
    <table :class="cn('w-full caption-bottom text-body', props.class)">
      <slot />
    </table>
  </div>
</template>
