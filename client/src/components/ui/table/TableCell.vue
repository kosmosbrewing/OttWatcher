<script setup lang="ts">
import { cn } from "@/lib/utils";

const props = defineProps({
  class: { type: String, default: "" },
});
</script>

<template>
  <td :class="cn('px-2.5 py-2 align-middle text-caption [&:has([role=checkbox])]:pr-0', props.class)">
    <slot />
  </td>
</template>
