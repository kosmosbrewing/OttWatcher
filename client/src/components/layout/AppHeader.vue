<script setup>
import { ref } from "vue";
import { RouterLink } from "vue-router";
import { Menu, X } from "lucide-vue-next";

const isMenuOpen = ref(false);

const navLinks = [
  { name: "홈", path: "/" },
  { name: "제보", path: "/report" },
  { name: "반영 로그", path: "/changelog" },
  { name: "소개", path: "/about" },
];
</script>

<template>
  <header class="sticky top-0 z-50 border-b-2 border-border bg-background/95 backdrop-blur">
    <div class="container py-3">
      <div class="retro-panel overflow-hidden">
        <div class="retro-titlebar">
          <RouterLink to="/" class="flex items-center gap-2 font-bold">
            <span class="retro-kbd">OTT</span>
            <span>PRICE COMMUNITY BOARD</span>
          </RouterLink>
          <span class="hidden sm:inline text-tiny text-primary-foreground/90">
            실시간 가격 변동 · 제보 반영 로그
          </span>
        </div>

        <div class="flex h-12 items-center justify-between px-3 bg-card">
          <nav class="hidden md:flex items-center gap-2">
            <RouterLink
              v-for="link in navLinks"
              :key="link.path"
              :to="link.path"
              class="retro-button-subtle text-body"
            >
              {{ link.name }}
            </RouterLink>
          </nav>

          <div class="hidden md:flex items-center gap-2 text-tiny text-muted-foreground">
            <span class="retro-chip">LIVE</span>
            <span>가격 갱신/제보는 반영 로그에서 확인</span>
          </div>

          <button
            class="md:hidden retro-button-subtle p-2"
            @click="isMenuOpen = !isMenuOpen"
            :aria-label="isMenuOpen ? '메뉴 닫기' : '메뉴 열기'"
          >
            <X v-if="isMenuOpen" class="h-4 w-4" />
            <Menu v-else class="h-4 w-4" />
          </button>
        </div>

        <div v-if="isMenuOpen" class="md:hidden border-t-2 border-border bg-muted px-3 py-3">
          <nav class="grid grid-cols-2 gap-2">
            <RouterLink
              v-for="link in navLinks"
              :key="link.path"
              :to="link.path"
              class="retro-button-subtle justify-center"
              @click="isMenuOpen = false"
            >
              {{ link.name }}
            </RouterLink>
          </nav>
        </div>
      </div>
    </div>
  </header>
</template>
