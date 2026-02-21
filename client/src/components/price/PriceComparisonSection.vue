<script setup lang="ts">
import { ref, computed } from "vue";
import { showAlert } from "@/composables/useAlert";
import { formatNumber, countryFlag } from "@/lib/utils";
import { getSiteUrl } from "@/lib/site";
import { Card, CardContent } from "@/components/ui/card";
import { Share2 } from "lucide-vue-next";
import ShareModal from "@/components/share/ShareModal.vue";
import type { PricesResponse, CountryPrice } from "@/api";

type ComparePriceRow = {
  countryCode: string;
  country: string;
  currency: string | null;
  localMonthly: number | null;
  krw: number | null;
  usd: number | null;
};

type ShareRow = { countryCode: string; country: string; krw: number | null };

type Html2CanvasOptions = {
  backgroundColor?: string | null;
  scale?: number;
  useCORS?: boolean;
  logging?: boolean;
};
type Html2CanvasFn = (el: HTMLElement, opts?: Html2CanvasOptions) => Promise<HTMLCanvasElement>;

const props = defineProps<{
  priceData: PricesResponse;
  selectedPlan: string;
  selectedPlanLabel: string;
  serviceName: string;
  serviceSlug: string;
  comparePriceRows: ComparePriceRow[];
}>();

const siteUrl = getSiteUrl();

function toNumber(value: unknown): number | null {
  if (value == null) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function fmtKrw(val: number | null | undefined): string {
  if (val == null) return "-";
  return `₩${formatNumber(Math.round(val))}`;
}

function fmtUsd(val: number | null | undefined): string {
  if (val == null) return "-";
  return `$${val.toFixed(2)}`;
}

function fmtLocalPrice(value: number | null | undefined, currency: string | null | undefined): string {
  if (value == null) return "-";
  const formatted = new Intl.NumberFormat("ko-KR", {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
  return currency ? `${formatted} ${currency}` : formatted;
}

// 국가 선택 상태
const selectedCompareCountryCode = ref("");
const showCountryModal = ref(false);
const selectedRightCountryCode = ref("KR");
const showRightCountryModal = ref(false);

function selectCountry(code: string) {
  selectedCompareCountryCode.value = code;
  showCountryModal.value = false;
}

function selectRightCountry(code: string) {
  selectedRightCountryCode.value = code;
  showRightCountryModal.value = false;
}

const rightCompareRow = computed<ComparePriceRow | null>(() =>
  props.comparePriceRows.find((row) => row.countryCode === selectedRightCountryCode.value) || null
);

const selectableCompareRows = computed<ComparePriceRow[]>(() =>
  props.comparePriceRows
    .filter((row) => row.countryCode !== selectedRightCountryCode.value && row.krw != null)
    .sort((a, b) => (a.krw ?? Number.POSITIVE_INFINITY) - (b.krw ?? Number.POSITIVE_INFINITY))
);

const selectableRightRows = computed<ComparePriceRow[]>(() =>
  props.comparePriceRows
    .filter((row) => row.countryCode !== selectedCompareCountryCode.value && row.krw != null)
    .sort((a, b) => (a.krw ?? Number.POSITIVE_INFINITY) - (b.krw ?? Number.POSITIVE_INFINITY))
);

const selectedCompareCountry = computed<ComparePriceRow | null>(() =>
  selectableCompareRows.value.find((row) => row.countryCode === selectedCompareCountryCode.value)
  || selectableCompareRows.value[0]
  || null
);

// 초기 좌측 국가 자동 선택
import { watch } from "vue";
watch(
  selectableCompareRows,
  (rows) => {
    if (!rows.length) {
      selectedCompareCountryCode.value = "";
      return;
    }
    const hasSelected = rows.some((row) => row.countryCode === selectedCompareCountryCode.value);
    if (!hasSelected) {
      selectedCompareCountryCode.value = rows[0].countryCode;
    }
  },
  { immediate: true }
);

const compareSavingsPercent = computed<number | null>(() => {
  const leftKrw = selectedCompareCountry.value?.krw ?? null;
  const rightKrw = rightCompareRow.value?.krw ?? null;
  if (leftKrw == null || rightKrw == null || rightKrw <= 0) return null;
  return Math.round(((rightKrw - leftKrw) / rightKrw) * 100);
});

const compareSummary = computed<{ message: string; tone: string } | null>(() => {
  const left = selectedCompareCountry.value;
  const right = rightCompareRow.value;
  const diff = compareSavingsPercent.value;
  if (!left || !right || diff == null) return null;

  if (diff >= 60) return { message: `${left.country}가 ${diff}% 더 저렴해요. 솔직히 말이 안 되는 수준이죠?`, tone: "text-savings" };
  if (diff >= 20) return { message: `${left.country}가 꽤 많이 저렴해요. ${diff}% 차이면 확실히 체감돼요.`, tone: "text-savings" };
  if (diff > 0) return { message: `${left.country}가 ${diff}% 저렴해요. 환율 따라 뒤집힐 수도 있으니 참고만 해요`, tone: "text-savings" };
  if (diff === 0) return { message: `신기하게도 두 나라 요금이 똑같네요.`, tone: "text-muted-foreground" };

  const absDiff = Math.abs(diff);
  if (absDiff >= 60) return { message: `${left.country}가 ${absDiff}% 더 비싸요. 이럴 거면 그냥 ${right.country} 쓰는 게 낫지 않을까요?`, tone: "text-destructive" };
  if (absDiff >= 20) return { message: `${left.country}가 ${absDiff}% 더 비싸네요. ${right.country} 쪽이 훨씬 저렴해요.`, tone: "text-destructive" };
  return { message: `${left.country}가 ${absDiff}% 더 비싸요. 환율 따라 달라질 수 있으니 참고해요.`, tone: "text-destructive" };
});

// ─── 공유 ─────────────────────────────────────────────────
const shareBusy = ref(false);
const kakaoBusy = ref(false);
const showShareModal = ref(false);
const shareCardRef = ref<HTMLElement | null>(null);

type SummaryPriceRow = { countryCode: string; country: string; krw: number; usd: number | null };

const summaryPriceRows = computed<SummaryPriceRow[]>(() => {
  if (!props.priceData?.prices) return [];
  return props.priceData.prices
    .map((country) => {
      const krw = toNumber(country.converted?.[props.selectedPlan]?.krw);
      if (krw == null) return null;
      const usd = toNumber(country.converted?.[props.selectedPlan]?.usd);
      return {
        countryCode: country.countryCode,
        country: typeof country.country === "string" ? country.country : country.countryCode,
        krw,
        usd,
      };
    })
    .filter((row): row is SummaryPriceRow => row !== null);
});

const shareTop3Rows = computed<ShareRow[]>(() =>
  [...summaryPriceRows.value]
    .sort((a, b) => a.krw - b.krw)
    .slice(0, 3)
    .map((r) => ({ countryCode: r.countryCode, country: r.country, krw: r.krw }))
);

const sharePageUrl = computed(() => `${siteUrl}/${props.serviceSlug}`);
const shareTitle = computed(() => `${props.serviceName} 국가별 가격 비교 | OttWatcher`);
const usdToKrwRate = computed<number | null>(() => props.priceData?.krwRate ?? null);

async function loadHtml2Canvas(): Promise<Html2CanvasFn> {
  const w = window as unknown as Record<string, unknown>;
  if (w.html2canvas) return w.html2canvas as Html2CanvasFn;
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("html2canvas 로드 실패"));
    document.head.appendChild(s);
  });
  return (window as unknown as Record<string, unknown>).html2canvas as Html2CanvasFn;
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function createShareCardBlob(): Promise<Blob> {
  if (!shareCardRef.value) throw new Error("공유 카드를 생성할 수 없습니다.");
  const html2canvas = await loadHtml2Canvas();
  const isDark = document.documentElement.classList.contains("dark");
  const canvas = await html2canvas(shareCardRef.value, {
    backgroundColor: isDark ? "#0f172a" : "#f8fafc",
    scale: Math.min(2, window.devicePixelRatio || 1),
    useCORS: true,
    logging: false,
  });
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("이미지 생성에 실패했습니다."))),
      "image/png"
    );
  });
}

async function onShareImage(): Promise<void> {
  if (shareBusy.value) return;
  shareBusy.value = true;
  try {
    const blob = await createShareCardBlob();
    const file = new File([blob], `${props.serviceSlug || "ott"}-share.png`, { type: "image/png" });
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile && typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: shareTitle.value });
      return;
    }
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      showAlert("이미지를 클립보드에 복사했습니다. 붙여넣기로 공유하세요.", { type: "success" });
      return;
    }
    downloadBlob(blob, `${props.serviceSlug || "ott"}-share-card.png`);
    showAlert("공유 카드 이미지를 저장했습니다.", { type: "success" });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") return;
    showAlert(error instanceof Error ? error.message : "공유에 실패했습니다.", { type: "error" });
  } finally {
    shareBusy.value = false;
  }
}

async function onShareKakao(): Promise<void> {
  if (kakaoBusy.value) return;
  kakaoBusy.value = true;
  try {
    const kakaoKey = (import.meta.env as Record<string, string>).VITE_KAKAO_JS_KEY;
    if (!kakaoKey) { showAlert("카카오 공유 설정이 없습니다.", { type: "error" }); return; }
    const w = window as unknown as Record<string, unknown>;
    if (!w.Kakao) {
      await new Promise<void>((resolve, reject) => {
        const s = document.createElement("script");
        s.src = "https://t1.kakaocdn.net/kakao_js_sdk/2.7.2/kakao.min.js";
        s.onload = () => resolve();
        s.onerror = () => reject(new Error("Kakao SDK 로드 실패"));
        document.head.appendChild(s);
      });
    }
    const Kakao = w.Kakao as {
      isInitialized: () => boolean;
      init: (key: string) => void;
      Share: { sendDefault: (opts: Record<string, unknown>) => void };
    };
    if (!Kakao.isInitialized()) Kakao.init(kakaoKey);

    const cheapest = shareTop3Rows.value[0];
    const savings = compareSavingsPercent.value;
    Kakao.Share.sendDefault({
      objectType: "feed",
      content: {
        title: shareTitle.value,
        description: cheapest
          ? `최저가: ${cheapest.country} ${fmtKrw(cheapest.krw)}/월${savings != null && savings > 0 ? ` (${savings}% 절약)` : ""}`
          : `${props.serviceName} 국가별 가격을 비교해보세요`,
        imageUrl: `${siteUrl}/og-image.png`,
        link: { mobileWebUrl: sharePageUrl.value, webUrl: sharePageUrl.value },
      },
      buttons: [{ title: "가격 비교 보기", link: { mobileWebUrl: sharePageUrl.value, webUrl: sharePageUrl.value } }],
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") return;
    showAlert(error instanceof Error ? error.message : "카카오 공유에 실패했습니다.", { type: "error" });
  } finally {
    kakaoBusy.value = false;
  }
}

async function onCopyShareLink(): Promise<void> {
  try {
    await navigator.clipboard.writeText(sharePageUrl.value);
    showAlert("링크를 복사했습니다.", { type: "success" });
  } catch {
    showAlert("링크 복사에 실패했습니다.", { type: "error" });
  }
}

// 부모에게 우측 카드 기준 국가 코드를 알려줌
defineExpose({ selectedRightCountryCode });
</script>

<template>
  <Card id="compare" class="mb-4 retro-panel overflow-hidden">
    <div class="retro-titlebar">
      <h2 class="retro-title">유튜브 프리미엄 국가별 가격 비교</h2>
    </div>
    <CardContent class="space-y-4">
      <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_56px_minmax(0,1fr)] md:items-stretch">
        <!-- 좌측 -->
        <button
          class="group retro-panel-muted p-3 flex h-full min-h-[160px] flex-col text-left border border-border/40 hover:border-primary/60 transition-colors"
          @click="showCountryModal = true"
        >
          <div v-if="selectedCompareCountry" class="w-full h-full flex flex-col justify-between">
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-3.5 min-w-0">
                <span class="text-[2.8rem] leading-none shrink-0">{{ countryFlag(selectedCompareCountry.countryCode) }}</span>
                <div class="min-w-0">
                  <p class="text-body font-black leading-tight truncate">{{ selectedCompareCountry.country }}</p>
                  <p class="text-tiny text-muted-foreground">{{ selectedPlanLabel }} 요금제</p>
                </div>
              </div>
              <span class="retro-kbd text-[0.62rem] uppercase tracking-wide group-hover:text-primary">선택</span>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div class="border border-border/50 px-2 py-2">
                <p class="text-[0.68rem] uppercase tracking-wide text-muted-foreground">현지 요금 (USD)</p>
                <p class="text-caption font-semibold mt-1 tabular-nums">{{ fmtUsd(selectedCompareCountry.usd) }}</p>
                <p class="mt-1 text-[0.64rem] leading-tight text-muted-foreground">현지 통화: {{ fmtLocalPrice(selectedCompareCountry.localMonthly, selectedCompareCountry.currency) }}</p>
              </div>
              <div class="border border-border/50 px-2 py-2">
                <p class="text-[0.68rem] uppercase tracking-wide text-muted-foreground">원화 환산</p>
                <p class="text-caption font-semibold mt-1 tabular-nums">{{ fmtKrw(selectedCompareCountry.krw) }}</p>
              </div>
            </div>
          </div>
          <p v-else class="text-caption text-muted-foreground">비교 가능한 국가 데이터가 없습니다.</p>
        </button>

        <div class="hidden md:flex items-center justify-center">
          <span class="retro-kbd px-3 py-1 font-extrabold text-foreground border-primary/50">VS</span>
        </div>

        <!-- 우측 -->
        <button
          class="group retro-panel-muted p-3 flex h-full min-h-[160px] flex-col text-left border border-border/40 hover:border-primary/60 transition-colors"
          @click="showRightCountryModal = true"
        >
          <div v-if="rightCompareRow" class="w-full h-full flex flex-col justify-between">
            <div class="flex items-start justify-between gap-2">
              <div class="flex items-center gap-3.5 min-w-0">
                <span class="text-[2.8rem] leading-none shrink-0">{{ countryFlag(rightCompareRow.countryCode) }}</span>
                <div class="min-w-0">
                  <p class="text-body font-black leading-tight truncate">{{ rightCompareRow.country }}</p>
                  <p class="text-tiny text-muted-foreground">{{ selectedPlanLabel }} 요금제</p>
                </div>
              </div>
              <div class="shrink-0 flex items-center gap-1.5">
                <span class="retro-kbd text-[0.62rem] tracking-wide">내 요금</span>
                <span class="retro-kbd text-[0.62rem] uppercase tracking-wide group-hover:text-primary">선택</span>
              </div>
            </div>
            <div class="grid grid-cols-2 gap-2">
              <div class="border border-border/50 px-2 py-2">
                <p class="text-[0.68rem] uppercase tracking-wide text-muted-foreground">현지 요금 (USD)</p>
                <p class="text-caption font-semibold mt-1 tabular-nums">{{ fmtUsd(rightCompareRow.usd) }}</p>
                <p class="mt-1 text-[0.64rem] leading-tight text-muted-foreground">현지 통화: {{ fmtLocalPrice(rightCompareRow.localMonthly, rightCompareRow.currency) }}</p>
              </div>
              <div class="border border-border/50 px-2 py-2">
                <p class="text-[0.68rem] uppercase tracking-wide text-muted-foreground">원화 환산</p>
                <p class="text-caption font-semibold mt-1 tabular-nums">{{ fmtKrw(rightCompareRow.krw) }}</p>
              </div>
            </div>
          </div>
          <p v-else class="text-caption text-muted-foreground">비교 가능한 국가 데이터가 없습니다.</p>
        </button>
      </div>

      <!-- 좌측 국가 선택 모달 -->
      <Teleport to="body">
        <div v-if="showCountryModal" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div class="absolute inset-0 bg-black/60" @click="showCountryModal = false" />
          <div class="relative z-10 w-full max-w-sm md:max-w-3xl mx-4 retro-panel border border-border">
            <div class="retro-titlebar flex items-center justify-between">
              <h3 class="retro-title">국가 선택</h3>
              <button class="retro-kbd text-xs" @click="showCountryModal = false">ESC</button>
            </div>
            <div class="p-3 md:p-4 grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-3 max-h-[70vh] overflow-y-auto" style="scrollbar-width: thin">
              <button
                v-for="country in selectableCompareRows"
                :key="country.countryCode"
                @click="selectCountry(country.countryCode)"
                class="border p-2 md:p-3 text-left transition-colors retro-panel-muted min-h-[72px] md:min-h-[88px]"
                :class="selectedCompareCountryCode === country.countryCode ? 'border-primary bg-primary/10' : 'border-border/40 hover:border-border/80'"
              >
                <div class="text-[1.1rem] md:text-[1.35rem] leading-none mb-1">{{ countryFlag(country.countryCode) }}</div>
                <div class="text-tiny md:text-caption font-semibold whitespace-nowrap text-foreground">{{ country.country }}</div>
                <div class="text-tiny md:text-caption tabular-nums text-primary font-bold">{{ fmtKrw(country.krw) }}</div>
              </button>
            </div>
          </div>
        </div>
      </Teleport>

      <!-- 우측 국가 선택 모달 -->
      <Teleport to="body">
        <div v-if="showRightCountryModal" class="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
          <div class="absolute inset-0 bg-black/60" @click="showRightCountryModal = false" />
          <div class="relative z-10 w-full max-w-sm md:max-w-3xl mx-4 retro-panel border border-border">
            <div class="retro-titlebar flex items-center justify-between">
              <h3 class="retro-title">국가 선택</h3>
              <button class="retro-kbd text-xs" @click="showRightCountryModal = false">ESC</button>
            </div>
            <div class="p-3 md:p-4 grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-3 max-h-[70vh] overflow-y-auto" style="scrollbar-width: thin">
              <button
                v-for="country in selectableRightRows"
                :key="country.countryCode"
                @click="selectRightCountry(country.countryCode)"
                class="border p-2 md:p-3 text-left transition-colors retro-panel-muted min-h-[72px] md:min-h-[88px]"
                :class="selectedRightCountryCode === country.countryCode ? 'border-primary bg-primary/10' : 'border-border/40 hover:border-border/80'"
              >
                <div class="text-[1.1rem] md:text-[1.35rem] leading-none mb-1">{{ countryFlag(country.countryCode) }}</div>
                <div class="text-tiny md:text-caption font-semibold whitespace-nowrap text-foreground">{{ country.country }}</div>
                <div class="text-tiny md:text-caption tabular-nums text-primary font-bold">{{ fmtKrw(country.krw) }}</div>
              </button>
            </div>
          </div>
        </div>
      </Teleport>

      <div v-if="compareSummary" class="retro-panel-muted border border-border/50 px-3 py-2.5">
        <p class="text-caption leading-snug" :class="compareSummary.tone">{{ compareSummary.message }}</p>
      </div>

      <!-- 공유하기 버튼 -->
      <div class="flex justify-end">
        <button class="retro-kbd inline-flex items-center gap-1.5 text-[0.72rem] hover:text-primary transition-colors" @click="showShareModal = true">
          <Share2 class="h-3.5 w-3.5" />
          공유하기
        </button>
      </div>
    </CardContent>
  </Card>

  <!-- 오프스크린 공유 카드 (html2canvas 캡처용) -->
  <div class="pointer-events-none fixed -left-[9999px] top-0 z-[-1]" aria-hidden="true">
    <div
      ref="shareCardRef"
      class="bg-background text-foreground"
      style="width:800px; font-family:'Pretendard','Noto Sans KR','Apple SD Gothic Neo',sans-serif;"
    >
      <div style="padding:24px 28px 16px; display:flex; align-items:flex-start; justify-content:space-between;">
        <div class="text-foreground" style="font-size:20px; font-weight:900; line-height:1.2;">{{ serviceName }} 국가별 가격 비교</div>
        <div class="text-muted-foreground" style="font-size:10px; text-align:right; line-height:1.8;">
          <div>환율 기준 {{ priceData.exchangeRateDate }}</div>
          <div v-if="usdToKrwRate">$1 = ₩{{ formatNumber(usdToKrwRate) }}</div>
        </div>
      </div>

      <div v-if="selectedCompareCountry" class="border-t border-border" style="padding:20px 28px;">
        <div style="display:flex; align-items:center; gap:16px;">
          <div class="bg-card border border-border" style="flex:1; padding:18px 16px; text-align:center;">
            <div style="font-size:2.4rem; line-height:1;">{{ countryFlag(selectedCompareCountry.countryCode) }}</div>
            <div class="text-foreground" style="font-size:14px; font-weight:700; margin-top:8px;">{{ selectedCompareCountry.country }}</div>
            <div class="text-primary" style="font-size:22px; font-weight:900; margin-top:6px; font-variant-numeric:tabular-nums;">{{ fmtKrw(selectedCompareCountry.krw) }}</div>
            <div class="text-muted-foreground" style="font-size:10px; margin-top:3px;">{{ fmtUsd(selectedCompareCountry.usd) }}</div>
          </div>
          <div style="flex-shrink:0; text-align:center; min-width:88px;">
            <div v-if="compareSavingsPercent != null && compareSavingsPercent > 0" class="text-savings" style="font-size:34px; font-weight:900; line-height:1;">{{ compareSavingsPercent }}%</div>
            <div class="text-muted-foreground" style="font-size:11px; margin-top:5px; font-weight:600;">더 저렴</div>
          </div>
          <div v-if="rightCompareRow" class="bg-card border border-border" style="flex:1; padding:18px 16px; text-align:center; opacity:0.72;">
            <div style="font-size:2.4rem; line-height:1;">{{ countryFlag(rightCompareRow.countryCode) }}</div>
            <div class="text-foreground" style="font-size:14px; font-weight:700; margin-top:8px;">{{ rightCompareRow.country }}</div>
            <div class="text-foreground" style="font-size:22px; font-weight:900; margin-top:6px; font-variant-numeric:tabular-nums;">{{ fmtKrw(rightCompareRow.krw) }}</div>
            <div class="text-muted-foreground" style="font-size:10px; margin-top:3px;">{{ fmtUsd(rightCompareRow.usd) }}</div>
          </div>
        </div>
      </div>

      <div class="border-t border-border" style="padding:20px 28px;">
        <div class="text-muted-foreground" style="font-size:10px; font-weight:700; letter-spacing:0.1em; text-transform:uppercase; margin-bottom:10px;">TOP 3 최저가 국가</div>
        <div
          v-for="(row, idx) in shareTop3Rows"
          :key="row.countryCode"
          class="bg-card border border-border"
          style="display:flex; align-items:center; justify-content:space-between; padding:14px 18px; margin-bottom:8px;"
        >
          <div style="display:flex; align-items:center; gap:14px;">
            <span style="font-size:1.5rem; line-height:1; flex-shrink:0;">{{ ['🥇','🥈','🥉'][idx] }}</span>
            <span style="font-size:1.25rem; line-height:1; flex-shrink:0;">{{ countryFlag(row.countryCode) }}</span>
            <span class="text-foreground" style="font-size:15px; font-weight:700;">{{ row.country }}</span>
          </div>
          <span class="text-primary" style="font-size:18px; font-weight:900; font-variant-numeric:tabular-nums;">{{ fmtKrw(row.krw) }}</span>
        </div>
      </div>
    </div>
  </div>

  <ShareModal
    :show="showShareModal"
    :share-busy="shareBusy"
    :kakao-busy="kakaoBusy"
    @close="showShareModal = false"
    @share-image="onShareImage()"
    @share-kakao="onShareKakao()"
    @copy-link="onCopyShareLink()"
  />
</template>
