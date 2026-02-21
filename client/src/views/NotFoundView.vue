<script setup lang="ts">
import { useRouter } from "vue-router";

const router = useRouter();

function goHome(): void {
  router.push("/");
}
</script>

<template>
  <section class="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
    <h1 class="text-7xl font-bold text-primary mb-4">404</h1>
    <p class="text-xl text-muted-foreground mb-2">
      페이지를 찾을 수 없습니다
    </p>
    <p class="text-sm text-muted-foreground mb-8">
      요청하신 페이지가 존재하지 않거나 이동되었을 수 있습니다.
    </p>
    <button
      class="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity"
      @click="goHome"
    >
      홈으로 돌아가기
    </button>
  </section>
</template>
