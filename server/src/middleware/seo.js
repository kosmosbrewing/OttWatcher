const {
  getHomeMeta,
  getServiceMeta,
  getCountryMeta,
  getTrendsMeta,
  getStaticMeta,
  loadServices,
  loadPrices,
  resolveSiteUrl,
} = require("../utils/meta");

// 크롤러 User-Agent 패턴
const CRAWLER_PATTERN = /googlebot|bingbot|yandex|baiduspider|duckduckbot|slurp|facebookexternalhit|twitterbot|linkedinbot|whatsapp|telegrambot|kakaotalk|naver|daum/i;

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatNumber(value) {
  if (value == null) return "-";
  return Number(value).toLocaleString("ko-KR");
}

function formatKrw(value) {
  if (value == null) return "-";
  return `₩${formatNumber(Math.round(value))}`;
}

// HTML 템플릿 생성
function buildSeoHtml(meta, contentHtml, { noindex = false } = {}) {
  const jsonLdScript = meta.jsonLd
    ? `<script type="application/ld+json">${JSON.stringify(meta.jsonLd)}</script>`
    : "";
  const robots = noindex ? "noindex,nofollow" : "index,follow";

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="${robots}">
  <title>${escapeHtml(meta.title)}</title>
  <meta name="description" content="${escapeHtml(meta.description)}">
  <link rel="canonical" href="${escapeHtml(meta.url)}">
  <meta property="og:title" content="${escapeHtml(meta.title)}">
  <meta property="og:description" content="${escapeHtml(meta.description)}">
  <meta property="og:url" content="${escapeHtml(meta.url)}">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="ko_KR">
  <meta property="og:site_name" content="OTT Price Compare">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="${escapeHtml(meta.title)}">
  <meta name="twitter:description" content="${escapeHtml(meta.description)}">
  ${jsonLdScript}
  <style>
    body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #fcf8f2; color: #2c221b; line-height: 1.6; }
    main { max-width: 1080px; margin: 0 auto; padding: 24px 16px 48px; }
    h1 { margin: 0 0 12px; font-size: 1.8rem; line-height: 1.25; }
    h2 { margin: 26px 0 10px; font-size: 1.2rem; }
    p { margin: 0 0 12px; }
    a { color: #b95a10; text-decoration: none; }
    a:hover { text-decoration: underline; }
    ul { margin: 0; padding-left: 1.2rem; }
    li { margin: 6px 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 12px; background: #fff; }
    th, td { border: 1px solid #eadfcf; padding: 8px; text-align: left; font-size: 0.95rem; }
    th { background: #f7efe2; }
    .mono { font-variant-numeric: tabular-nums; white-space: nowrap; }
    .notice { margin-top: 20px; color: #625547; font-size: 0.9rem; }
  </style>
</head>
<body>
  <main>
    <h1>${escapeHtml(meta.title)}</h1>
    <p>${escapeHtml(meta.description)}</p>
    ${contentHtml || ""}
  </main>
</body>
</html>`;
}

function renderHomeContent(siteUrl) {
  const { services } = loadServices();
  const activeServices = services.filter((service) => service.active);

  if (activeServices.length === 0) {
    return `<section><h2>서비스 준비 중</h2><p>현재 활성화된 서비스가 없습니다.</p></section>`;
  }

  const serviceItems = activeServices
    .map((service) => {
      const plans = (service.plans || []).map((plan) => plan.name).join(", ");
      return `<li><a href="${escapeHtml(`${siteUrl}/${service.slug}`)}">${escapeHtml(service.name)}</a> · ${escapeHtml(plans)}</li>`;
    })
    .join("");

  return `
    <section>
      <h2>활성 서비스</h2>
      <ul>${serviceItems}</ul>
    </section>
    <p class="notice">국가별 상세 페이지에서 절약률과 요금제별 가격을 확인할 수 있습니다.</p>
  `;
}

function renderServiceContent(serviceSlug, siteUrl) {
  const { services } = loadServices();
  const service = services.find((item) => item.slug === serviceSlug);
  const prices = loadPrices(serviceSlug);

  if (!service || !prices?.prices?.length) return "";

  const rows = [...prices.prices]
    .sort(
      (a, b) =>
        (a.converted?.individual?.krw ?? Infinity) -
        (b.converted?.individual?.krw ?? Infinity)
    )
    .map((country, index) => {
      const code = country.countryCode.toLowerCase();
      const detailUrl = `${siteUrl}/${serviceSlug}/${code}`;
      const localPrice = country.plans?.individual?.monthly;
      const krwPrice = country.converted?.individual?.krw;

      return `
        <tr>
          <td class="mono">${index + 1}</td>
          <td><a href="${escapeHtml(detailUrl)}">${escapeHtml(country.country)}</a></td>
          <td class="mono">${localPrice == null ? "-" : `${formatNumber(localPrice)} ${escapeHtml(country.currency)}`}</td>
          <td class="mono">${formatKrw(krwPrice)}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <section>
      <h2>국가별 개인 요금제 가격</h2>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>국가</th>
            <th>현지 가격</th>
            <th>KRW 환산</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p class="notice">마지막 업데이트: ${escapeHtml(prices.lastUpdated || "-")} · 환율 기준일: ${escapeHtml(prices.exchangeRateDate || "-")}</p>
    </section>
  `;
}

function renderCountryContent(serviceSlug, countryCode, siteUrl) {
  const { services } = loadServices();
  const service = services.find((item) => item.slug === serviceSlug);
  const prices = loadPrices(serviceSlug);
  const country = prices?.prices?.find((item) => item.countryCode === countryCode.toUpperCase());

  if (!service || !country) return "";

  const planRows = (service.plans || [])
    .map((plan) => {
      const local = country.plans?.[plan.id]?.monthly;
      const krw = country.converted?.[plan.id]?.krw;
      const usd = country.converted?.[plan.id]?.usd;

      return `
        <tr>
          <td>${escapeHtml(plan.name)}</td>
          <td class="mono">${local == null ? "-" : `${formatNumber(local)} ${escapeHtml(country.currency)}`}</td>
          <td class="mono">${formatKrw(krw)}</td>
          <td class="mono">${usd == null ? "-" : `$${Number(usd).toFixed(2)}`}</td>
        </tr>
      `;
    })
    .join("");

  const listUrl = `${siteUrl}/${serviceSlug}`;
  return `
    <section>
      <h2>요금제별 가격</h2>
      <table>
        <thead>
          <tr>
            <th>요금제</th>
            <th>현지 가격</th>
            <th>KRW 환산</th>
            <th>USD 환산</th>
          </tr>
        </thead>
        <tbody>${planRows}</tbody>
      </table>
      <p class="notice"><a href="${escapeHtml(listUrl)}">전체 국가 비교 페이지로 이동</a></p>
    </section>
  `;
}

function renderStaticContent(pageName) {
  if (pageName === "about") {
    return `
      <section>
        <h2>서비스 목적</h2>
        <p>OTT Price Compare는 국가별 OTT 구독 요금을 빠르게 비교할 수 있도록 데이터를 정리해 제공하는 서비스입니다.</p>
      </section>
    `;
  }

  if (pageName === "privacy") {
    return `
      <section>
        <h2>개인정보 및 광고 안내</h2>
        <p>본 사이트는 Google AdSense를 사용할 수 있으며, 관련 정책에 따라 쿠키 기반 광고가 제공될 수 있습니다.</p>
      </section>
    `;
  }

  if (pageName === "report") {
    return `
      <section>
        <h2>가격 제보</h2>
        <p>잘못된 가격 정보나 요금제 변경 내용을 제보해 주세요. 검토 후 반영 로그에 공개됩니다.</p>
      </section>
    `;
  }

  if (pageName === "changelog") {
    return `
      <section>
        <h2>반영 로그</h2>
        <p>최근 데이터 업데이트 내역과 제보 반영 결과를 확인할 수 있습니다.</p>
      </section>
    `;
  }

  return "";
}

function renderTrendsContent(serviceSlug, siteUrl) {
  const prices = loadPrices(serviceSlug);
  if (!prices?.prices?.length) return "";

  const topRows = [...prices.prices]
    .sort(
      (a, b) =>
        (a.converted?.individual?.krw ?? Infinity) -
        (b.converted?.individual?.krw ?? Infinity)
    )
    .slice(0, 10)
    .map((country, index) => {
      const detailUrl = `${siteUrl}/${serviceSlug}/${country.countryCode.toLowerCase()}`;
      return `
        <tr>
          <td class="mono">${index + 1}</td>
          <td><a href="${escapeHtml(detailUrl)}">${escapeHtml(country.country)}</a></td>
          <td class="mono">${formatKrw(country.converted?.individual?.krw)}</td>
        </tr>
      `;
    })
    .join("");

  return `
    <section>
      <h2>최저가 TOP 10 (개인 요금제)</h2>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>국가</th>
            <th>KRW 환산</th>
          </tr>
        </thead>
        <tbody>${topRows}</tbody>
      </table>
    </section>
  `;
}

function getSeoPayloadForPath(pathname, siteUrl) {
  if (pathname === "/") {
    return {
      meta: getHomeMeta(siteUrl),
      contentHtml: renderHomeContent(siteUrl),
    };
  }

  if (pathname === "/about") {
    return {
      meta: getStaticMeta("about", siteUrl),
      contentHtml: renderStaticContent("about"),
    };
  }

  if (pathname === "/privacy") {
    return {
      meta: getStaticMeta("privacy", siteUrl),
      contentHtml: renderStaticContent("privacy"),
    };
  }

  if (pathname === "/report") {
    return {
      meta: getStaticMeta("report", siteUrl),
      contentHtml: renderStaticContent("report"),
    };
  }

  if (pathname === "/changelog") {
    return {
      meta: getStaticMeta("changelog", siteUrl),
      contentHtml: renderStaticContent("changelog"),
    };
  }

  const trendsMatch = pathname.match(/^\/([a-z0-9-]+)\/trends$/);
  if (trendsMatch) {
    const [, serviceSlug] = trendsMatch;
    return {
      meta: getTrendsMeta(serviceSlug, siteUrl),
      contentHtml: renderTrendsContent(serviceSlug, siteUrl),
    };
  }

  const countryMatch = pathname.match(/^\/([a-z0-9-]+)\/([a-z]{2})$/);
  if (countryMatch) {
    const [, serviceSlug, countryCode] = countryMatch;
    return {
      meta: getCountryMeta(serviceSlug, countryCode, siteUrl),
      contentHtml: renderCountryContent(serviceSlug, countryCode, siteUrl),
    };
  }

  const serviceMatch = pathname.match(/^\/([a-z0-9-]+)$/);
  if (serviceMatch) {
    const [, serviceSlug] = serviceMatch;
    const { services } = loadServices();
    const isService = services.some((service) => service.slug === serviceSlug);
    if (!isService) return null;

    return {
      meta: getServiceMeta(serviceSlug, siteUrl),
      contentHtml: renderServiceContent(serviceSlug, siteUrl),
    };
  }

  return null;
}

// 크롤러 감지 미들웨어
function seoMiddleware(req, res, next) {
  const ua = req.headers["user-agent"] || "";

  // 크롤러가 아니면 통과 (SPA로 서빙)
  if (!CRAWLER_PATTERN.test(ua)) return next();

  // API, 정적 파일 요청은 통과
  if (req.path.startsWith("/api") || req.path.startsWith("/assets") || req.path.includes(".")) {
    return next();
  }

  const siteUrl = resolveSiteUrl(req);
  const payload = getSeoPayloadForPath(req.path, siteUrl);
  if (!payload?.meta) return next();

  const isPreviewHost = typeof req.query.host === "string" && req.query.host.trim().length > 0;

  res.set("Content-Type", "text/html; charset=utf-8");
  res.send(buildSeoHtml(payload.meta, payload.contentHtml, { noindex: isPreviewHost }));
}

module.exports = seoMiddleware;
