import { ensureValidSlug, extractApiErrorMessage, isRecord, getNumber } from "./helpers";
import type {
  PricesResponse,
  CountryPrice,
  ConvertedAmount,
  CountryPlanPrice,
} from "./types";

function normalizePricesResponse(payload: unknown): PricesResponse {
  if (!isRecord(payload) || !Array.isArray(payload.prices)) {
    throw new Error("가격 데이터 형식이 올바르지 않습니다.");
  }

  const normalizedPrices = payload.prices.map((country): CountryPrice => {
    if (!isRecord(country)) return country as CountryPrice;

    const nextCountry: CountryPrice = { ...(country as CountryPrice) };
    const currency = typeof country.currency === "string" ? country.currency.toUpperCase() : "";
    const plans = isRecord(country.plans)
      ? (country.plans as Record<string, CountryPlanPrice | undefined>)
      : undefined;
    const converted = isRecord(country.converted)
      ? ({ ...(country.converted as Record<string, ConvertedAmount | undefined>) })
      : ({} as Record<string, ConvertedAmount | undefined>);

    if (currency === "KRW" && plans) {
      for (const [planId, plan] of Object.entries(plans)) {
        const monthly = getNumber(plan?.monthly);
        if (monthly == null) continue;

        const prev = isRecord(converted[planId])
          ? (converted[planId] as ConvertedAmount)
          : {};

        converted[planId] = {
          ...prev,
          krw: monthly,
        };
      }
    }

    if (Object.keys(converted).length > 0) {
      nextCountry.converted = converted;
    }

    return nextCountry;
  });

  return {
    ...(payload as PricesResponse),
    prices: normalizedPrices,
  };
}

export async function fetchPrices(serviceSlug: string): Promise<PricesResponse> {
  ensureValidSlug(serviceSlug);

  const response = await fetch(`/data/prices/${serviceSlug}.json`, {
    headers: { Accept: "application/json" },
  });

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    throw new Error(extractApiErrorMessage(payload) || "가격 정보를 불러오지 못했습니다.");
  }

  return normalizePricesResponse(payload);
}
