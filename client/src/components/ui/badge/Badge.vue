<script setup lang="ts">
import { badgeVariants, type BadgeVariants } from ".";
import { cn } from "@/lib/utils";

const props = withDefaults(
  defineProps<{
    variant?: BadgeVariants["variant"];
    class?: string;
  }>(),
  {
    variant: "default",
    class: "",
  }
);
</script>

<template>
  <div :class="cn(badgeVariants({ variant: props.variant }), props.class)">
    <slot />
  </div>
</template>
