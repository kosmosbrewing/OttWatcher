import { ref, computed } from "vue";
import { fetchPrices, type CountryPrice, type PricesResponse } from "@/api";

export type SortOrder = "asc" | "desc";
export type DisplayCurrency = "krw" | "usd";

export function usePrices() {
  const priceData = ref<PricesResponse | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  // 필터/정렬 상태
  const selectedPlan = ref<string>("individual");
  const sortOrder = ref<SortOrder>("asc"); // asc: 싼 순, desc: 비싼 순

  async function loadPrices(serviceSlug: string): Promise<void> {
    loading.value = true;
    error.value = null;
    try {
      priceData.value = await fetchPrices(serviceSlug);
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : "가격 정보를 불러오지 못했습니다.";
    } finally {
      loading.value = false;
    }
  }

  // 필터링 + 정렬된 가격 목록 (KRW 기준 정렬)
  const filteredPrices = computed<CountryPrice[]>(() => {
    if (!priceData.value?.prices) return [];

    const result = priceData.value.prices.filter(
      (p) => p.converted?.[selectedPlan.value] != null
    );

    result.sort((a, b) => {
      const priceA = a.converted?.[selectedPlan.value]?.krw ?? Infinity;
      const priceB = b.converted?.[selectedPlan.value]?.krw ?? Infinity;
      return sortOrder.value === "asc" ? priceA - priceB : priceB - priceA;
    });

    return result;
  });

  // 기준 국가 가격 (절약률 계산용)
  const baseCountryPrice = computed<CountryPrice | null>(() => {
    if (!priceData.value?.prices) return null;
    return priceData.value.prices.find(
      (p) => p.countryCode === priceData.value.baseCountry
    ) || null;
  });

  return {
    priceData,
    loading,
    error,
    selectedPlan,
    sortOrder,
    filteredPrices,
    baseCountryPrice,
    loadPrices,
  };
}
