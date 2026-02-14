<script setup>
import { cn } from "@/lib/utils";

const props = defineProps({
  class: { type: String, default: "" },
});
</script>

<template>
  <th :class="cn('h-10 px-3 text-left align-middle text-caption font-bold uppercase tracking-wide text-muted-foreground [&:has([role=checkbox])]:pr-0', props.class)">
    <slot />
  </th>
</template>
