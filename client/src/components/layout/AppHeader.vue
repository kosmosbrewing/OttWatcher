<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { RouterLink, useRoute } from "vue-router";
import { useServices } from "@/composables/useServices";

const route = useRoute();
const { services, loadServices } = useServices();
const headlineMessages = [
  "터키에서 유튜브 프리미엄 사면 ₩3,130",
  "당신은 ₩14,900 내고 있습니다 🫠",
  "아르헨티나는 더 싸요. 근데 결제가 될까?",
  "오늘 1,234명이 가격을 비교했어요 👀",
] as const;
const currentHeadlineIndex = ref(0);
let headlineTicker: ReturnType<typeof setInterval> | null = null;

const activeServiceSlug = computed(() => {
  return typeof route.params.serviceSlug === "string" ? route.params.serviceSlug : "";
});

const currentHeadline = computed(
  () => headlineMessages[currentHeadlineIndex.value]
);

function rotateHeadline(): void {
  currentHeadlineIndex.value =
    (currentHeadlineIndex.value + 1) % headlineMessages.length;
}

onMounted(() => {
  void loadServices();
  if (headlineMessages.length > 1) {
    headlineTicker = setInterval(rotateHeadline, 3200);
  }
});

onUnmounted(() => {
  if (headlineTicker) {
    clearInterval(headlineTicker);
  }
});
</script>

<template>
  <header class="border-b border-border bg-white">
    <div class="container py-2.5">
      <div class="retro-panel overflow-hidden">
        <div class="retro-titlebar h-11 border-b-0">
          <RouterLink
            to="/"
            class="flex h-full w-full items-center justify-center px-2 text-center font-title font-semibold text-[14px] sm:px-3 sm:text-[16px]"
          >
            <Transition name="headline-fade" mode="out-in">
              <span :key="currentHeadline" class="block w-full truncate text-center">
                {{ currentHeadline }}
              </span>
            </Transition>
          </RouterLink>
        </div>
      </div>
    </div>

    <nav class="w-full border-b border-primary/80 bg-primary text-primary-foreground">
      <div class="container py-1.5">
        <div class="flex items-center gap-0.5 overflow-x-auto whitespace-nowrap px-1.5">
          <RouterLink
            v-for="service in services"
            :key="service.slug"
            :to="`/${service.slug}`"
            class="inline-flex h-8 shrink-0 items-center border-b-2 border-transparent px-2.5 font-title text-[0.76rem] font-semibold tracking-tight text-primary-foreground/80 transition-colors hover:border-primary-foreground/40 hover:text-primary-foreground focus-visible:outline-none focus-visible:ring-0"
            :class="activeServiceSlug === service.slug ? 'border-primary-foreground text-primary-foreground' : ''"
          >
            {{ service.name }}
          </RouterLink>
        </div>
      </div>
    </nav>
  </header>
</template>

<style scoped>
.headline-fade-enter-active,
.headline-fade-leave-active {
  transition: opacity 0.34s ease;
}

.headline-fade-enter-from,
.headline-fade-leave-to {
  opacity: 0;
}
</style>
