import axios, { type AxiosError } from "axios";

type ApiErrorPayload = {
  error?: string;
  message?: string;
};

type JsonRecord = Record<string, unknown>;

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

// API 클라이언트 (샤키샤키 패턴 재활용)
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  headers: { "Content-Type": "application/json" },
});

// 응답 인터셉터: data 자동 추출
apiClient.interceptors.response.use(
  (response) => response.data,
  (error: AxiosError<ApiErrorPayload>) => {
    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      "요청 처리 중 오류가 발생했습니다.";
    return Promise.reject(new Error(message));
  }
);

// 서비스 목록 조회
export function fetchServices(): Promise<ServicesResponse> {
  return apiClient.get("/services") as Promise<ServicesResponse>;
}

// 서비스별 가격 데이터 조회
export function fetchPrices(serviceSlug: string): Promise<PricesResponse> {
  return apiClient.get(`/prices/${serviceSlug}`) as Promise<PricesResponse>;
}

// 서비스 트렌드 조회
export function fetchTrends(serviceSlug: string): Promise<TrendsResponse> {
  return apiClient.get(`/trends/${serviceSlug}`) as Promise<TrendsResponse>;
}

// 가격 하락 알림 신청
export function subscribePriceAlert(payload: JsonRecord): Promise<JsonRecord> {
  return apiClient.post("/alerts", payload) as Promise<JsonRecord>;
}

// 익명 커뮤니티 글 목록 조회
export function fetchCommunityPosts(
  serviceSlug: string,
  countryCode = "ALL",
  limit = 30
): Promise<CommunityPostsResponse> {
  return apiClient.get("/community", {
    params: { serviceSlug, countryCode, limit },
  }) as Promise<CommunityPostsResponse>;
}

// 익명 커뮤니티 글 등록
export function submitCommunityPost(payload: JsonRecord): Promise<JsonRecord> {
  return apiClient.post("/community", payload) as Promise<JsonRecord>;
}

export default apiClient;
