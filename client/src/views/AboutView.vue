<script setup>
import { useSEO } from "@/composables/useSEO";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

useSEO({
  title: "소개 | OTT 가격 비교",
  description: "OTT Price Compare 서비스 소개. 전 세계 OTT 구독 서비스의 국가별 가격을 비교하는 사이트입니다.",
});
</script>

<template>
  <div class="container py-8 max-w-3xl">
    <section class="retro-panel overflow-hidden mb-6">
      <div class="retro-titlebar">
        <h1 class="retro-title">서비스 소개</h1>
        <span class="retro-kbd">ABOUT</span>
      </div>
      <div class="p-4">
        <p class="text-body text-muted-foreground">
          OTT Price Compare의 운영 원칙과 데이터 수집 방식을 안내합니다.
        </p>
      </div>
    </section>

    <Card class="mb-6 retro-panel">
      <CardHeader>
        <CardTitle>OTT Price Compare란?</CardTitle>
      </CardHeader>
      <CardContent>
        <p class="text-body leading-relaxed mb-4">
          OTT Price Compare는 유튜브 프리미엄, 넷플릭스 등 주요 OTT 구독 서비스의
          국가별 구독 요금을 한눈에 비교할 수 있는 서비스입니다.
        </p>
        <p class="text-body leading-relaxed mb-4">
          각 나라의 현지 통화 가격과 함께 USD, KRW로 환산된 가격을 제공하며,
          한국 기준 절약률도 확인할 수 있습니다.
        </p>
        <p class="text-body leading-relaxed">
          가격 정보는 각 서비스의 공식 홈페이지를 기반으로 수집되며,
          환율은 주기적으로 갱신됩니다.
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
