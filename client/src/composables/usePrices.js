import { ref, computed } from "vue";
import { fetchPrices } from "@/api";

export function usePrices() {
  const priceData = ref(null);
  const loading = ref(false);
  const error = ref(null);

  // 필터/정렬 상태
  const selectedPlan = ref("individual");
  const selectedContinent = ref("all");
  const sortOrder = ref("asc"); // asc: 싼 순, desc: 비싼 순
  const displayCurrency = ref("krw"); // krw | usd

  async function loadPrices(serviceSlug) {
    loading.value = true;
    error.value = null;
    try {
      priceData.value = await fetchPrices(serviceSlug);
    } catch (e) {
      error.value = e.message;
    } finally {
      loading.value = false;
    }
  }

  // 필터링 + 정렬된 가격 목록
  const filteredPrices = computed(() => {
    if (!priceData.value?.prices) return [];

    let result = [...priceData.value.prices];

    // 대륙 필터
    if (selectedContinent.value !== "all") {
      result = result.filter((p) => p.continent === selectedContinent.value);
    }

    // 가격 정렬 (선택된 요금제 기준, 선택된 통화 기준)
    const currencyKey = displayCurrency.value;
    result.sort((a, b) => {
      const priceA = a.converted?.[selectedPlan.value]?.[currencyKey] ?? Infinity;
      const priceB = b.converted?.[selectedPlan.value]?.[currencyKey] ?? Infinity;
      return sortOrder.value === "asc" ? priceA - priceB : priceB - priceA;
    });

    return result;
  });

  // 한국 기준 가격 (절약률 계산용)
  const baseCountryPrice = computed(() => {
    if (!priceData.value?.prices) return null;
    return priceData.value.prices.find(
      (p) => p.countryCode === priceData.value.baseCountry
    );
  });

  return {
    priceData,
    loading,
    error,
    selectedPlan,
    selectedContinent,
    sortOrder,
    displayCurrency,
    filteredPrices,
    baseCountryPrice,
    loadPrices,
  };
}
