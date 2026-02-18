<script setup lang="ts">
import { computed } from "vue";
import { Loader2 } from "lucide-vue-next";
import { cn } from "@/lib/utils";

type SpinnerSize = "sm" | "md" | "lg";
type SpinnerVariant = "dots" | "spinner";
type SpinnerColor = "primary" | "white" | "muted" | "foreground";

const props = withDefaults(
  defineProps<{
    size?: SpinnerSize;
    center?: boolean;
    variant?: SpinnerVariant;
    color?: SpinnerColor;
    fullscreen?: boolean;
    message?: string;
  }>(),
  {
    size: "md",
    center: true,
    variant: "dots",
    color: "primary",
    fullscreen: false,
    message: "",
  }
);

const dotSizes: Record<SpinnerSize, string> = {
  sm: "w-2 h-2",
  md: "w-3 h-3",
  lg: "w-4 h-4",
};

const spinnerSizes: Record<SpinnerSize, string> = {
  sm: "w-4 h-4",
  md: "w-6 h-6",
  lg: "w-8 h-8",
};

const textColorClasses = computed(() => {
  const map: Record<SpinnerColor, string> = {
    primary: "text-primary",
    white: "text-white",
    muted: "text-muted-foreground",
    foreground: "text-foreground",
  };
  return map[props.color];
});

const dotColorClasses = computed(() => {
  const map: Record<SpinnerColor, string> = {
    primary: "bg-primary",
    white: "bg-white",
    muted: "bg-muted-foreground",
    foreground: "bg-foreground",
  };
  return map[props.color];
});

const wrapperClasses = computed(() => {
  if (props.fullscreen) {
    return "fixed inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm text-center";
  }
  if (props.center) {
    return "flex flex-col items-center justify-center py-20 text-center";
  }
  return "inline-flex items-center gap-2";
});
</script>

<template>
  <div :class="wrapperClasses">
    <Loader2
      v-if="variant === 'spinner'"
      :class="cn(spinnerSizes[size], textColorClasses, 'animate-spin')"
    />
    <div v-else class="flex items-center gap-1.5">
      <span
        v-for="i in 3"
        :key="i"
        :class="cn(dotSizes[size], dotColorClasses, 'rounded-full animate-bounce-dot')"
        :style="{ animationDelay: `${(i - 1) * 0.15}s` }"
      />
    </div>

    <p
      v-if="message"
      :class="cn(center || fullscreen ? 'mt-4' : '', 'text-body text-muted-foreground')"
    >
      {{ message }}
    </p>
  </div>
</template>

<style scoped>
@keyframes bounce-dot {
  0%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-12px);
  }
}

.animate-bounce-dot {
  animation: bounce-dot 1.2s ease-in-out infinite;
}
</style>
