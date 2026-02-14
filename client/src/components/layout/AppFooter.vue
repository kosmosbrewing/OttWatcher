<script setup>
import { RouterLink } from "vue-router";
</script>

<template>
  <footer class="mt-12 border-t-2 border-border bg-background">
    <div class="container py-6">
      <div class="retro-panel overflow-hidden">
        <div class="retro-titlebar">
          <h3 class="retro-title">Community Footer</h3>
          <span class="text-tiny text-primary-foreground/90">데이터/제보/변동 히스토리 공개 운영</span>
        </div>
        <div class="grid grid-cols-1 gap-6 p-4 md:grid-cols-3">
          <section>
            <h4 class="text-caption font-bold uppercase mb-2">OTT Price Compare</h4>
            <p class="text-caption text-muted-foreground leading-relaxed">
              국가별 OTT 가격을 빠르게 비교하고, 사용자 제보와 반영 로그를 공개하는 커뮤니티형 데이터 보드입니다.
            </p>
          </section>

          <section>
            <h4 class="text-caption font-bold uppercase mb-2">바로가기</h4>
            <div class="flex flex-wrap gap-2">
              <RouterLink to="/about" class="retro-button-subtle">소개</RouterLink>
              <RouterLink to="/report" class="retro-button-subtle">가격 제보</RouterLink>
              <RouterLink to="/changelog" class="retro-button-subtle">반영 로그</RouterLink>
              <RouterLink to="/privacy" class="retro-button-subtle">개인정보처리방침</RouterLink>
            </div>
          </section>

          <section>
            <h4 class="text-caption font-bold uppercase mb-2">운영 안내</h4>
            <p class="text-caption text-muted-foreground leading-relaxed">
              가격 정보는 공식 페이지와 환율 데이터를 기반으로 검증 후 반영합니다.
              변동 내역은 로그 페이지에서 확인할 수 있습니다.
            </p>
          </section>
        </div>
        <div class="border-t-2 border-border bg-muted px-4 py-2 text-caption text-muted-foreground">
          &copy; {{ new Date().getFullYear() }} OTT Price Compare Board
        </div>
      </div>
    </div>
  </footer>
</template>
