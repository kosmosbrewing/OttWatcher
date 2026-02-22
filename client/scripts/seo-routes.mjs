import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const SITE_URL = "https://ott.shakilabs.com";
export const SERVICE_SLUG = "youtube-premium";

const PRICE_DATA_PATH = path.resolve(
  __dirname,
  "../../data/prices/youtube-premium.json"
);

export function loadPriceSeed() {
  const raw = fs.readFileSync(PRICE_DATA_PATH, "utf-8");
  return JSON.parse(raw);
}

export function getCountryEntries() {
  const seed = loadPriceSeed();
  const prices = Array.isArray(seed?.prices) ? seed.prices : [];

  return prices
    .map((row) => {
      const countryCode = String(row?.countryCode || "").toLowerCase();
      const country = String(row?.country || "").trim();
      // KRW 국가는 환율 변환 없이 원본 가격 사용 (USD→KRW 재변환 오차 방지)
      const isKrw = String(row?.currency || "").toUpperCase() === "KRW";
      const krw = isKrw
        ? Number(row?.plans?.individual?.monthly)
        : Number(row?.converted?.individual?.krw);
      if (!countryCode || !country) return null;
      return {
        countryCode,
        country,
        krw: Number.isFinite(krw) ? Math.round(krw) : null,
      };
    })
    .filter(Boolean);
}

export function getStaticRoutes() {
  return [
    "/",
    "/about",
    "/privacy",
    "/community",
    `/${SERVICE_SLUG}`,
    `/${SERVICE_SLUG}/trends`,
  ];
}

export function getCountryRoutes() {
  return getCountryEntries().map((entry) => `/${SERVICE_SLUG}/${entry.countryCode}`);
}

export function getAllPrerenderRoutes() {
  return [...getStaticRoutes(), ...getCountryRoutes()];
}
