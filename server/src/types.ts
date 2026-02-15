export type JsonRecord = Record<string, unknown>;

export interface ServicePlan {
  id: string;
  name: string;
  nameEn?: string;
  [key: string]: unknown;
}

export interface ServiceInfo {
  id?: string;
  name: string;
  slug: string;
  active?: boolean;
  color?: string;
  plans?: ServicePlan[];
  [key: string]: unknown;
}

export interface ServicesPayload {
  services: ServiceInfo[];
}

export interface PlanPrice {
  monthly?: number;
  yearly?: number;
  [key: string]: number | undefined;
}

export interface ConvertedPrice {
  krw?: number;
  usd?: number;
  [key: string]: number | undefined;
}

export interface CountryPrice {
  countryCode: string;
  country: string;
  continent?: string;
  currency?: string;
  plans?: Record<string, PlanPrice | undefined>;
  converted?: Record<string, ConvertedPrice | undefined>;
  [key: string]: unknown;
}

export interface PricesPayload {
  prices: CountryPrice[];
  baseCountry?: string;
  lastUpdated?: string;
  exchangeRateDate?: string;
  [key: string]: unknown;
}

export interface HistoryItem {
  countryCode?: string;
  krw?: number;
}

export interface HistorySnapshot {
  date: string;
  prices: HistoryItem[];
}

export interface HistoryPayload {
  snapshots: HistorySnapshot[];
}
