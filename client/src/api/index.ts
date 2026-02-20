import servicesSeed from "../../../data/services.json";
import youtubePremiumPrices from "../../../data/prices/youtube-premium.json";
import youtubePremiumHistory from "../../../data/history/youtube-premium.json";
import { apiRequest } from "@/lib/api";

export type JsonRecord = Record<string, unknown>;

export interface ServicePlan {
  id: string;
  name: string;
  nameEn?: string;
  [key: string]: unknown;
}

export interface ServiceInfo {
  id: string;
  name: string;
  slug: string;
  active?: boolean;
  color?: string;
  plans?: ServicePlan[];
  [key: string]: unknown;
}

export interface ServicesResponse {
  services: ServiceInfo[];
}

export interface CountryPlanPrice {
  monthly?: number;
  yearly?: number;
  [key: string]: number | undefined;
}

export interface ConvertedAmount {
  krw?: number;
  usd?: number;
  [key: string]: number | undefined;
}

export interface CountryPrice {
  countryCode: string;
  country?: string;
  continent?: string;
  currency?: string;
  plans?: Record<string, CountryPlanPrice | undefined>;
  converted?: Record<string, ConvertedAmount | undefined>;
  [key: string]: unknown;
}

export interface PricesResponse {
  prices: CountryPrice[];
  baseCountry?: string;
  lastUpdated?: string;
  exchangeRateDate?: string;
  [key: string]: unknown;
}

export interface TrendPoint {
  date: string;
  krw: number;
  [key: string]: unknown;
}

export interface TrendRow {
  countryCode: string;
  country: string;
  previousKrw?: number;
  currentKrw?: number;
  changeKrw?: number;
  changePercent?: number;
  savingsPercent?: number;
  krw?: number;
  localMonthly?: number;
  currency?: string;
  [key: string]: unknown;
}

export interface TrendsResponse {
  asOf?: string;
  previousSnapshotDate?: string;
  cheapest?: TrendRow[];
  highestSavings?: TrendRow[];
  biggestDrops?: TrendRow[];
  countryChanges?: Record<string, TrendPoint[]>;
  [key: string]: unknown;
}

export interface CommunityPost {
  id: number | string;
  nickname?: string;
  content?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface CommunityPostsResponse {
  posts: CommunityPost[];
  [key: string]: unknown;
}

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

type AlertSubscription = {
  id: string;
  createdAt: string;
  status: "active";
  serviceSlug: string;
  countryCode: string;
  planId: string;
  targetPriceKrw: number;
  email: string;
};

const SLUG_PATTERN = /^[a-z0-9-]+$/;
const COUNTRY_CODE_PATTERN = /^[A-Za-z]{2}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ALERT_STORAGE_KEY = "ottwatcher:alerts:v1";

const pricesBySlug: Record<string, PricesResponse> = {
  "youtube-premium": youtubePremiumPrices as PricesResponse,
};

const historyBySlug: Record<string, HistoryPayload> = {
  "youtube-premium": youtubePremiumHistory as HistoryPayload,
};

let memoryAlerts: AlertSubscription[] = [];

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

function getNumber(value: unknown): number | null {
  return typeof value === "number" && !Number.isNaN(value) ? value : null;
}

function ensureValidSlug(serviceSlug: string): void {
  if (!SLUG_PATTERN.test(serviceSlug)) {
    throw new Error("유효하지 않은 서비스 슬러그입니다.");
  }
}

function normalizeCountryCode(value: string): string {
  const normalized = value.toUpperCase();
  if (normalized === "ALL") return normalized;
  if (!COUNTRY_CODE_PATTERN.test(normalized)) {
    throw new Error("입력값이 올바르지 않습니다.");
  }
  return normalized;
}

function readStoredAlerts(): AlertSubscription[] {
  if (!isBrowser()) return clone(memoryAlerts);

  try {
    const raw = window.localStorage.getItem(ALERT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(isRecord).map((alert) => ({
      id: typeof alert.id === "string" ? alert.id : "",
      createdAt: typeof alert.createdAt === "string" ? alert.createdAt : "",
      status: "active",
      serviceSlug: typeof alert.serviceSlug === "string" ? alert.serviceSlug : "",
      countryCode:
        typeof alert.countryCode === "string"
          ? alert.countryCode.toUpperCase()
          : "",
      planId: typeof alert.planId === "string" ? alert.planId : "",
      targetPriceKrw:
        typeof alert.targetPriceKrw === "number" ? alert.targetPriceKrw : 0,
      email: typeof alert.email === "string" ? alert.email.toLowerCase() : "",
    }));
  } catch {
    return [];
  }
}

function writeStoredAlerts(alerts: AlertSubscription[]): void {
  if (!isBrowser()) {
    memoryAlerts = clone(alerts);
    return;
  }

  try {
    window.localStorage.setItem(ALERT_STORAGE_KEY, JSON.stringify(alerts));
  } catch {
    // localStorage 접근 실패 시 무시
  }
}

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

export async function fetchServices(): Promise<ServicesResponse> {
  try {
    const payload = await apiRequest<ServicesResponse>("/services", {
      cachePolicy: "services",
    });
    if (Array.isArray(payload.services) && payload.services.length > 0) {
      return payload;
    }
  } catch {
    // API 실패 시 정적 시드 데이터로 폴백
  }

  return clone(servicesSeed as ServicesResponse);
}

export async function fetchPrices(serviceSlug: string): Promise<PricesResponse> {
  ensureValidSlug(serviceSlug);

  try {
    const payload = await apiRequest<PricesResponse>(`/prices/${serviceSlug}`, {
      cachePolicy: "prices",
    });
    if (Array.isArray(payload.prices) && payload.prices.length > 0) {
      return payload;
    }
  } catch {
    // API 실패 시 정적 시드 데이터로 폴백
  }

  const fallback = pricesBySlug[serviceSlug];
  if (!fallback) throw new Error("해당 서비스의 가격 데이터를 찾을 수 없습니다.");
  return clone(fallback);
}

export async function fetchTrends(serviceSlug: string): Promise<TrendsResponse> {
  ensureValidSlug(serviceSlug);

  try {
    const payload = await apiRequest<TrendsResponse>(`/trends/${serviceSlug}`, {
      cachePolicy: "trends",
    });
    if (payload && Array.isArray(payload.cheapest)) {
      return payload;
    }
  } catch {
    // API 실패 시 클라이언트 계산 방식으로 폴백
  }

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

export async function subscribePriceAlert(payload: JsonRecord): Promise<JsonRecord> {
  const serviceSlug = typeof payload.serviceSlug === "string" ? payload.serviceSlug : "";
  const countryCode = typeof payload.countryCode === "string" ? payload.countryCode : "";
  const planId = typeof payload.planId === "string" ? payload.planId.trim() : "";
  const targetPrice =
    typeof payload.targetPriceKrw === "number"
      ? payload.targetPriceKrw
      : Number(payload.targetPriceKrw);
  const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";

  ensureValidSlug(serviceSlug);

  if (!COUNTRY_CODE_PATTERN.test(countryCode)) {
    throw new Error("입력값이 올바르지 않습니다.");
  }

  if (planId.length < 2 || planId.length > 32) {
    throw new Error("입력값이 올바르지 않습니다.");
  }

  if (!Number.isInteger(targetPrice) || targetPrice <= 0) {
    throw new Error("입력값이 올바르지 않습니다.");
  }

  if (!EMAIL_PATTERN.test(email)) {
    throw new Error("이메일 형식이 올바르지 않습니다.");
  }

  try {
    return await apiRequest<JsonRecord>("/alerts", {
      method: "POST",
      cachePolicy: "noCache",
      body: JSON.stringify({
        serviceSlug,
        countryCode,
        planId,
        targetPriceKrw: targetPrice,
        email,
      }),
    });
  } catch {
    // API 미가용 환경을 위한 로컬 폴백
    const id = `alt_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    const nextRecord: AlertSubscription = {
      id,
      createdAt: new Date().toISOString(),
      status: "active",
      serviceSlug,
      countryCode: countryCode.toUpperCase(),
      planId,
      targetPriceKrw: targetPrice,
      email,
    };

    const stored = readStoredAlerts();
    stored.push(nextRecord);
    writeStoredAlerts(stored);

    return {
      id,
      message: "가격 하락 알림(로컬 폴백) 신청이 완료되었습니다.",
    };
  }
}

export function fetchCommunityPosts(
  serviceSlug: string,
  countryCode = "ALL",
  limit = 30,
  options?: {
    skipCache?: boolean;
    forceRefresh?: boolean;
  }
): Promise<CommunityPostsResponse> {
  ensureValidSlug(serviceSlug);

  const normalizedCountryCode = normalizeCountryCode(countryCode);
  const normalizedLimit = Number.isFinite(limit)
    ? Math.min(100, Math.max(1, Math.floor(limit)))
    : 30;

  const params = new URLSearchParams({
    serviceSlug,
    countryCode: normalizedCountryCode,
    limit: String(normalizedLimit),
  });
  if (options?.forceRefresh) {
    params.set("_ts", String(Date.now()));
  }

  return apiRequest<CommunityPostsResponse>(`/community?${params.toString()}`, {
    cachePolicy: "community",
    skipCache: options?.skipCache,
    cache: options?.skipCache ? "no-store" : undefined,
  });
}

export function submitCommunityPost(payload: JsonRecord): Promise<JsonRecord> {
  const serviceSlug = typeof payload.serviceSlug === "string" ? payload.serviceSlug : "";
  const rawCountryCode = typeof payload.countryCode === "string" ? payload.countryCode : "ALL";
  const content = typeof payload.content === "string" ? payload.content.trim() : "";

  ensureValidSlug(serviceSlug);

  if (content.length < 2 || content.length > 300) {
    throw new Error("입력값이 올바르지 않습니다.");
  }

  const countryCode = normalizeCountryCode(rawCountryCode);

  return apiRequest<JsonRecord>("/community", {
    method: "POST",
    cachePolicy: "noCache",
    body: JSON.stringify({
      serviceSlug,
      countryCode,
      content,
    }),
  });
}

const api = {
  fetchServices,
  fetchPrices,
  fetchTrends,
  subscribePriceAlert,
  fetchCommunityPosts,
  submitCommunityPost,
};

export default api;
