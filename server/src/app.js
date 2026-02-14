const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
const logger = require("./utils/logger");
const errorHandler = require("./middleware/errorHandler");
const seoMiddleware = require("./middleware/seo");
const apiRoutes = require("./routes");
const sitemapRouter = require("./routes/sitemap");
const { resolveSiteUrl } = require("./utils/meta");

const app = express();
const PORT = process.env.PORT || 6002;
app.set("trust proxy", true);

// 보안 미들웨어 (AdSense 도메인 허용)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://pagead2.googlesyndication.com", "https://adservice.google.com", "https://www.googletagservices.com"],
      frameSrc: ["'self'", "https://googleads.g.doubleclick.net", "https://tpc.googlesyndication.com"],
      imgSrc: ["'self'", "data:", "https://pagead2.googlesyndication.com", "https://www.google.com"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      connectSrc: ["'self'", "https://pagead2.googlesyndication.com"],
    },
  },
}));
app.use(cors({
  origin: true,
  credentials: true,
}));

// 요청 크기 제한
app.use(express.json({ limit: "1mb" }));

// Rate Limiting (분당 100회)
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요." },
}));

// 헬스체크
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// robots.txt (도메인/프리뷰 host 기반 동적 생성)
app.get("/robots.txt", (req, res) => {
  const siteUrl = resolveSiteUrl(req);
  const lines = [
    "User-agent: *",
    "Allow: /",
    `Sitemap: ${siteUrl}/sitemap.xml`,
  ];

  res.set("Content-Type", "text/plain; charset=utf-8");
  res.send(lines.join("\n"));
});

const configuredAdsenseId = process.env.ADSENSE_PUBLISHER_ID || process.env.VITE_ADSENSE_PUBLISHER_ID || "";
app.get("/ads.txt", (req, res) => {
  if (!configuredAdsenseId) {
    return res.status(404).type("text/plain; charset=utf-8").send("ads.txt is not configured");
  }

  // ads.txt에는 ca- 접두어 없이 pub- 형식 사용
  const publisherId = configuredAdsenseId.replace(/^ca-/i, "");
  const adsTxt = `google.com, ${publisherId}, DIRECT, f08c47fec0942fa0`;
  res.type("text/plain; charset=utf-8").send(adsTxt);
});

// sitemap.xml (SEO)
app.use(sitemapRouter);

// API 라우트
app.use("/api", apiRoutes);

// 프로덕션: 크롤러 감지 → SEO HTML 또는 정적 파일 서빙
if (process.env.NODE_ENV === "production") {
  // 크롤러 감지 미들웨어 (정적 파일 서빙보다 먼저 실행)
  app.use(seoMiddleware);

  const clientDist = path.join(__dirname, "../../client/dist");
  app.use(express.static(clientDist));

  // SPA 폴백: API가 아닌 모든 요청을 index.html로 라우팅 (Express 5: named catch-all)
  app.get("/{*splat}", (req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
} else {
  // 개발 환경에서도 크롤러 테스트 가능하도록
  app.use(seoMiddleware);
}

// 전역 에러 핸들러 (반드시 마지막에 등록)
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Server started on port ${PORT}`, { port: PORT });
});

module.exports = app;
