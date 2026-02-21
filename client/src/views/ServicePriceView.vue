<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useRoute, RouterLink } from "vue-router";
import { usePrices } from "@/composables/usePrices";
import { useServices } from "@/composables/useServices";
import { useSEO } from "@/composables/useSEO";
import { useHeadlineMessages } from "@/composables/useHeadlineMessages";
import { fetchTrends, type TrendsResponse, type CountryPrice } from "@/api";
import { formatNumber, countryFlag } from "@/lib/utils";
import { getSiteUrl } from "@/lib/site";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { LoadingSpinner } from "@/components/ui/loading";
import PriceTable from "@/components/price/PriceTable.vue";
import PlanSelector from "@/components/filter/PlanSelector.vue";
import SortToggle from "@/components/filter/SortToggle.vue";
import AnonymousCommunityPanel from "@/components/community/AnonymousCommunityPanel.vue";

const route = useRoute();
const { services, loadServices } = useServices();
const {
  priceData,
  loading,
  error,
  selectedPlan,
  sortOrder,
  filteredPrices,
  baseCountryPrice,
  loadPrices,
} = usePrices();

const { setMessages } = useHeadlineMessages();

const showTrendTop10 = false;
const trendData = ref<TrendsResponse | null>(null);
const trendLoading = ref(false);
const serviceSlug = computed(() => {
  const slug = route.params.serviceSlug;
  return typeof slug === "string" ? slug : "";
});

// 현재 서비스 메타 정보
const currentService = computed(() =>
  services.value.find((s) => s.slug === serviceSlug.value)
);

const SEO_MAP: Record<string, { title: string; description: string }> = {
  "youtube-premium": {
    title: "유튜브 프리미엄 국가별 가격 비교 · 최저가 순위",
    description:
      "유튜브 프리미엄 국가별 구독료를 한눈에 비교. 터키·인도 등 해외 결제로 최대 80% 절약 가능. 현재 환율 기준 최저가 국가 순위를 확인하세요.",
  },
};

const serviceName = computed(() => currentService.value?.name || serviceSlug.value);

const boardHeading = computed(() => {
  return `${serviceName.value} 국가별 최저가 비교`;
});

// 서비스명으로 SEO 동적 설정
const pageTitle = computed(() => {
  return (
    SEO_MAP[serviceSlug.value]?.title ||
    `${serviceName.value} 국가별 가격 비교 · 최저가 순위`
  );
});

const pageDescription = computed(() => {
  return (
    SEO_MAP[serviceSlug.value]?.description ||
    `${serviceName.value} 구독 요금을 국가별로 비교하고 가장 저렴한 나라와 절약률을 확인하세요.`
  );
});

type SummaryPriceRow = {
  countryCode: string;
  country: string;
  krw: number;
  usd: number | null;
};

type ComparePriceRow = {
  countryCode: string;
  country: string;
  currency: string | null;
  localMonthly: number | null;
  krw: number | null;
  usd: number | null;
};

function toNumber(value: unknown): number | null {
  if (value == null) return null;
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

const siteUrl = getSiteUrl();

const summaryPriceRows = computed<SummaryPriceRow[]>(() => {
  if (!priceData.value?.prices) return [];

  return priceData.value.prices
    .map((country) => {
      const krw = toNumber(country.converted?.[selectedPlan.value]?.krw);
      if (krw == null) return null;
      const usd = toNumber(country.converted?.[selectedPlan.value]?.usd);

      return {
        countryCode: country.countryCode,
        country: typeof country.country === "string" ? country.country : country.countryCode,
        krw,
        usd,
      };
    })
    .filter((row): row is SummaryPriceRow => row !== null);
});

const cheapestSummary = computed<SummaryPriceRow | null>(() => {
  if (!summaryPriceRows.value.length) return null;

  return [...summaryPriceRows.value].sort((a, b) => a.krw - b.krw)[0] || null;
});

const baseCountrySummary = computed<SummaryPriceRow | null>(() => {
  const baseCountryCode = (priceData.value?.baseCountry || "").toUpperCase();
  if (!baseCountryCode) return null;

  return (
    summaryPriceRows.value.find((country) => country.countryCode === baseCountryCode) || null
  );
});

const summarySavingsPercent = computed(() => {
  if (!cheapestSummary.value || !baseCountrySummary.value || baseCountrySummary.value.krw <= 0) {
    return 0;
  }

  return Math.max(
    0,
    Math.round(
      ((baseCountrySummary.value.krw - cheapestSummary.value.krw) / baseCountrySummary.value.krw) *
        100
    )
  );
});

const selectedPlanLabel = computed(() => {
  const match = currentService.value?.plans?.find((plan) => plan.id === selectedPlan.value);
  return match?.name || selectedPlan.value;
});

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

const comparePriceRows = computed<ComparePriceRow[]>(() => {
  if (!priceData.value?.prices) return [];

  return priceData.value.prices
    .map((country) => {
      const plan = country.plans?.[selectedPlan.value];
      const converted = country.converted?.[selectedPlan.value];
      const code = String(country.countryCode || "").toUpperCase();
      if (!code) return null;

      return {
        countryCode: code,
        country: typeof country.country === "string" ? country.country : code,
        currency: typeof country.currency === "string" ? country.currency : null,
        localMonthly: toNumber(plan?.monthly),
        krw: toNumber(converted?.krw),
        usd: toNumber(converted?.usd),
      };
    })
    .filter((row): row is ComparePriceRow => row !== null);
});

const rightCompareRow = computed<ComparePriceRow | null>(() => {
  return comparePriceRows.value.find((row) => row.countryCode === selectedRightCountryCode.value) || null;
});

// 우측 카드 선택 국가를 랭킹 테이블의 기준 국가로 사용
const dynamicBaseCountryPrice = computed<CountryPrice | null>(() => {
  if (!priceData.value?.prices) return null;
  return priceData.value.prices.find(
    (p) => p.countryCode === selectedRightCountryCode.value
  ) || null;
});

// 좌측 선택 목록: 우측 선택 국가 제외
const selectableCompareRows = computed<ComparePriceRow[]>(() => {
  return comparePriceRows.value
    .filter((row) => row.countryCode !== selectedRightCountryCode.value && row.krw != null)
    .sort((a, b) => (a.krw ?? Number.POSITIVE_INFINITY) - (b.krw ?? Number.POSITIVE_INFINITY));
});

// 우측 선택 목록: 좌측 선택 국가 제외
const selectableRightRows = computed<ComparePriceRow[]>(() => {
  return comparePriceRows.value
    .filter((row) => row.countryCode !== selectedCompareCountryCode.value && row.krw != null)
    .sort((a, b) => (a.krw ?? Number.POSITIVE_INFINITY) - (b.krw ?? Number.POSITIVE_INFINITY));
});

const selectedCompareCountry = computed<ComparePriceRow | null>(() => {
  return (
    selectableCompareRows.value.find(
      (row) => row.countryCode === selectedCompareCountryCode.value
    ) ||
    selectableCompareRows.value[0] ||
    null
  );
});

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

  if (diff >= 60) {
    return {
      message: `${left.country}가 ${diff}% 더 저렴해요. 솔직히 말이 안 되는 수준이죠? 🤯`,
      tone: "text-savings",
    };
  }
  if (diff >= 20) {
    return {
      message: `${left.country}가 꽤 많이 저렴해요. ${diff}% 차이면 확실히 체감돼요.`,
      tone: "text-savings",
    };
  }
  if (diff > 0) {
    return {
      message: `${left.country}가 ${diff}% 저렴해요. 환율 따라 뒤집힐 수도 있으니 참고만 해요 👀`,
      tone: "text-savings",
    };
  }
  if (diff === 0) {
    return {
      message: `신기하게도 두 나라 요금이 똑같네요. 🤝`,
      tone: "text-muted-foreground",
    };
  }
  // diff < 0: 좌측이 더 비싼 경우 — 양수 케이스와 대칭되게 3단계
  const absDiff = Math.abs(diff);
  if (absDiff >= 60) {
    return {
      message: `${left.country}가 ${absDiff}% 더 비싸요. 이럴 거면 그냥 ${right.country} 쓰는 게 낫지 않을까요? 😅`,
      tone: "text-destructive",
    };
  }
  if (absDiff >= 20) {
    return {
      message: `${left.country}가 ${absDiff}% 더 비싸네요. ${right.country} 쪽이 훨씬 저렴해요.`,
      tone: "text-destructive",
    };
  }
  return {
    message: `${left.country}가 ${absDiff}% 더 비싸요. 환율 따라 달라질 수 있으니 참고해요.`,
    tone: "text-destructive",
  };
});

const itemListElements = computed<Record<string, unknown>[]>(() => {
  const base = baseCountrySummary.value;
  const baseCountryName = base?.country || "한국";
  const baseKrw = base?.krw || null;

  return [...summaryPriceRows.value]
    .sort((a, b) => a.krw - b.krw)
    .slice(0, 10)
    .map((row, index) => {
      const savingsPercent =
        baseKrw && baseKrw > 0
          ? Math.round(((baseKrw - row.krw) / baseKrw) * 100)
          : null;
      let description = `월 ${fmtKrw(row.krw)}`;
      if (savingsPercent != null) {
        if (savingsPercent > 0) {
          description = `월 ${fmtKrw(row.krw)} (${baseCountryName} 대비 ${savingsPercent}% 저렴)`;
        } else if (savingsPercent < 0) {
          description = `월 ${fmtKrw(row.krw)} (${baseCountryName} 대비 ${Math.abs(savingsPercent)}% 비쌈)`;
        } else {
          description = `월 ${fmtKrw(row.krw)} (${baseCountryName}와 동일)`;
        }
      }

      return {
        "@type": "ListItem",
        position: index + 1,
        name: row.country,
        description,
      };
    });
});

type FaqItem = {
  q: string;
  a: string;
};

// 화면 FAQ 섹션 (공통 + 서비스별 FAQ 병합, selectedPlan reactive)
const faqItems = computed<FaqItem[]>(() => {
  const cheapest = cheapestSummary.value;
  const currentServiceName = serviceName.value;
  if (!cheapest || !currentServiceName) return [];

  const base = baseCountrySummary.value;
  const baseCountryName = base?.country || "한국";
  const baseCountryCode = (priceData.value?.baseCountry || "").toUpperCase();
  const exchangeRateDate = priceData.value?.exchangeRateDate || "최근 기준일";
  const lastUpdated = priceData.value?.lastUpdated || "최근 업데이트";
  const isYoutubePremium = serviceSlug.value === "youtube-premium";
  const isKoreaBase = baseCountryCode === "KR";

  // USD 병기: null이면 생략
  const cheapestUsd = cheapest.usd != null ? ` / ${fmtUsd(cheapest.usd)}` : "";
  const baseUsd = base?.usd != null ? ` / ${fmtUsd(base.usd)}` : "";

  const cheapestAnswer =
    base && summarySavingsPercent.value > 0
      ? `현재 환율(기준일: ${exchangeRateDate})을 반영한 결과, ${cheapest.country} ${selectedPlanLabel.value} 요금이 월 ${fmtKrw(cheapest.krw)}${cheapestUsd}으로 가장 낮습니다.\n이는 ${baseCountryName}(${fmtKrw(base.krw)}${baseUsd}) 대비 약 ${summarySavingsPercent.value}% 낮은 수준입니다.`
      : `현재 환율(기준일: ${exchangeRateDate})을 반영한 결과, ${cheapest.country} ${selectedPlanLabel.value} 요금이 월 ${fmtKrw(cheapest.krw)}${cheapestUsd}으로 가장 낮습니다.`;

  const baseAnswer = base
    ? `${base.country} ${currentServiceName} ${selectedPlanLabel.value} 요금은 월 ${fmtKrw(base.krw)}${baseUsd}입니다.${isYoutubePremium && isKoreaBase ? "\niOS 앱스토어 결제 시 금액이 다를 수 있습니다." : ""}`
    : `${currentServiceName} ${selectedPlanLabel.value} 요금은 서비스 공식 안내 페이지에서 확인할 수 있습니다.`;

  const commonFaqItems: FaqItem[] = [
    {
      q: `${currentServiceName} ${selectedPlanLabel.value} 요금제 기준 가장 저렴한 나라는?`,
      a: cheapestAnswer,
    },
    {
      q: isYoutubePremium && isKoreaBase
        ? "한국 YouTube Premium 요금은 얼마인가요?"
        : baseCountryCode === "KR"
        ? `한국 ${currentServiceName} ${selectedPlanLabel.value} 요금제는?`
        : `${baseCountryName} ${currentServiceName} ${selectedPlanLabel.value} 요금제는?`,
      a: baseAnswer,
    },
    {
      q: "국가마다 가격이 다른 이유가 뭔가요?",
      a: "플랫폼 사업자는 국가별 세금 정책, 현지 구매력, 결제 인프라, 모바일 시장 경쟁 환경, 프로모션 전략 등을 종합적으로 반영해 지역별 가격을 책정합니다.\n따라서 동일 서비스라도 국가별 요금 차이가 발생합니다.",
    },
    {
      q: "환율이 바뀌면 원화 가격도 달라지나요?",
      a: `네, 달라집니다. 현지 통화 요금이 같아도 원화 환산값은 변동됩니다.\n이 페이지는 기준일 환율(${exchangeRateDate})과 업데이트 주기를 반영해 계산합니다.\n실제 결제 시점의 환율 및 카드사 해외 결제 수수료에 따라 최종 청구 금액은 달라질 수 있습니다.`,
    },
    {
      q: "패밀리 플랜이 개인 플랜보다 유리한가요?",
      a: "비용 측면에서는 인원 수가 많을수록 1인당 부담이 낮아질 수 있습니다.\n다만 동일 거주지(Same Household) 요건, 국가 제한, 계정 공유 정책을 충족해야 합니다.\n최근 접속 위치/IP 기반 검증에 따라 이용이 제한될 수 있으므로 약관 확인이 필요합니다.",
    },
    {
      q: "가격 데이터는 어떻게 수집하고 업데이트하나요?",
      a: `가격 데이터는 서비스 공식 공개 요금을 기준으로 내부 모니터링 및 검수 후 갱신합니다.\n현재 가격 데이터 기준일은 ${lastUpdated}, 환율 기준일은 ${exchangeRateDate}이며, 환율 데이터는 업데이트 주기에 따라 정기 반영됩니다.`,
    },
  ];

  const serviceSpecificFaqMap: Record<string, FaqItem[]> = {
    "youtube-premium": [
      {
        q: "해외 요금제(우회 결제) 이용 시 주의할 점은?",
        a: "국가별로 현지 발급 결제수단을 요구하는 경우가 많습니다.\n또한 VPN 등 위치 우회를 통한 결제가 정책 위반으로 판단되면 사전 고지 없이 멤버십이 제한 또는 해지될 수 있습니다.",
      },
      {
        q: "프리미엄 라이트(Lite)나 듀오(Duo) 요금제는 왜 일부 국가에만 있나요?",
        a: "신규 요금제는 서비스사의 지역별 테스트, 규제 환경, 상용화 일정에 따라 순차적으로 도입됩니다.\n해당 국가에서 공식 지원하지 않는 플랜은 비교표에서 제외되며, 정책 변경 시 제공 여부가 달라질 수 있습니다.",
      },
    ],
    spotify: [
      {
        q: "Spotify Duo/Family/Student 비교 시 무엇을 확인해야 하나요?",
        a: "요금뿐 아니라 자격 요건을 함께 확인해야 합니다.\n동일 주소 확인, 학생 인증, 국가 제한 등 플랜별 조건이 달라 실제 가입 가능 여부가 다를 수 있습니다.",
      },
    ],
    netflix: [
      {
        q: "Netflix 요금제 명칭이 국가마다 다른 이유는 무엇인가요?",
        a: "광고형 포함 여부, 화질, 동시 시청 수 등 요금제 구성 요소가 국가별로 다를 수 있기 때문입니다.\n동일 명칭이라도 제공 기능은 국가 정책에 따라 달라질 수 있습니다.",
      },
    ],
    "disney-plus": [
      {
        q: "Disney+ 연간 요금(월 환산)과 월간 요금은 어떻게 봐야 하나요?",
        a: "연간 요금의 월 환산값은 비교를 위한 참고값입니다.\n실제 결제는 선결제 조건, 환불 정책, 국가별 약관에 따라 다를 수 있으므로 결제 조건을 함께 확인해야 합니다.",
      },
    ],
    "amazon-prime-video": [
      {
        q: "Amazon Prime Video 요금 비교 시 유의할 점은?",
        a: "국가에 따라 Prime 번들 포함 범위, 부가 혜택, 결제 주기가 다를 수 있습니다.\n단순 월 요금뿐 아니라 실제 제공 범위를 함께 확인하는 것이 안전합니다.",
      },
    ],
  };

  return [...commonFaqItems, ...(serviceSpecificFaqMap[serviceSlug.value] || [])];
});

// JSON-LD용 스냅샷: 초기 데이터 로드 시 1회만 기록 (selectedPlan 변경에 반응하지 않음)
const seoFaqSnapshot = ref<{ q: string; a: string }[]>([]);
watch(
  faqItems,
  (items) => {
    if (items.length > 0 && seoFaqSnapshot.value.length === 0) {
      seoFaqSnapshot.value = [...items];
    }
  },
  { immediate: true }
);

// 실제 랭킹 데이터 기반 헤더 Fade 메시지 생성 (환율 변동 시 자동 갱신)
watch(
  [summaryPriceRows, baseCountrySummary, serviceName, priceData],
  ([rows, base, name, data]) => {
    if (!rows.length || !name) return;

    const sorted = [...rows].sort((a, b) => a.krw - b.krw);
    const [cheapest, second, third] = sorted;
    const mostExpensive = sorted[sorted.length - 1];
    const baseKrw = base?.krw ?? null;

    // 사전 계산 — 조건 분기를 아래에서 단순하게 유지
    const savings =
      cheapest && baseKrw && baseKrw > 0
        ? Math.round(((baseKrw - cheapest.krw) / baseKrw) * 100)
        : 0;
    const savingsAmt = cheapest && baseKrw ? Math.round(baseKrw - cheapest.krw) : 0;
    const cups = Math.floor(savingsAmt / 5000);
    const underKorea = baseKrw != null ? rows.filter((r) => r.krw < baseKrw).length : 0;

    // 라이트 플랜 — 해당 서비스에 없으면 null
    const baseEntry = data?.prices.find(
      (p) => p.countryCode.toUpperCase() === (data.baseCountry ?? "").toUpperCase()
    );
    const liteKrw = toNumber(baseEntry?.converted?.["lite"]?.krw);

    const msgs: string[] = [];

    // 1. 핵심: 최저가 reveal — 항상 첫 번째로 배치
    if (cheapest) {
      msgs.push(`현재 최저가 🥇 ${cheapest.country} — 월 ${fmtKrw(cheapest.krw)}`);
    }

    // 2. 감성: 충격 직접 비교
    if (savings > 0 && cheapest) {
      msgs.push(`한국 ${fmtKrw(baseKrw!)} vs ${cheapest.country} ${fmtKrw(cheapest.krw)} 🫠`);
    }

    // 3. 위트: 최고가 반전 — 충격 비교 직후 배치해 단조로움 방지
    // countryCode 값 비교 사용 (reference 비교 대신)
    if (
      mostExpensive &&
      mostExpensive.countryCode !== cheapest?.countryCode &&
      baseKrw != null &&
      mostExpensive.krw > baseKrw
    ) {
      msgs.push(
        `${countryFlag(mostExpensive.countryCode)} ${mostExpensive.country}는 월 ${fmtKrw(mostExpensive.krw)}... 한국은 양반이네요 😅`
      );
    }

    // 4. 실질: 월 절약 금액
    if (savingsAmt > 0) {
      msgs.push(`매달 ${fmtKrw(savingsAmt)}씩 아낄 수 있어요`);
    }

    // 5. 다양성: 2위 국가
    if (second) {
      msgs.push(`🥈 ${second.country}. 월 ${fmtKrw(second.krw)}`);
    }

    // 6. 데이터: 절약 퍼센트
    if (savings > 0) {
      msgs.push(`최대 ${savings}% 더 저렴한 나라가 있어요`);
    }

    // 7. 위트: 커피 환산 — 2잔 이상일 때만
    if (cups >= 2) {
      msgs.push(`절약액으로 커피 ${cups}잔. 매달.`);
    }

    // 8. 다양성: 3위 국가
    if (third) {
      msgs.push(`🥉 ${third.country}도 있어요. 월 ${fmtKrw(third.krw)}`);
    }

    // 9. 큰 그림: 연간 절약
    if (savingsAmt > 0) {
      msgs.push(`1년이면 ${fmtKrw(savingsAmt * 12)} 차이나요`);
    }

    // 10. 맞춤: 라이트 플랜 — 가격을 앞에 배치해 truncate 시에도 핵심 노출
    if (liteKrw != null) {
      msgs.push(`라이트 플랜 월 ${fmtKrw(Math.round(liteKrw))} — 유튜브 뮤직 없이 🎵`);
    }

    // 11. 글로벌: USD 관점
    if (cheapest?.usd != null) {
      msgs.push(`최저가 ${cheapest.country} — 달러로 ${fmtUsd(cheapest.usd)}/월`);
    }

    // 12. 범위: 한국보다 저렴한 나라 수
    if (underKorea > 0) {
      msgs.push(`${underKorea}개국이 한국보다 저렴합니다`);
    }

    setMessages(msgs);
  },
  { immediate: true }
);

const seoJsonLd = computed<Record<string, unknown> | undefined>(() => {
  if (!seoFaqSnapshot.value.length) return undefined;

  const currentServiceName = serviceName.value;

  const graph: Record<string, unknown>[] = [
    {
      "@type": "FAQPage",
      mainEntity: seoFaqSnapshot.value.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    },
    {
      "@type": "Dataset",
      name: `${currentServiceName} 국가별 구독 가격 데이터`,
      description: `${currentServiceName} 국가별 ${selectedPlanLabel.value} 월 구독료와 KRW/USD 환산 데이터`,
      url: `${siteUrl}/${serviceSlug.value}`,
      dateModified: priceData.value?.lastUpdated || undefined,
      variableMeasured: ["월 구독료 (현지 통화)", "월 구독료 (KRW)", "월 구독료 (USD)"],
    },
  ];

  if (itemListElements.value.length > 0) {
    graph.push({
      "@type": "ItemList",
      name: `${currentServiceName} ${selectedPlanLabel.value} 국가별 가격 순위`,
      itemListElement: itemListElements.value,
    });
  }

  return {
    "@context": "https://schema.org",
    "@graph": graph,
  };
});

useSEO({
  title: pageTitle,
  description: pageDescription,
  ogImage: `${siteUrl}/og-image.png`,
  jsonLd: seoJsonLd,
});

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

// 백엔드 API에서 받은 실제 원/달러 환율
const usdToKrwRate = computed<number | null>(() =>
  priceData.value?.krwRate ?? null
);

function fmtDeltaKrw(value: number | null | undefined): string {
  if (value == null) return "-";
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatNumber(value)}원`;
}

async function loadTrendData(service: string): Promise<void> {
  trendLoading.value = true;
  try {
    trendData.value = await fetchTrends(service);
  } catch {
    trendData.value = null;
  } finally {
    trendLoading.value = false;
  }
}

async function init(): Promise<void> {
  if (!serviceSlug.value) return;
  const tasks: Array<Promise<void>> = [
    loadServices(),
    loadPrices(serviceSlug.value),
  ];
  if (showTrendTop10) {
    tasks.push(loadTrendData(serviceSlug.value));
  }
  await Promise.all(tasks);
}

onMounted(init);

watch(
  serviceSlug,
  (slug) => {
    if (!slug) return;
    void loadPrices(slug);
    if (showTrendTop10) {
      void loadTrendData(slug);
    }
  }
);

watch(
  selectableCompareRows,
  (rows) => {
    if (!rows.length) {
      selectedCompareCountryCode.value = "";
      return;
    }

    const hasSelected = rows.some(
      (row) => row.countryCode === selectedCompareCountryCode.value
    );
    if (!hasSelected) {
      selectedCompareCountryCode.value = rows[0].countryCode;
    }
  },
  { immediate: true }
);
</script>

<template>
  <div class="container py-6">
    <!-- 로딩 -->
    <div v-if="loading" class="third-rate-board">
      <div class="space-y-2 mt-4 animate-pulse" aria-hidden="true">
        <div v-for="i in 10" :key="i" class="h-10 rounded bg-muted/70" />
      </div>
    </div>

    <!-- 에러 -->
    <div v-else-if="error" class="text-center py-20">
      <p class="text-destructive text-body">{{ error }}</p>
    </div>

    <!-- 가격 데이터 -->
    <div v-else-if="priceData" class="third-rate-board">
      <Card id="compare" class="mb-4 retro-panel overflow-hidden">
        <div class="retro-titlebar">
          <h2 class="retro-title">유튜브 프리미엄 국가별 가격 비교</h2>
        </div>
        <CardContent class="space-y-4">
          <div class="grid gap-3 md:grid-cols-[minmax(0,1fr)_56px_minmax(0,1fr)] md:items-stretch">
            <!-- 좌측: 클릭하면 국가 선택 모달 열림 -->
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
                    <p class="text-caption font-semibold mt-1 tabular-nums">
                      {{ fmtUsd(selectedCompareCountry.usd) }}
                    </p>
                    <p class="mt-1 text-[0.64rem] leading-tight text-muted-foreground">
                      현지 통화: {{ fmtLocalPrice(selectedCompareCountry.localMonthly, selectedCompareCountry.currency) }}
                    </p>
                  </div>
                  <div class="border border-border/50 px-2 py-2">
                    <p class="text-[0.68rem] uppercase tracking-wide text-muted-foreground">원화 환산</p>
                    <p class="text-caption font-semibold mt-1 tabular-nums">
                      {{ fmtKrw(selectedCompareCountry.krw) }}
                    </p>
                  </div>
                </div>
              </div>
              <p v-else class="text-caption text-muted-foreground">
                비교 가능한 국가 데이터가 없습니다.
              </p>
            </button>

            <div class="hidden md:flex items-center justify-center">
              <span class="retro-kbd px-3 py-1 font-extrabold text-foreground border-primary/50">VS</span>
            </div>

            <!-- 우측: 클릭하면 국가 선택 모달 열림 -->
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
                    <p class="text-caption font-semibold mt-1 tabular-nums">
                      {{ fmtUsd(rightCompareRow.usd) }}
                    </p>
                    <p class="mt-1 text-[0.64rem] leading-tight text-muted-foreground">
                      현지 통화: {{ fmtLocalPrice(rightCompareRow.localMonthly, rightCompareRow.currency) }}
                    </p>
                  </div>
                  <div class="border border-border/50 px-2 py-2">
                    <p class="text-[0.68rem] uppercase tracking-wide text-muted-foreground">원화 환산</p>
                    <p class="text-caption font-semibold mt-1 tabular-nums">
                      {{ fmtKrw(rightCompareRow.krw) }}
                    </p>
                  </div>
                </div>
              </div>
              <p v-else class="text-caption text-muted-foreground">
                비교 가능한 국가 데이터가 없습니다.
              </p>
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
                <div
                  class="p-3 md:p-4 grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-3 max-h-[70vh] overflow-y-auto"
                  style="scrollbar-width: thin"
                >
                  <button
                    v-for="country in selectableCompareRows"
                    :key="country.countryCode"
                    @click="selectCountry(country.countryCode)"
                    class="border p-2 md:p-3 text-left transition-colors retro-panel-muted min-h-[72px] md:min-h-[88px]"
                    :class="
                      selectedCompareCountryCode === country.countryCode
                        ? 'border-primary bg-primary/10'
                        : 'border-border/40 hover:border-border/80'
                    "
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
                <div
                  class="p-3 md:p-4 grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2 md:gap-3 max-h-[70vh] overflow-y-auto"
                  style="scrollbar-width: thin"
                >
                  <button
                    v-for="country in selectableRightRows"
                    :key="country.countryCode"
                    @click="selectRightCountry(country.countryCode)"
                    class="border p-2 md:p-3 text-left transition-colors retro-panel-muted min-h-[72px] md:min-h-[88px]"
                    :class="
                      selectedRightCountryCode === country.countryCode
                        ? 'border-primary bg-primary/10'
                        : 'border-border/40 hover:border-border/80'
                    "
                  >
                    <div class="text-[1.1rem] md:text-[1.35rem] leading-none mb-1">{{ countryFlag(country.countryCode) }}</div>
                    <div class="text-tiny md:text-caption font-semibold whitespace-nowrap text-foreground">{{ country.country }}</div>
                    <div class="text-tiny md:text-caption tabular-nums text-primary font-bold">{{ fmtKrw(country.krw) }}</div>
                  </button>
                </div>
              </div>
            </div>
          </Teleport>

          <div
            v-if="compareSummary"
            class="retro-panel-muted border border-border/50 px-3 py-2.5"
          >
            <p class="text-caption leading-snug" :class="compareSummary.tone">{{ compareSummary.message }}</p>
          </div>
        </CardContent>
      </Card>

      <!-- 필터 영역 -->
      <Card class="mb-4 retro-panel">
        <CardContent class="space-y-4">
          <!-- 요금제 선택 + 통화/정렬 -->
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <PlanSelector
              v-if="currentService"
              :plans="currentService.plans"
              v-model="selectedPlan"
            />
            <div class="flex items-center gap-2">
              <SortToggle v-model="sortOrder" />
            </div>
          </div>
        </CardContent>
      </Card>

      <!-- 가격 테이블 + 우측 익명 커뮤니티 -->
      <section class="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_340px]">
        <div class="space-y-4">
          <Card id="ranking" class="retro-panel overflow-hidden">
            <div class="retro-titlebar">
              <h2 class="retro-title">유튜브 프리미엄 국가별 가격 랭킹</h2>
            </div>
            <CardContent>
              <PriceTable
                :prices="filteredPrices"
                :selected-plan="selectedPlan"
                :sort-order="sortOrder"
                :base-country-price="dynamicBaseCountryPrice"
                :service-slug="serviceSlug"
              />
              <div class="mt-2 flex flex-wrap items-center justify-end gap-2 text-[0.72rem] sm:text-[0.76rem] font-medium leading-tight">
                <span class="text-muted-foreground">총 {{ filteredPrices.length }}개국</span>
                <span class="text-muted-foreground">· 업데이트 {{ priceData.lastUpdated }}</span>
                <span class="text-muted-foreground">· 환율 기준 {{ priceData.exchangeRateDate }}</span>
                <span v-if="usdToKrwRate" class="text-muted-foreground">· $1 = ₩{{ formatNumber(usdToKrwRate) }}</span>
              </div>
            </CardContent>
          </Card>

          <Card v-if="showTrendTop10" class="retro-panel overflow-hidden">
            <div class="retro-titlebar">
              <h2 class="retro-title">최근 가격 변동 TOP 10</h2>
              <RouterLink :to="`/${serviceSlug}/trends`" class="retro-kbd hover:bg-primary-foreground/25">
                MORE
              </RouterLink>
            </div>
            <CardContent>
              <LoadingSpinner v-if="trendLoading" variant="dots" size="sm" :center="false" />
              <div v-else-if="trendData?.biggestDrops?.length">
                <Table>
                  <TableHeader class="sticky top-0 z-10 bg-background">
                    <TableRow>
                      <TableHead class="text-body text-muted-foreground">국가</TableHead>
                      <TableHead class="text-body text-muted-foreground text-right">이전</TableHead>
                      <TableHead class="text-body text-muted-foreground text-right">현재</TableHead>
                      <TableHead class="text-body text-muted-foreground text-right">변동</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow v-for="item in trendData.biggestDrops" :key="item.countryCode">
                      <TableCell>
                        <RouterLink
                          :to="`/${serviceSlug}/${item.countryCode.toLowerCase()}`"
                          class="inline-flex items-center gap-2 hover:text-primary transition-colors font-semibold"
                        >
                          <span class="text-body">{{ countryFlag(item.countryCode) }}</span>
                          <span class="text-body">{{ item.country }}</span>
                        </RouterLink>
                      </TableCell>
                      <TableCell class="text-caption text-muted-foreground text-right tabular-nums">{{ fmtKrw(item.previousKrw) }}</TableCell>
                      <TableCell class="font-semibold text-body text-foreground text-right tabular-nums">{{ fmtKrw(item.currentKrw) }}</TableCell>
                      <TableCell
                        class="text-body text-right tabular-nums"
                        :class="item.changeKrw < 0 ? 'text-savings' : 'text-destructive'"
                      >
                        {{ fmtDeltaKrw(item.changeKrw) }}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
              <div v-else class="text-caption text-muted-foreground">
                비교할 변동 데이터가 없습니다.
              </div>
            </CardContent>
          </Card>
        </div>

        <aside class="space-y-4">
          <AnonymousCommunityPanel :service-slug="serviceSlug" :display-limit="filteredPrices.length" />
        </aside>
      </section>

      <!-- FAQ 섹션: JSON-LD와 동일 소스 → rich result + 가시성 동시 확보 -->
      <Card v-if="faqItems.length" id="faq" class="mt-4 retro-panel overflow-hidden">
        <div class="retro-titlebar">
          <h2 class="retro-title">자주 묻는 질문</h2>
        </div>
        <CardContent class="px-4 py-2">
          <Accordion type="multiple" class="w-full">
            <AccordionItem
              v-for="(item, i) in faqItems"
              :key="i"
              :value="`faq-${i}`"
            >
              <article>
                <AccordionTrigger class="text-caption">{{ item.q }}</AccordionTrigger>
                <AccordionContent>{{ item.a }}</AccordionContent>
              </article>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  </div>
</template>

<style scoped>
.third-rate-board :deep(.retro-title) {
  font-size: clamp(1.5rem, 3.2vw, 2.5rem);
  font-weight: 900;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  text-shadow: 1px 1px 0 rgb(203 213 225 / 0.9);
}

.third-rate-board :deep(.retro-kbd) {
  font-size: clamp(0.9rem, 1.4vw, 1.1rem);
  font-weight: 800;
  letter-spacing: 0.05em;
}

.third-rate-board :deep(.text-body) {
  font-size: clamp(1rem, 1.65vw, 1.24rem);
  font-weight: 700;
}

.third-rate-board :deep(.text-caption) {
  font-size: clamp(0.9rem, 1.3vw, 1.05rem);
  font-weight: 700;
}

.third-rate-board :deep(.text-tiny) {
  font-size: clamp(0.84rem, 1.08vw, 0.96rem);
  font-weight: 700;
}

.third-rate-board :deep(th) {
  font-size: clamp(0.9rem, 1.3vw, 1.05rem);
  font-weight: 800;
}

.third-rate-board :deep(td) {
  font-size: clamp(0.9rem, 1.2vw, 1rem);
  font-weight: 650;
}
</style>
