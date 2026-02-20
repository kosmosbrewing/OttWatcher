<script setup lang="ts">
import { RouterLink } from "vue-router";

const currentYear = new Date().getFullYear();
</script>

<template>
  <footer class="mt-8 border-t border-border bg-white">
    <div class="container py-4">
      <div class="retro-panel bg-white">
        <div class="retro-panel-content bg-white flex flex-col gap-2">
          <p class="text-body font-semibold">
            유튜브 프리미엄 국가별 가격 비교 서비스
          </p>
          <div class="flex flex-wrap items-center gap-2">
            <RouterLink to="/" class="retro-button-subtle">홈으로</RouterLink>
            <RouterLink to="/about" class="retro-button-subtle">사이트 안내</RouterLink>
            <RouterLink to="/privacy" class="retro-button-subtle">개인정보 처리방침</RouterLink>
            <a class="retro-button-subtle" href="mailto:skdba1313@gmail.com">문의하기</a>
          </div>
          <p class="text-caption text-muted-foreground">
            데이터: Frankfurter.app (환율) · 유튜브 공식 사이트 (가격)
          </p>
          <p class="text-caption text-muted-foreground">
            &copy; {{ currentYear }} shakilabs.com
          </p>
        </div>
      </div>
    </div>
  </footer>
</template>
