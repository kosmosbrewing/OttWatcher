<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { RouterLink } from "vue-router";

const headlineMessages = [
  "터키에서 유튜브 프리미엄 사면 ₩3,130",
  "당신은 ₩14,900 내고 있습니다 🫠",
  "아르헨티나는 더 싸요. 근데 결제가 될까?",
  "오늘 1,234명이 가격을 비교했어요 👀",
] as const;
const currentHeadlineIndex = ref(0);
let headlineTicker: ReturnType<typeof setInterval> | null = null;

const currentHeadline = computed(
  () => headlineMessages[currentHeadlineIndex.value],
);

function rotateHeadline(): void {
  currentHeadlineIndex.value =
    (currentHeadlineIndex.value + 1) % headlineMessages.length;
}

onMounted(() => {
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
              <span
                :key="currentHeadline"
                class="block w-full truncate text-center"
              >
                {{ currentHeadline }}
              </span>
            </Transition>
          </RouterLink>
        </div>
      </div>
    </div>

    <div class="w-full h-6 bg-gradient-to-r from-primary to-pink-300"></div>
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
