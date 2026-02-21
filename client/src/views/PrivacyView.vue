<script setup lang="ts">
import { useSEO } from "@/composables/useSEO";

useSEO({
  title: "개인정보처리방침 | OTT 가격 비교",
  description: "OTT 가격 비교 서비스의 개인정보 처리 원칙을 안내합니다.",
});
</script>

<template>
  <div class="container py-8">
    <section class="retro-panel overflow-hidden mb-6">
      <div class="retro-titlebar">
        <h1 class="retro-title">개인정보처리방침</h1>
        <span class="retro-kbd">POLICY</span>
      </div>
      <div class="retro-panel-content">
        <p class="text-body text-muted-foreground">
          서비스 운영 과정에서의 개인정보 처리 원칙을 안내합니다.
        </p>
      </div>
    </section>

    <div class="retro-panel retro-panel-content space-y-6">
      <section>
        <h2 class="text-h2 mb-3">1. 수집하는 정보</h2>
        <p class="text-body leading-relaxed">
          본 사이트는 별도의 회원가입 없이 이용할 수 있으며, 직접적인 개인정보를 수집하지 않습니다.
          다만, 서비스 이용 과정에서 아래 정보가 자동으로 수집될 수 있습니다.
        </p>
        <ul class="list-disc list-inside text-body text-muted-foreground mt-2 space-y-1">
          <li>접속 IP 주소, 브라우저 종류, 접속 시간</li>
          <li>방문 페이지 및 이용 기록 (Google Analytics를 통해)</li>
          <li>익명 커뮤니티 글·댓글 작성 시: 작성 내용, 닉네임(자동 생성), IP 주소, User-Agent</li>
        </ul>
        <p class="text-body text-muted-foreground mt-2">
          커뮤니티에 수집된 IP 및 User-Agent는 어뷰징·스팸 방지 목적으로만 사용되며, 외부에 공개되지 않습니다.
        </p>
      </section>

      <section>
        <h2 class="text-h2 mb-3">2. 이용하는 제3자 서비스</h2>
        <ul class="list-disc list-inside text-body text-muted-foreground space-y-2">
          <li>
            Google Analytics 4: 방문 통계 분석을 위해 익명화된 이용 정보를 수집합니다.
            수집 거부는
            <a
              href="https://tools.google.com/dlpage/gaoptout"
              target="_blank"
              rel="noopener noreferrer"
              class="underline"
            >Google Analytics Opt-out Add-on</a>
            에서 설정할 수 있습니다.
          </li>
          <li>
            Google AdSense: 맞춤 광고 제공을 위해 쿠키를 사용할 수 있습니다.
          </li>
        </ul>
      </section>

      <section>
        <h2 class="text-h2 mb-3">3. 쿠키 사용</h2>
        <p class="text-body leading-relaxed">
          본 사이트는 통계 분석 및 광고 제공을 위해 쿠키를 사용할 수 있습니다.
          브라우저 설정에서 쿠키 저장을 거부하거나 삭제할 수 있으나, 일부 기능이 제한될 수 있습니다.
        </p>
      </section>

      <section>
        <h2 class="text-h2 mb-3">4. 개인정보의 보관 및 파기</h2>
        <p class="text-body leading-relaxed">
          수집된 정보는 서비스 운영 및 어뷰징 방지 목적으로만 사용되며,
          수집 목적 달성 후 또는 관련 법령에 따라 지체 없이 파기합니다.
        </p>
      </section>

      <section>
        <h2 class="text-h2 mb-3">5. 이용자 권리</h2>
        <ul class="list-disc list-inside text-body text-muted-foreground space-y-2">
          <li>개인정보 열람, 정정, 삭제를 이메일로 요청할 수 있습니다.</li>
          <li>
            Google Analytics 수집 거부:
            <a
              href="https://tools.google.com/dlpage/gaoptout"
              target="_blank"
              rel="noopener noreferrer"
              class="underline"
            >브라우저 Add-on</a>
          </li>
          <li>
            광고 맞춤화 거부:
            <a
              href="https://adssettings.google.com/"
              target="_blank"
              rel="noopener noreferrer"
              class="underline"
            >Google 광고 설정</a>
          </li>
        </ul>
      </section>

      <section>
        <h2 class="text-h2 mb-3">6. 개인정보 보호책임자 및 문의</h2>
        <p class="text-body leading-relaxed">운영: Shakilabs</p>
        <p class="text-body leading-relaxed">
          이메일:
          <a href="mailto:skdba1313@gmail.com" class="underline">skdba1313@gmail.com</a>
        </p>
      </section>

      <p class="text-caption text-muted-foreground mt-8">
        시행일: 2026년 2월 21일
      </p>
    </div>
  </div>
</template>
