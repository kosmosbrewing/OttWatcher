<script setup lang="ts">
import { useSEO } from "@/composables/useSEO";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

useSEO({
  title: "소개 | 유튜브 프리미엄 가격 비교",
  description: "유튜브 프리미엄 가격 비교 서비스의 데이터 출처와 갱신 주기를 안내합니다.",
});
</script>

<template>
  <div class="container py-8">
    <section class="retro-panel overflow-hidden mb-6">
      <div class="retro-titlebar">
        <h1 class="retro-title">서비스 소개</h1>
        <span class="retro-kbd">ABOUT</span>
      </div>
      <div class="retro-panel-content">
        <p class="text-body text-muted-foreground">
          유튜브 프리미엄 가격 비교 서비스의 운영 원칙과 데이터 수집 방식을 안내합니다.
        </p>
      </div>
    </section>

    <Card class="mb-6 retro-panel">
      <CardHeader>
        <CardTitle>유튜브 프리미엄 가격 비교란?</CardTitle>
      </CardHeader>
      <CardContent>
        <p class="text-body leading-relaxed mb-4">
          이 서비스는 유튜브 프리미엄 구독 요금의 국가별 가격을 비교해
          최저가 국가와 한국 대비 절약률을 빠르게 확인할 수 있도록 제공합니다.
        </p>
        <p class="text-body leading-relaxed mb-4">
          각 나라의 현지 통화 가격과 함께 USD, KRW 환산 가격을 제공하며
          현재 환율 기준 순위를 확인할 수 있습니다.
        </p>
        <p class="text-body leading-relaxed">
          가격 정보는 유튜브 프리미엄 공식 사이트 기준으로 관리됩니다.
        </p>
      </CardContent>
    </Card>

    <Card class="mb-6 retro-panel">
      <CardHeader>
        <CardTitle>데이터 출처 및 갱신 주기</CardTitle>
      </CardHeader>
      <CardContent>
        <p class="text-body leading-relaxed mb-3">
          환율 데이터: Frankfurter.app API를 사용하며, 매일 자동 갱신됩니다.
        </p>
        <p class="text-body leading-relaxed">
          가격 데이터: 유튜브 프리미엄 공식 사이트 기준으로 주 1회 업데이트됩니다.
        </p>
      </CardContent>
    </Card>

    <Card class="retro-panel">
      <CardHeader>
        <CardTitle>문의</CardTitle>
      </CardHeader>
      <CardContent>
        <p class="text-body text-muted-foreground">
          잘못된 가격 정보나 서비스 관련 문의는 이메일로 보내주세요.
        </p>
      </CardContent>
    </Card>
  </div>
</template>
