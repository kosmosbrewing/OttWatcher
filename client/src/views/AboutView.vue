<script setup lang="ts">
import { useSEO } from "@/composables/useSEO";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

useSEO({
  title: "서비스 소개 | OTT 가격 비교",
  description: "넷플릭스·유튜브 프리미엄 등 OTT 서비스의 국가별 구독료를 실시간 환율 기준으로 비교하는 서비스입니다. 데이터 출처와 갱신 주기를 안내합니다.",
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
          OTT 서비스 국가별 구독료를 실시간 환율 기준으로 비교합니다.
        </p>
      </div>
    </section>

    <Card class="mb-6 retro-panel">
      <CardHeader>
        <CardTitle>제공 기능</CardTitle>
      </CardHeader>
      <CardContent>
        <ul class="list-disc list-inside text-body text-muted-foreground space-y-1">
          <li>넷플릭스·유튜브 프리미엄 등 주요 OTT 국가별 가격 비교</li>
          <li>실시간 환율 기준 KRW / USD 자동 환산</li>
          <li>개인·패밀리·학생 요금제 플랜별 비교</li>
          <li>국가 간 요금 1:1 직접 비교</li>
          <li>국가별 가격 변동 트렌드</li>
          <li>익명 커뮤니티 (구독 후기·요금제 선택 팁 공유)</li>
        </ul>
      </CardContent>
    </Card>

    <Card class="mb-6 retro-panel">
      <CardHeader>
        <CardTitle>면책 조항</CardTitle>
      </CardHeader>
      <CardContent>
        <ul class="list-disc list-inside text-body text-muted-foreground space-y-1">
          <li>가격은 예고 없이 변동될 수 있으므로 결제 전 공식 사이트에서 확인하세요.</li>
          <li>환율 기준 원화 환산가는 실제 청구 금액과 다를 수 있습니다.</li>
          <li>해외 결제 이용 시 각 서비스의 이용약관을 반드시 검토하세요.</li>
        </ul>
      </CardContent>
    </Card>

    <Card class="retro-panel">
      <CardHeader>
        <CardTitle>문의 · 오류 제보</CardTitle>
      </CardHeader>
      <CardContent>
        <p class="text-body text-muted-foreground mb-2">잘못된 가격 정보 제보 및 기타 문의:</p>
        <a href="mailto:skdba1313@gmail.com" class="text-body font-semibold hover:underline">
          skdba1313@gmail.com
        </a>
      </CardContent>
    </Card>
  </div>
</template>
