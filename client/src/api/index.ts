import servicesSeed from "../../../data/services.json";
import youtubePremiumHistory from "../../../data/history/youtube-premium.json";

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
  krwRate?: number; // 원/달러 환율 (KRW per USD)
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
  id: string;
  serviceSlug?: string;
  countryCode?: string;
  nickname?: string;
  content?: string;
  createdAt?: string;
  commentCount?: number;
  [key: string]: unknown;
}

export interface CommunityPostResponse {
  post: CommunityPost;
  [key: string]: unknown;
}

export interface CommunityPostsResponse {
  posts: CommunityPost[];
  [key: string]: unknown;
}

export interface CommunityComment {
  id: string;
  postId?: string;
  nickname?: string;
  content?: string;
  createdAt?: string;
  [key: string]: unknown;
}

export interface CommentsResponse {
  comments: CommunityComment[];
  [key: string]: unknown;
}

export interface CommunityThreadResponse {
  post: CommunityPost;
  comments: CommunityComment[];
  hasMore: boolean;
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
const POST_ID_PATTERN = /^com_[a-z0-9]+$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ALERT_STORAGE_KEY = "ottwatcher:alerts:v1";
const API_BASE = (
  import.meta.env.VITE_OTTWATCHER_API_BASE || "/api/ottwatcher"
).replace(/\/+$/, "");
const COMMUNITY_API_TIMEOUT_MS = 10_000;

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

function ensureValidPostId(postId: string): void {
  if (!POST_ID_PATTERN.test(postId)) {
    throw new Error("유효하지 않은 게시글 ID입니다.");
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

function normalizeCommunityPosts(value: unknown): CommunityPost[] {
  if (!isRecord(value) || !Array.isArray(value.posts)) {
    return [];
  }

  return value.posts
    .filter(isRecord)
    .map((post) => ({
      id: typeof post.id === "string" || typeof post.id === "number" ? post.id : "",
      nickname: typeof post.nickname === "string" ? post.nickname : "익명 유저",
      content: typeof post.content === "string" ? post.content : "",
      createdAt: typeof post.createdAt === "string" ? post.createdAt : "",
      serviceSlug: typeof post.serviceSlug === "string" ? post.serviceSlug : undefined,
      countryCode: typeof post.countryCode === "string" ? post.countryCode : undefined,
      commentCount:
        typeof post.commentCount === "number" && Number.isFinite(post.commentCount)
          ? Math.max(0, Math.floor(post.commentCount))
          : typeof post.comment_count === "number" && Number.isFinite(post.comment_count)
            ? Math.max(0, Math.floor(post.comment_count))
            : 0,
    }))
    .filter((post) => post.id && post.content && post.createdAt)
    .map((post) => ({
      ...post,
      id: String(post.id),
    }));
}

function normalizeCommunityPost(value: unknown): CommunityPost | null {
  if (!isRecord(value) || !isRecord(value.post)) return null;
  const post = value.post;

  const normalizedId =
    typeof post.id === "string" || typeof post.id === "number" ? String(post.id) : "";
  const createdAt = typeof post.createdAt === "string" ? post.createdAt : "";
  const content = typeof post.content === "string" ? post.content : "";
  if (!normalizedId || !createdAt || !content) return null;

  return {
    id: normalizedId,
    nickname: typeof post.nickname === "string" ? post.nickname : "익명 유저",
    content,
    createdAt,
    serviceSlug: typeof post.serviceSlug === "string" ? post.serviceSlug : undefined,
    countryCode: typeof post.countryCode === "string" ? post.countryCode : undefined,
  };
}

function normalizeCommunityComments(value: unknown): CommunityComment[] {
  if (!isRecord(value) || !Array.isArray(value.comments)) {
    return [];
  }

  return value.comments
    .filter(isRecord)
    .map((comment) => ({
      id:
        typeof comment.id === "string" || typeof comment.id === "number"
          ? String(comment.id)
          : "",
      postId:
        typeof comment.postId === "string" || typeof comment.post_id === "string"
          ? String(comment.postId || comment.post_id)
          : undefined,
      nickname: typeof comment.nickname === "string" ? comment.nickname : "익명 유저",
      content: typeof comment.content === "string" ? comment.content : "",
      createdAt: typeof comment.createdAt === "string" ? comment.createdAt : "",
    }))
    .filter((comment) => comment.id && comment.content && comment.createdAt);
}

function normalizeCommunityThread(value: unknown): CommunityThreadResponse {
  const post = normalizeCommunityPost(value);
  const comments = normalizeCommunityComments(value);
  const hasMore = isRecord(value) && typeof value.hasMore === "boolean" ? value.hasMore : false;

  if (!post) {
    throw new Error("게시글 정보를 불러오지 못했습니다.");
  }

  return {
    post,
    comments,
    hasMore,
  };
}

function extractApiErrorMessage(payload: unknown): string | null {
  if (!isRecord(payload)) return null;
  if (typeof payload.error === "string" && payload.error.trim()) return payload.error;
  if (typeof payload.message === "string" && payload.message.trim()) return payload.message;
  return null;
}

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

async function requestCommunityApi<T>(
  path: string,
  init: RequestInit
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), COMMUNITY_API_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE}/community${path}`, {
      ...init,
      headers,
      credentials: "include",
      signal: controller.signal,
    });

    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      throw new Error(
        extractApiErrorMessage(payload) || "커뮤니티 요청 처리 중 오류가 발생했습니다."
      );
    }

    return payload as T;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("요청 시간이 초과되었습니다.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function fetchServices(): Promise<ServicesResponse> {
  return clone(servicesSeed as ServicesResponse);
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
    message: "가격 하락 알림 신청이 완료되었습니다.",
  };
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

  const query = new URLSearchParams({
    serviceSlug,
    countryCode: normalizedCountryCode,
    limit: String(normalizedLimit),
  });

  return requestCommunityApi<CommunityPostsResponse>(`?${query.toString()}`, {
    method: "GET",
    cache:
      options?.skipCache || options?.forceRefresh ? "no-store" : "default",
  }).then((payload) => ({ posts: normalizeCommunityPosts(payload) }));
}

export async function fetchCommunityPost(postId: string): Promise<CommunityPostResponse> {
  ensureValidPostId(postId);

  const payload = await requestCommunityApi<CommunityPostResponse>(`/${postId}`, {
    method: "GET",
    cache: "no-store",
  });

  const normalizedPost = normalizeCommunityPost(payload);
  if (!normalizedPost) {
    throw new Error("게시글 정보를 불러오지 못했습니다.");
  }

  return { post: normalizedPost };
}

export async function fetchPostComments(
  postId: string,
  limit = 100,
  options?: {
    skipCache?: boolean;
    forceRefresh?: boolean;
    sort?: "asc" | "desc";
    offset?: number;
  }
): Promise<CommentsResponse> {
  ensureValidPostId(postId);

  const normalizedLimit = Number.isFinite(limit)
    ? Math.min(100, Math.max(1, Math.floor(limit)))
    : 100;

  const query = new URLSearchParams({
    limit: String(normalizedLimit),
    sort: options?.sort === "desc" ? "desc" : "asc",
  });
  if (typeof options?.offset === "number" && Number.isFinite(options.offset) && options.offset > 0) {
    query.set("offset", String(Math.floor(options.offset)));
  }

  const payload = await requestCommunityApi<CommentsResponse>(
    `/${postId}/comments?${query.toString()}`,
    {
      method: "GET",
      cache:
        options?.skipCache || options?.forceRefresh ? "no-store" : "default",
    }
  );

  return { comments: normalizeCommunityComments(payload) };
}

export async function fetchCommunityThread(
  postId: string,
  options?: {
    limit?: number;
    skipCache?: boolean;
    forceRefresh?: boolean;
    sort?: "asc" | "desc";
  }
): Promise<CommunityThreadResponse> {
  ensureValidPostId(postId);

  const requestedLimit =
    typeof options?.limit === "number" && Number.isFinite(options.limit)
      ? options.limit
      : 30;
  const normalizedLimit = Math.min(100, Math.max(1, Math.floor(requestedLimit)));

  const query = new URLSearchParams({
    limit: String(normalizedLimit),
    sort: options?.sort === "desc" ? "desc" : "asc",
  });

  const payload = await requestCommunityApi<CommunityThreadResponse>(
    `/${postId}/thread?${query.toString()}`,
    {
      method: "GET",
      cache:
        options?.skipCache || options?.forceRefresh ? "no-store" : "default",
    }
  );

  return normalizeCommunityThread(payload);
}

export async function submitComment(postId: string, content: string): Promise<CommunityComment> {
  ensureValidPostId(postId);

  const trimmed = content.trim();
  if (trimmed.length < 2 || trimmed.length > 300) {
    throw new Error("입력값이 올바르지 않습니다.");
  }

  const payload = await requestCommunityApi<JsonRecord>(`/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify({
      content: trimmed,
    }),
  });

  const normalized = normalizeCommunityComments({
    comments: [payload],
  })[0];

  if (!normalized) {
    throw new Error("댓글 정보를 처리하지 못했습니다.");
  }

  return normalized;
}

export async function submitCommunityPost(payload: JsonRecord): Promise<JsonRecord> {
  const serviceSlug = typeof payload.serviceSlug === "string" ? payload.serviceSlug : "";
  const rawCountryCode = typeof payload.countryCode === "string" ? payload.countryCode : "ALL";
  const content = typeof payload.content === "string" ? payload.content.trim() : "";

  ensureValidSlug(serviceSlug);

  if (content.length < 2 || content.length > 300) {
    throw new Error("입력값이 올바르지 않습니다.");
  }

  const countryCode = normalizeCountryCode(rawCountryCode);
  return requestCommunityApi<JsonRecord>("", {
    method: "POST",
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
  fetchCommunityPost,
  fetchCommunityThread,
  fetchPostComments,
  submitCommunityPost,
  submitComment,
};

export default api;
