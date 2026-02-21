import youtubePremiumHistory from "../../../data/history/youtube-premium.json";
import { ensureValidSlug, getNumber } from "./helpers";
import { fetchPrices } from "./prices";
import type { PricesResponse, TrendPoint, TrendRow, TrendsResponse } from "./types";

type HistoryItem = {
  countryCode?: string;
  krw?: number;
};

type HistorySnapshot = {
  date: string;
  prices: HistoryItem[];
};

type HistoryPayload = {
  snapshots: HistorySnapshot[];
};

const historyBySlug: Record<string, HistoryPayload> = {
  "youtube-premium": youtubePremiumHistory as HistoryPayload,
};

function getHistorySnapshots(serviceSlug: string): HistorySnapshot[] {
  const payload = historyBySlug[serviceSlug];
  if (!payload || !Array.isArray(payload.snapshots)) return [];

  return payload.snapshots
    .filter(
      (snapshot) =>
        snapshot &&
        typeof snapshot.date === "string" &&
        Array.isArray(snapshot.prices)
    )
    .sort((a, b) => a.date.localeCompare(b.date));
}

function buildRows(priceData: PricesResponse): TrendRow[] {
  const baseCountry = priceData.prices.find(
    (country) => country.countryCode === priceData.baseCountry
  );
  const baseKrw = getNumber(baseCountry?.converted?.individual?.krw);

  return priceData.prices.map((country) => {
    const currentKrw = getNumber(country.converted?.individual?.krw);
    const savingsPercent =
      baseKrw && currentKrw != null && baseKrw > 0
        ? Math.round(((baseKrw - currentKrw) / baseKrw) * 100)
        : 0;

    return {
      country: typeof country.country === "string" ? country.country : country.countryCode,
      countryCode: country.countryCode,
      continent: country.continent,
      currency: country.currency,
      localMonthly: getNumber(country.plans?.individual?.monthly) ?? undefined,
      usd: getNumber(country.converted?.individual?.usd) ?? undefined,
      krw: currentKrw ?? undefined,
      savingsPercent,
    };
  });
}

function getPreviousSnapshot(
  snapshots: HistorySnapshot[],
  currentDate: string | undefined
): HistorySnapshot | null {
  if (snapshots.length === 0) return null;
  if (!currentDate) return snapshots[snapshots.length - 1];

  const sameDateIndex = snapshots.findIndex((snapshot) => snapshot.date === currentDate);
  if (sameDateIndex > 0) return snapshots[sameDateIndex - 1];
  if (sameDateIndex === 0) return null;
  return snapshots[snapshots.length - 1];
}

function buildCountryChanges(
  rows: TrendRow[],
  snapshots: HistorySnapshot[],
  currentDate: string | null
): Record<string, TrendPoint[]> {
  const timelineByCountry: Record<string, TrendPoint[]> = Object.create(null);

  for (const snapshot of snapshots) {
    for (const item of snapshot.prices) {
      const countryCode =
        typeof item.countryCode === "string" ? item.countryCode.toUpperCase() : "";
      const krw = getNumber(item.krw);
      if (!countryCode || krw == null) continue;

      if (!timelineByCountry[countryCode]) {
        timelineByCountry[countryCode] = [];
      }

      timelineByCountry[countryCode].push({ date: snapshot.date, krw });
    }
  }

  for (const row of rows) {
    const code = row.countryCode.toUpperCase();
    const krw = getNumber(row.krw);
    if (!code || krw == null) continue;

    if (!timelineByCountry[code]) {
      timelineByCountry[code] = [];
    }

    const series = timelineByCountry[code];
    const hasCurrentDate = Boolean(currentDate) && series.some((item) => item.date === currentDate);

    if (currentDate && !hasCurrentDate) {
      series.push({ date: currentDate, krw });
    }

    series.sort((a, b) => a.date.localeCompare(b.date));
    timelineByCountry[code] = series.slice(-6);
  }

  return timelineByCountry;
}

export async function fetchTrends(serviceSlug: string): Promise<TrendsResponse> {
  ensureValidSlug(serviceSlug);

  const priceData = await fetchPrices(serviceSlug);
  if (!priceData.prices?.length) {
    throw new Error("트렌드 데이터를 찾을 수 없습니다.");
  }

  const rows = buildRows(priceData);
  const snapshots = getHistorySnapshots(serviceSlug);
  const previousSnapshot = getPreviousSnapshot(snapshots, priceData.lastUpdated);
  const previousMap = new Map<string, number>();

  if (previousSnapshot?.prices) {
    for (const item of previousSnapshot.prices) {
      const countryCode =
        typeof item.countryCode === "string" ? item.countryCode.toUpperCase() : "";
      const krw = getNumber(item.krw);
      if (!countryCode || krw == null) continue;
      previousMap.set(countryCode, krw);
    }
  }

  const cheapest = rows
    .filter((row) => row.krw != null)
    .sort((a, b) => (a.krw ?? Infinity) - (b.krw ?? Infinity))
    .slice(0, 10);

  const highestSavings = rows
    .filter((row) => row.krw != null && (row.savingsPercent ?? 0) > 0)
    .sort((a, b) => (b.savingsPercent ?? 0) - (a.savingsPercent ?? 0))
    .slice(0, 10);

  const biggestDrops = rows
    .map((row): TrendRow | null => {
      const previousKrw = previousMap.get(row.countryCode.toUpperCase());
      const currentKrw = getNumber(row.krw);
      if (previousKrw == null || currentKrw == null) return null;

      const changeKrw = currentKrw - previousKrw;
      const changePercent =
        previousKrw > 0 ? Math.round((changeKrw / previousKrw) * 1000) / 10 : 0;

      return {
        country: row.country,
        countryCode: row.countryCode,
        previousDate: previousSnapshot?.date || null,
        previousKrw,
        currentKrw,
        changeKrw,
        changePercent,
      };
    })
    .filter((row): row is TrendRow => row !== null)
    .sort((a, b) => (a.changeKrw ?? 0) - (b.changeKrw ?? 0))
    .slice(0, 10);

  const countryChanges = buildCountryChanges(rows, snapshots, priceData.lastUpdated || null);

  return {
    serviceSlug,
    asOf: priceData.lastUpdated || null,
    exchangeRateDate: priceData.exchangeRateDate || null,
    previousSnapshotDate: previousSnapshot?.date || null,
    cheapest,
    highestSavings,
    biggestDrops,
    countryChanges,
  };
}
