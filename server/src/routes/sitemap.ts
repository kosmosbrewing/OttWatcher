import express from "express";
import { loadServices, loadPrices, resolveSiteUrl } from "../utils/meta";

const router = express.Router();

type SitemapItem = {
  loc: string;
  changefreq: string;
  priority: string;
  lastmod?: string;
};

// XML 특수문자 이스케이프 - URL 내 &, < 등 방어
function escapeXml(str: string): string {
  return str.replace(
    /[<>&"']/g,
    (c) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[c] || c
  );
}

// GET /sitemap.xml - 동적 사이트맵 생성 (서비스×국가 조합)
router.get("/sitemap.xml", (req, res) => {
  const siteUrl = resolveSiteUrl(req);
  const { services } = loadServices();
  const activeServices = services.filter((s) => s.active);
  const today = new Date().toISOString().split("T")[0];

  const urls: SitemapItem[] = [];

  // 홈
  urls.push({ loc: siteUrl, changefreq: "weekly", priority: "1.0" });

  // 정적 페이지
  urls.push({ loc: `${siteUrl}/about`, changefreq: "monthly", priority: "0.3" });
  urls.push({ loc: `${siteUrl}/privacy`, changefreq: "monthly", priority: "0.2" });

  // 서비스별 가격 페이지 + 국가별 상세 페이지
  for (const service of activeServices) {
    urls.push({
      loc: `${siteUrl}/${service.slug}`,
      changefreq: "weekly",
      priority: "0.9",
      lastmod: today,
    });
    urls.push({
      loc: `${siteUrl}/${service.slug}/trends`,
      changefreq: "daily",
      priority: "0.8",
      lastmod: today,
    });

    const prices = loadPrices(service.slug);
    if (prices?.prices) {
      for (const country of prices.prices) {
        urls.push({
          loc: `${siteUrl}/${service.slug}/${country.countryCode.toLowerCase()}`,
          changefreq: "weekly",
          priority: "0.7",
          lastmod: prices.lastUpdated || today,
        });
      }
    }
  }

  // XML 생성
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${escapeXml(u.loc)}</loc>
    ${u.lastmod ? `<lastmod>${escapeXml(u.lastmod)}</lastmod>` : ""}
    <changefreq>${escapeXml(u.changefreq)}</changefreq>
    <priority>${escapeXml(String(u.priority))}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

  res.set("Content-Type", "application/xml; charset=utf-8");
  res.send(xml);
});

export default router;
