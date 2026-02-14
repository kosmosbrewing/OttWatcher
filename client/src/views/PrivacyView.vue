<script setup>
import { useSEO } from "@/composables/useSEO";

useSEO({
  title: "개인정보처리방침 | OTT 가격 비교",
  description: "OTT Price Compare 개인정보처리방침",
});
</script>

<template>
  <div class="container py-8 max-w-3xl">
    <section class="retro-panel overflow-hidden mb-6">
      <div class="retro-titlebar">
        <h1 class="retro-title">개인정보처리방침</h1>
        <span class="retro-kbd">POLICY</span>
      </div>
      <div class="p-4">
        <p class="text-body text-muted-foreground">
          서비스 운영과 데이터 제보 처리 과정에서의 개인정보 처리 원칙을 안내합니다.
        </p>
      </div>
    </section>

    <div class="retro-panel p-4 space-y-6">
      <section>
        <h2 class="text-h2 mb-3">1. 수집하는 개인정보</h2>
        <p class="text-body leading-relaxed">
          본 사이트는 별도의 회원가입 없이 이용 가능하며, 사용자로부터 직접 개인정보를 수집하지 않습니다.
          다만, 웹사이트 이용 과정에서 아래와 같은 정보가 자동으로 수집될 수 있습니다.
        </p>
        <ul class="list-disc list-inside text-body text-muted-foreground mt-2 space-y-1">
          <li>접속 IP 주소, 브라우저 종류, 접속 시간</li>
          <li>방문 페이지, 이용 기록 (Google Analytics 등을 통해)</li>
        </ul>
      </section>

      <section>
        <h2 class="text-h2 mb-3">2. 광고 서비스</h2>
        <p class="text-body leading-relaxed">
          본 사이트는 Google AdSense를 통해 광고를 게재합니다.
          Google은 사용자의 관심사에 기반한 광고를 제공하기 위해 쿠키를 사용할 수 있습니다.
          사용자는 Google 광고 설정에서 맞춤 광고를 비활성화할 수 있습니다.
        </p>
      </section>

      <section>
        <h2 class="text-h2 mb-3">3. 쿠키 사용</h2>
        <p class="text-body leading-relaxed">
          본 사이트는 사용자 경험 개선 및 광고 제공을 위해 쿠키를 사용합니다.
          브라우저 설정을 통해 쿠키를 거부할 수 있으나, 일부 서비스 이용에 제한이 있을 수 있습니다.
        </p>
      </section>

      <section>
        <h2 class="text-h2 mb-3">4. 개인정보의 보관 및 파기</h2>
        <p class="text-body leading-relaxed">
          자동 수집되는 정보는 서비스 운영 목적으로만 사용되며,
          목적 달성 후 지체 없이 파기합니다.
        </p>
      </section>

      <section>
        <h2 class="text-h2 mb-3">5. 문의</h2>
        <p class="text-body leading-relaxed">
          개인정보 관련 문의사항은 이메일로 연락해주시기 바랍니다.
        </p>
      </section>

      <p class="text-caption text-muted-foreground mt-8">
        시행일: 2026년 2월 12일
      </p>
    </div>
  </div>
</template>
