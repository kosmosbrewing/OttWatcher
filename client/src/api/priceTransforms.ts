import { getNumber, isRecord } from "./helpers";
import type {
  ConvertedAmount,
  CountryPlanPrice,
  CountryPrice,
  PricesResponse,
} from "./types";

export function normalizePricesResponse(payload: unknown): PricesResponse {
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

        const prev = isRecord(converted[planId]) ? (converted[planId] as ConvertedAmount) : {};
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
