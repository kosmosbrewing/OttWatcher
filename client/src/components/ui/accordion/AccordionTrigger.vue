<script setup lang="ts">
import { type HTMLAttributes, computed } from "vue";
import { AccordionHeader, AccordionTrigger, type AccordionTriggerProps } from "radix-vue";
import { Plus } from "lucide-vue-next";
import { cn } from "@/lib/utils";

const props = defineProps<AccordionTriggerProps & { class?: HTMLAttributes["class"] }>();

const delegatedProps = computed(() => {
  const { class: _, ...delegated } = props;
  return delegated;
});
</script>

<template>
  <AccordionHeader class="flex">
    <AccordionTrigger
      v-bind="delegatedProps"
      :class="
        cn(
          'flex flex-1 items-center justify-between gap-4 py-3 text-left font-semibold transition-colors hover:text-primary [&[data-state=open]>svg]:rotate-45',
          props.class
        )
      "
    >
      <slot />
      <Plus class="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
    </AccordionTrigger>
  </AccordionHeader>
</template>
