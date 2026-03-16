import youtubePremiumHistory from "../../../data/history/youtube-premium.json";
import { ensureValidSlug } from "./helpers";
import { fetchPrices } from "./prices";
import { buildTrendSummary, type HistorySnapshot } from "./trendCalculations";
import type { TrendsResponse } from "./types";

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
        Array.isArray(snapshot.prices),
    )
    .sort((a, b) => a.date.localeCompare(b.date));
}

export async function fetchTrends(serviceSlug: string): Promise<TrendsResponse> {
  ensureValidSlug(serviceSlug);

  const priceData = await fetchPrices(serviceSlug);
  if (!priceData.prices?.length) {
    throw new Error("트렌드 데이터를 찾을 수 없습니다.");
  }

  const snapshots = getHistorySnapshots(serviceSlug);
  return {
    serviceSlug,
    ...buildTrendSummary(priceData, snapshots),
  };
}
