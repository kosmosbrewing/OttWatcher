import { API_BASE, ensureValidSlug, extractApiErrorMessage, isRecord, getNumber } from "./helpers";
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

const PRICE_API_TIMEOUT_MS = 15_000;

// 동일 slug 동시 요청 중복 방지 (API 레벨)
const inflightRequests = new Map<string, Promise<PricesResponse>>();

async function doFetch(serviceSlug: string): Promise<PricesResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), PRICE_API_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE}/prices/${serviceSlug}`, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
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
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("요청 시간이 초과되었습니다.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function fetchPrices(serviceSlug: string): Promise<PricesResponse> {
  ensureValidSlug(serviceSlug);

  const existing = inflightRequests.get(serviceSlug);
  if (existing) return existing;

  const promise = doFetch(serviceSlug).finally(() => {
    inflightRequests.delete(serviceSlug);
  });
  inflightRequests.set(serviceSlug, promise);

  return promise;
}
