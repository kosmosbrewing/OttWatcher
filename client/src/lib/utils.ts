import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// 숫자 포맷: 1000 → "1,000"
export function formatNumber(num: number | null | undefined): string {
  if (num == null) return "-";
  return num.toLocaleString("ko-KR");
}

// 통화 포맷: (14900, "KRW") → "₩14,900"
export function formatCurrency(amount: number | null | undefined, currency: string): string {
  if (amount == null) return "-";
  return new Intl.NumberFormat("ko-KR", {
    style: "currency",
    currency,
    maximumFractionDigits: currency === "KRW" ? 0 : 2,
  }).format(amount);
}

// 절약률 계산: (3130, 14900) → 79.0  (소수점 1자리)
export function calcSavingsPercent(
  price: number | null | undefined,
  basePrice: number | null | undefined
): number {
  if (!price || !basePrice || basePrice === 0) return 0;
  return Math.round(((basePrice - price) / basePrice) * 1000) / 10;
}

// 국가 코드 → 국기 이모지: "KR" → 🇰🇷
export function countryFlag(code: string | null | undefined): string {
  if (!code || code.length !== 2) return "";
  return String.fromCodePoint(
    ...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  );
}
