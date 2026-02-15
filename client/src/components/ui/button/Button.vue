<script setup lang="ts">
import { Primitive } from "radix-vue";
import { buttonVariants, type ButtonVariants } from ".";
import { cn } from "@/lib/utils";

const props = withDefaults(
  defineProps<{
    variant?: ButtonVariants["variant"];
    size?: ButtonVariants["size"];
    as?: string;
    asChild?: boolean;
    class?: string;
  }>(),
  {
    variant: "default",
    size: "default",
    as: "button",
    asChild: false,
    class: "",
  }
);
</script>

<template>
  <Primitive
    :as="props.as"
    :as-child="props.asChild"
    :class="cn(buttonVariants({ variant: props.variant, size: props.size }), props.class)"
  >
    <slot />
  </Primitive>
</template>
