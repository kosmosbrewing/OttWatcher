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
        <CardTitle>서비스 소개</CardTitle>
      </CardHeader>
      <CardContent>
        <p class="text-body leading-relaxed mb-3">
          유튜브 프리미엄 국가별 최저가 비교 서비스입니다.
        </p>
        <ul class="list-disc list-inside text-body text-muted-foreground space-y-1">
          <li>30개국 가격 비교</li>
          <li>현재 환율 기준 KRW/USD 자동 환산</li>
          <li>개인/패밀리/학생 요금제 비교</li>
        </ul>
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

    <Card class="mb-6 retro-panel">
      <CardHeader>
        <CardTitle>면책 조항</CardTitle>
      </CardHeader>
      <CardContent>
        <ul class="list-disc list-inside text-body text-muted-foreground space-y-1">
          <li>가격은 변동될 수 있어 실제 결제 전 공식 사이트에서 확인하시기 바랍니다.</li>
          <li>해외 결제는 유튜브 이용약관을 검토하세요.</li>
          <li>환율 기준 가격은 실제 청구금액과 다를 수 있습니다.</li>
        </ul>
      </CardContent>
    </Card>

    <Card class="retro-panel">
      <CardHeader>
        <CardTitle>문의</CardTitle>
      </CardHeader>
      <CardContent>
        <p class="text-body text-muted-foreground mb-2">잘못된 가격 정보 제보 및 문의:</p>
        <a href="mailto:skdba1313@gmail.com" class="text-body font-semibold hover:underline">
          skdba1313@gmail.com
        </a>
      </CardContent>
    </Card>
  </div>
</template>
