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
  krwRate?: number;
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
