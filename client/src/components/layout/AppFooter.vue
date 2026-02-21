<script setup lang="ts">
import { RouterLink } from "vue-router";
</script>

<template>
  <footer class="mt-8 border-t border-border bg-background">
    <div class="container py-5">
      <div class="flex flex-col gap-3">
        <div class="flex flex-wrap items-center gap-3">
          <RouterLink to="/" class="retro-button-subtle">홈으로</RouterLink>
          <RouterLink to="/about" class="retro-button-subtle">사이트 안내</RouterLink>
          <RouterLink to="/privacy" class="retro-button-subtle">개인정보 처리방침</RouterLink>
        </div>
        <span class="text-[0.76rem] text-muted-foreground">Copyright @ shakilabs.com</span>
      </div>
    </div>
  </footer>
</template>
