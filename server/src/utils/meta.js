const fs = require("fs");
const path = require("path");

const DATA_DIR = path.join(__dirname, "../../../data");
const HOST_PATTERN = /^(?!-)[a-z0-9.-]+(?<!-)(?::\d+)?$/i;
const LOCAL_HOST_PATTERN = /^(localhost|127\.0\.0\.1)(:\d+)?$/i;

function normalizeSiteUrl(urlString) {
  if (!urlString || typeof urlString !== "string") return null;
  try {
    const url = new URL(urlString);
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

const DEFAULT_SITE_URL = normalizeSiteUrl(process.env.SITE_URL) || "https://shakilabs.com";

function isValidHost(host) {
  return typeof host === "string" && HOST_PATTERN.test(host.trim());
}

function getProtocolFromReq(req, host = "") {
  const forwardedProto = req?.headers?.["x-forwarded-proto"];
  if (typeof forwardedProto === "string" && forwardedProto.trim()) {
    return forwardedProto.split(",")[0].trim();
  }

  if (req?.protocol) return req.protocol;
  if (LOCAL_HOST_PATTERN.test(host)) return "http";
  return "https";
}

function resolveSiteUrl(req) {
  const queryHost = typeof req?.query?.host === "string" ? req.query.host.trim() : "";
  const queryProto = typeof req?.query?.proto === "string" ? req.query.proto.trim().toLowerCase() : "";

  if (isValidHost(queryHost)) {
    const protocol =
      queryProto === "http" || queryProto === "https"
        ? queryProto
        : getProtocolFromReq(req, queryHost);
    return `${protocol}://${queryHost.toLowerCase()}`;
  }

  const forwardedHost = typeof req?.headers?.["x-forwarded-host"] === "string"
    ? req.headers["x-forwarded-host"].split(",")[0].trim()
    : "";
  if (isValidHost(forwardedHost)) {
    return `${getProtocolFromReq(req, forwardedHost)}://${forwardedHost.toLowerCase()}`;
  }

  const hostHeader = typeof req?.headers?.host === "string" ? req.headers.host.trim() : "";
  if (isValidHost(hostHeader)) {
    return `${getProtocolFromReq(req, hostHeader)}://${hostHeader.toLowerCase()}`;
  }

  return DEFAULT_SITE_URL;
}

// 데이터 로드 헬퍼 (캐싱)
let servicesCache = null;
let pricesCache = {};

function loadServices() {
  if (servicesCache) return servicesCache;
  const filePath = path.join(DATA_DIR, "services.json");
  if (!fs.existsSync(filePath)) return { services: [] };
  servicesCache = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  return servicesCache;
}

function loadPrices(slug) {
  if (pricesCache[slug]) return pricesCache[slug];
  const filePath = path.join(DATA_DIR, "prices", `${slug}.json`);
  if (!fs.existsSync(filePath)) return null;
  pricesCache[slug] = JSON.parse(fs.readFileSync(filePath, "utf-8"));
  return pricesCache[slug];
}

// 숫자 포맷
function formatNumber(num) {
  if (num == null) return "";
  return num.toLocaleString("ko-KR");
}

// 절약률 계산
function calcSavings(price, basePrice) {
  if (!price || !basePrice || basePrice === 0) return 0;
  return Math.round(((basePrice - price) / basePrice) * 100);
}

// 메인 페이지 메타
function getHomeMeta(siteUrl = DEFAULT_SITE_URL) {
  return {
    title: "OTT 가격 비교 | 국가별 구독 요금 한눈에",
    description: "유튜브 프리미엄, 넷플릭스 등 OTT 서비스의 국가별 구독 요금을 비교하세요. 가장 저렴한 나라를 찾아드립니다.",
    url: siteUrl,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "OTT Price Compare",
      url: siteUrl,
      description: "전 세계 OTT 구독 서비스 국가별 가격 비교 사이트",
      potentialAction: {
        "@type": "SearchAction",
        target: `${siteUrl}/{service_slug}`,
        "query-input": "required name=service_slug",
      },
    },
  };
}

// 서비스 가격표 페이지 메타
function getServiceMeta(serviceSlug, siteUrl = DEFAULT_SITE_URL) {
  const { services } = loadServices();
  const service = services.find((s) => s.slug === serviceSlug);
  if (!service) return null;

  const prices = loadPrices(serviceSlug);
  if (!prices) return null;

  // 가장 저렴한 국가 찾기
  const sorted = [...prices.prices].sort(
    (a, b) => (a.converted?.individual?.krw ?? Infinity) - (b.converted?.individual?.krw ?? Infinity)
  );
  const cheapest = sorted[0];
  const cheapestKrw = cheapest?.converted?.individual?.krw;

  const title = `${service.name} 국가별 가격 비교 | 가장 싼 나라는?`;
  const description = cheapest
    ? `${service.name} 가격 ${prices.prices.length}개국 비교. 가장 저렴한 나라는 ${cheapest.country}(월 ₩${formatNumber(Math.round(cheapestKrw))}). 한국 대비 최대 절약 가능.`
    : `${service.name} 국가별 구독 요금 비교. 개인/가족/학생 요금제별 가격을 확인하세요.`;

  // FAQ JSON-LD: SEO 검색결과에 FAQ 노출
  const baseCountry = prices.prices.find((p) => p.countryCode === prices.baseCountry);
  const baseKrw = baseCountry?.converted?.individual?.krw;

  const faqItems = [];

  if (cheapest) {
    faqItems.push({
      "@type": "Question",
      name: `${service.name} 가장 저렴한 나라는?`,
      acceptedAnswer: {
        "@type": "Answer",
        text: `${cheapest.country}이 월 ₩${formatNumber(Math.round(cheapestKrw))}으로 가장 저렴합니다.`,
      },
    });
  }

  if (baseKrw && cheapestKrw) {
    const savings = calcSavings(cheapestKrw, baseKrw);
    faqItems.push({
      "@type": "Question",
      name: `${service.name} 한국 대비 최대 절약률은?`,
      acceptedAnswer: {
        "@type": "Answer",
        text: `${cheapest.country} 기준 한국(₩${formatNumber(Math.round(baseKrw))}) 대비 ${savings}% 저렴합니다.`,
      },
    });
  }

  faqItems.push({
    "@type": "Question",
    name: `${service.name} 가격은 몇 개국을 비교할 수 있나요?`,
    acceptedAnswer: {
      "@type": "Answer",
      text: `현재 ${prices.prices.length}개국의 ${service.name} 가격을 비교할 수 있습니다.`,
    },
  });

  return {
    title,
    description,
    url: `${siteUrl}/${serviceSlug}`,
    jsonLd: {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqItems,
    },
  };
}

// 국가 상세 페이지 메타
function getCountryMeta(serviceSlug, countryCode, siteUrl = DEFAULT_SITE_URL) {
  const { services } = loadServices();
  const service = services.find((s) => s.slug === serviceSlug);
  if (!service) return null;

  const prices = loadPrices(serviceSlug);
  if (!prices) return null;

  const country = prices.prices.find(
    (p) => p.countryCode === countryCode.toUpperCase()
  );
  if (!country) return null;

  const baseCountry = prices.prices.find((p) => p.countryCode === prices.baseCountry);
  const krw = country.converted?.individual?.krw;
  const baseKrw = baseCountry?.converted?.individual?.krw;
  const savings = calcSavings(krw, baseKrw);
  const localPrice = country.plans?.individual?.monthly;

  let title, description;
  if (savings > 0) {
    title = `${service.name} ${country.country} 가격 | 월 ₩${formatNumber(Math.round(krw))} — ${savings}% 절약`;
    description = `${service.name} ${country.country} 월 ${formatNumber(localPrice)} ${country.currency}(₩${formatNumber(Math.round(krw))}). 한국 대비 ${savings}% 절약. 개인/가족/학생 요금제별 상세 비교.`;
  } else {
    title = `${service.name} ${country.country} 가격 | 월 ₩${formatNumber(Math.round(krw))}`;
    description = `${service.name} ${country.country} 구독 요금 상세 정보. 월 ${formatNumber(localPrice)} ${country.currency}. 개인/가족/학생 요금제별 가격 비교.`;
  }

  // Product JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `${service.name} ${country.country}`,
    description: `${service.name} ${country.country} 구독 서비스`,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: country.currency,
      lowPrice: Math.min(
        ...(service.plans.map((p) => country.plans?.[p.id]?.monthly).filter(Boolean))
      ),
      highPrice: Math.max(
        ...(service.plans.map((p) => country.plans?.[p.id]?.monthly).filter(Boolean))
      ),
      offerCount: service.plans.length,
    },
  };

  return {
    title,
    description,
    url: `${siteUrl}/${serviceSlug}/${countryCode.toLowerCase()}`,
    jsonLd,
  };
}

// 서비스 트렌드 페이지 메타
function getTrendsMeta(serviceSlug, siteUrl = DEFAULT_SITE_URL) {
  const { services } = loadServices();
  const service = services.find((s) => s.slug === serviceSlug);
  if (!service) return null;

  const prices = loadPrices(serviceSlug);
  const count = prices?.prices?.length || 0;

  return {
    title: `${service.name} 가격 트렌드 | 최근 변동 TOP`,
    description: `${service.name} 최근 가격 하락 국가와 한국 대비 절약률 상위 국가를 확인하세요. ${count}개국 기준 데이터입니다.`,
    url: `${siteUrl}/${serviceSlug}/trends`,
  };
}

// 정적 페이지 메타
function getStaticMeta(pageName, siteUrl = DEFAULT_SITE_URL) {
  const pages = {
    about: {
      title: "소개 | OTT 가격 비교",
      description: "OTT Price Compare 서비스 소개. 전 세계 OTT 구독 서비스의 국가별 가격을 비교하는 사이트입니다.",
      url: `${siteUrl}/about`,
    },
    privacy: {
      title: "개인정보처리방침 | OTT 가격 비교",
      description: "OTT Price Compare 개인정보처리방침. Google AdSense 광고 및 쿠키 사용에 대한 안내.",
      url: `${siteUrl}/privacy`,
    },
    report: {
      title: "가격 제보 | OTT 가격 비교",
      description: "OTT 구독 서비스 국가별 가격 정보를 제보하고 최신 데이터 반영에 참여하세요.",
      url: `${siteUrl}/report`,
    },
    changelog: {
      title: "반영 로그 | OTT 가격 비교",
      description: "가격 제보 반영 내역과 최근 데이터 업데이트 이력을 확인하세요.",
      url: `${siteUrl}/changelog`,
    },
  };
  return pages[pageName] || null;
}

module.exports = {
  getHomeMeta,
  getServiceMeta,
  getCountryMeta,
  getTrendsMeta,
  getStaticMeta,
  loadServices,
  loadPrices,
  resolveSiteUrl,
  DEFAULT_SITE_URL,
};
