<script setup lang="ts">
import { RouterLink } from "vue-router";
</script>

<template>
  <footer class="mt-8 border-t border-border bg-white">
    <div class="container py-4">
      <div class="retro-panel bg-white">
        <div class="retro-panel-content bg-white flex flex-col gap-2">
          <div class="flex flex-wrap items-center gap-2">
            <RouterLink to="/" class="retro-button-subtle">홈으로</RouterLink>
            <RouterLink to="/about" class="retro-button-subtle">사이트 안내</RouterLink>
            <RouterLink to="/privacy" class="retro-button-subtle">개인정보 처리방침</RouterLink>
            <span class="retro-button-subtle text-muted-foreground">English</span>
          </div>
          <p class="text-caption text-muted-foreground">
            &copy; 2026 shakilabs.com. All rights reserved.
          </p>
          </div>
      </div>
    </div>
  </footer>
</template>
