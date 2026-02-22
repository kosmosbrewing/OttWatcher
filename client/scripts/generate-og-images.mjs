import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import {
  SITE_URL,
  SERVICE_SLUG,
  loadPriceSeed,
  getCountryEntries,
} from "./seo-routes.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DIST_DIR = path.resolve(__dirname, "../dist");
const FONTS_DIR = path.resolve(__dirname, "../public/fonts");

const WIDTH = 1200;
const HEIGHT = 630;

// ─── 폰트 로드 (사이트 동일: 제목 GmarketSans, 본문 Pretendard) ─────────────
const gmarketBold = fs.readFileSync(
  path.join(FONTS_DIR, "GmarketSansBold.woff")
);
const pretendardRegular = fs.readFileSync(
  path.join(FONTS_DIR, "Pretendard-Regular.woff")
);
const pretendardBold = fs.readFileSync(
  path.join(FONTS_DIR, "Pretendard-Bold.woff")
);

const fonts = [
  { name: "GmarketSans", data: gmarketBold, weight: 700, style: "normal" },
  { name: "Pretendard", data: pretendardRegular, weight: 400, style: "normal" },
  { name: "Pretendard", data: pretendardBold, weight: 700, style: "normal" },
];

// ─── 사이트 색상 체계 (CSS 변수 기반 동일) ──────────────────────────────────
const COLORS = {
  bg: "#f4f6f9",
  card: "#ffffff",
  foreground: "#1e293b",
  muted: "#64748b",
  primary: "#4338ca",
  savings: "#16a34a",
  border: "#cbd5e1",
  youtube: "#ff0000",
};

// ─── 유틸 ───────────────────────────────────────────────────────────────────
function fmtKrw(val) {
  if (val == null) return "-";
  return `${Math.round(val).toLocaleString("ko-KR")}원`;
}

function savingsPercent(price, base) {
  if (!base || base <= 0 || price == null) return 0;
  return Math.round(((base - price) / base) * 100);
}

function countryFlag(code) {
  return [...code.toUpperCase()].map((c) =>
    String.fromCodePoint(0x1F1E6 + c.charCodeAt(0) - 65)
  ).join("");
}

// ─── 메달: Satori div 기반 컬러 원 (img/SVG data URL은 Resvg가 미지원) ──────
const MEDAL_CONFIGS = [
  { bg: "#FFD700", fg: "#7B5200" },
  { bg: "#C8C8C8", fg: "#505050" },
  { bg: "#CD8C3C", fg: "#5C3500" },
];

function medalDiv(index) {
  const { bg, fg } = MEDAL_CONFIGS[index];
  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "44px",
        height: "44px",
        borderRadius: "50%",
        backgroundColor: bg,
        fontFamily: "GmarketSans",
        fontSize: "22px",
        fontWeight: 700,
        color: fg,
        flexShrink: 0,
      },
      children: String(index + 1),
    },
  };
}

// ─── 국기: Twemoji GitHub CDN으로 사전 캐시 ─────────────────────────────────
const flagCache = new Map();

function emojiToCodepoints(emoji) {
  return [...emoji]
    .map((c) => c.codePointAt(0).toString(16).padStart(4, "0"))
    .join("-")
    .replace(/-fe0f/g, "");
}

async function preloadFlags(countryCodes) {
  await Promise.all(
    [...new Set(countryCodes)].map(async (code) => {
      const emoji = countryFlag(code);
      const cp = emojiToCodepoints(emoji);
      // GitHub CDN: npm CDN과 달리 실제 assets 포함
      const url = `https://cdn.jsdelivr.net/gh/twitter/twemoji@v14.0.2/assets/svg/${cp}.svg`;
      try {
        const res = await fetch(url);
        if (!res.ok) return;
        const svg = await res.text();
        flagCache.set(code, `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`);
      } catch { /* 국기 없으면 생략 */ }
    })
  );
}

function flagImg(countryCode, size = 32) {
  const src = flagCache.get(countryCode);
  if (!src) return null;
  return { type: "img", props: { src, width: size, height: Math.round(size * 0.75), style: { display: "flex", borderRadius: "3px" } } };
}

// ─── SVG → PNG 변환 ─────────────────────────────────────────────────────────
async function renderPng(jsx) {
  const svg = await satori(jsx, { width: WIDTH, height: HEIGHT, fonts });
  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: WIDTH },
  });
  return resvg.render().asPng();
}

// ─── 서비스 페이지 OG (Top 3 랭킹) ─────────────────────────────────────────
function buildServiceOgMarkup(entries, krEntry) {
  const sorted = entries
    .filter((e) => e.krw != null)
    .sort((a, b) => a.krw - b.krw);
  const top3 = sorted.slice(0, 3);
  const baseKrw = krEntry?.krw ?? null;
  const RANK_ACCENT = [MEDAL_CONFIGS[0].bg, MEDAL_CONFIGS[1].bg, MEDAL_CONFIGS[2].bg];
  const RANK_BG = ["#fffef5", "#ffffff", "#ffffff"];

  return {
    type: "div",
    props: {
      style: {
        width: `${WIDTH}px`,
        height: `${HEIGHT}px`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "48px 64px 36px",
        background: "linear-gradient(150deg, #f8fafc 0%, #eef2f7 100%)",
        fontFamily: "Pretendard",
        color: COLORS.foreground,
      },
      children: [
        // Header: YouTube 레드 액센트 바 + 타이틀
        {
          type: "div",
          props: {
            style: { display: "flex", alignItems: "center", gap: "20px" },
            children: [
              // YouTube 레드 수직 바
              {
                type: "div",
                props: {
                  style: {
                    width: "6px",
                    height: "64px",
                    backgroundColor: "#FF0000",
                    borderRadius: "4px",
                    flexShrink: 0,
                  },
                },
              },
              // 타이틀 블록
              {
                type: "div",
                props: {
                  style: { display: "flex", flexDirection: "column", gap: "4px" },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          fontFamily: "GmarketSans",
                          fontSize: "50px",
                          fontWeight: 700,
                          lineHeight: "1.15",
                          color: COLORS.foreground,
                        },
                        children: "YouTube Premium",
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          fontFamily: "Pretendard",
                          fontSize: "22px",
                          fontWeight: 600,
                          color: COLORS.muted,
                          letterSpacing: "0.02em",
                        },
                        children: "글로벌 가격 랭킹",
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        // Top 3 카드
        {
          type: "div",
          props: {
            style: { display: "flex", flexDirection: "column", gap: "10px" },
            children: top3.map((entry, i) => {
              const pct = savingsPercent(entry.krw, baseKrw);
              const savingsAmt = baseKrw != null && entry.krw != null ? Math.round(baseKrw - entry.krw) : 0;
              return {
                type: "div",
                props: {
                  key: entry.countryCode,
                  style: {
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    backgroundColor: RANK_BG[i],
                    borderTopWidth: "1.5px",
                    borderTopStyle: "solid",
                    borderTopColor: COLORS.border,
                    borderRightWidth: "1.5px",
                    borderRightStyle: "solid",
                    borderRightColor: COLORS.border,
                    borderBottomWidth: "1.5px",
                    borderBottomStyle: "solid",
                    borderBottomColor: COLORS.border,
                    borderLeftWidth: "5px",
                    borderLeftStyle: "solid",
                    borderLeftColor: RANK_ACCENT[i],
                    borderRadius: "10px",
                    padding: "14px 24px 14px 20px",
                  },
                  children: [
                    // Left: medal + 국기 + 국가명
                    {
                      type: "div",
                      props: {
                        style: { display: "flex", alignItems: "center", gap: "14px" },
                        children: [
                          medalDiv(i),
                          {
                            type: "div",
                            props: {
                              style: { display: "flex", alignItems: "center", gap: "10px" },
                              children: [
                                flagImg(entry.countryCode),
                                {
                                  type: "div",
                                  props: {
                                    style: {
                                      fontFamily: "GmarketSans",
                                      fontSize: "26px",
                                      fontWeight: 700,
                                      color: COLORS.foreground,
                                    },
                                    children: entry.country,
                                  },
                                },
                              ],
                            },
                          },
                        ],
                      },
                    },
                    // Right: 가격 + 절약 배지
                    {
                      type: "div",
                      props: {
                        style: { display: "flex", alignItems: "center", gap: "14px" },
                        children: [
                          {
                            type: "div",
                            props: {
                              style: {
                                fontSize: "28px",
                                fontWeight: 700,
                                color: COLORS.foreground,
                              },
                              children: fmtKrw(entry.krw),
                            },
                          },
                          pct > 0
                            ? {
                                type: "div",
                                props: {
                                  style: {
                                    display: "flex",
                                    alignItems: "center",
                                    backgroundColor: "#f0fdf4",
                                    borderWidth: "1px",
                                    borderStyle: "solid",
                                    borderColor: "#86efac",
                                    padding: "5px 14px",
                                    borderRadius: "6px",
                                    fontSize: "20px",
                                    fontWeight: 700,
                                    color: COLORS.savings,
                                    whiteSpace: "nowrap",
                                  },
                                  children: `-${pct}%  월 ${fmtKrw(savingsAmt)} 절약`,
                                },
                              }
                            : null,
                        ].filter(Boolean),
                      },
                    },
                  ],
                },
              };
            }),
          },
        },
        // Footer
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTopWidth: "1px",
              borderTopStyle: "solid",
              borderTopColor: COLORS.border,
              paddingTop: "16px",
            },
            children: [
              {
                type: "div",
                props: {
                  style: { fontSize: "18px", fontWeight: 400, color: COLORS.muted },
                  children: baseKrw ? `한국 기준 ${fmtKrw(baseKrw)}/월` : "",
                },
              },
              {
                type: "div",
                props: {
                  style: { fontSize: "18px", fontWeight: 600, color: COLORS.primary },
                  children: "ott.shakilabs.com",
                },
              },
            ],
          },
        },
      ],
    },
  };
}

// ─── 국가별 OG (히어로 가격 + 글로벌 TOP 3 랭킹) ───────────────────────────
function buildCountryOgMarkup(entry, krEntry, allEntries) {
  const baseKrw = krEntry?.krw ?? null;
  const pct = savingsPercent(entry.krw, baseKrw);
  const diff = baseKrw && entry.krw != null ? Math.round(baseKrw - entry.krw) : 0;
  const isCheaper = pct > 0;

  const top3 = [...allEntries]
    .filter((e) => e.krw != null)
    .sort((a, b) => a.krw - b.krw)
    .slice(0, 3);
  const RANK_ACCENT = [MEDAL_CONFIGS[0].bg, MEDAL_CONFIGS[1].bg, MEDAL_CONFIGS[2].bg];

  return {
    type: "div",
    props: {
      style: {
        width: `${WIDTH}px`,
        height: `${HEIGHT}px`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "44px 64px 36px",
        background: "linear-gradient(150deg, #f8fafc 0%, #eef2f7 100%)",
        fontFamily: "Pretendard",
        color: COLORS.foreground,
      },
      children: [
        // ── Header ──
        {
          type: "div",
          props: {
            style: { display: "flex", alignItems: "center", gap: "20px" },
            children: [
              { type: "div", props: { style: { width: "6px", height: "60px", backgroundColor: "#FF0000", borderRadius: "4px", flexShrink: 0 } } },
              {
                type: "div",
                props: {
                  style: { display: "flex", flexDirection: "column", gap: "3px" },
                  children: [
                    { type: "div", props: { style: { fontFamily: "GmarketSans", fontSize: "44px", fontWeight: 700, lineHeight: "1.15", color: COLORS.foreground }, children: "YouTube Premium" } },
                    {
                      type: "div",
                      props: {
                        style: { display: "flex", alignItems: "center", gap: "8px", fontSize: "20px", fontWeight: 600, color: COLORS.muted },
                        children: [
                          flagImg(entry.countryCode, 22) ?? null,
                          { type: "div", props: { children: `${entry.country} 구독료` } },
                        ],
                      },
                    },
                  ],
                },
              },
            ],
          },
        },

        // ── 히어로: 해당 국가 가격 + 절약 배지 ──
        {
          type: "div",
          props: {
            style: { display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" },
            children: [
              {
                type: "div",
                props: {
                  style: { fontSize: "72px", fontWeight: 700, lineHeight: "1", color: isCheaper ? COLORS.savings : COLORS.foreground },
                  children: fmtKrw(entry.krw),
                },
              },
              isCheaper
                ? {
                    type: "div",
                    props: {
                      style: {
                        display: "flex", alignItems: "center",
                        backgroundColor: "#f0fdf4",
                        borderWidth: "1px", borderStyle: "solid", borderColor: "#86efac",
                        padding: "6px 20px", borderRadius: "8px",
                        fontSize: "22px", fontWeight: 700, color: COLORS.savings,
                      },
                      children: `-${pct}%  월 ${fmtKrw(diff)} 절약 (한국 대비)`,
                    },
                  }
                : {
                    type: "div",
                    props: {
                      style: { fontSize: "20px", fontWeight: 600, color: COLORS.muted },
                      children: pct === 0 ? "한국과 동일한 가격" : `한국보다 ${Math.abs(pct)}% 비쌈`,
                    },
                  },
            ],
          },
        },

        // ── 하단: 글로벌 TOP 3 랭킹 카드 ──
        {
          type: "div",
          props: {
            style: { display: "flex", flexDirection: "column", gap: "10px" },
            children: [
              {
                type: "div",
                props: {
                  style: { fontSize: "16px", fontWeight: 600, color: COLORS.muted, letterSpacing: "0.06em" },
                  children: "GLOBAL TOP 3",
                },
              },
              {
                type: "div",
                props: {
                  style: { display: "flex", gap: "10px" },
                  children: top3.map((e, i) => {
                    const isActive = e.countryCode === entry.countryCode;
                    return {
                      type: "div",
                      props: {
                        key: e.countryCode,
                        style: {
                          display: "flex",
                          flexDirection: "column",
                          gap: "6px",
                          flex: 1,
                          padding: "12px 16px",
                          backgroundColor: isActive ? "#f0fdf4" : COLORS.card,
                          borderTopWidth: "1.5px", borderTopStyle: "solid", borderTopColor: isActive ? "#86efac" : COLORS.border,
                          borderRightWidth: "1.5px", borderRightStyle: "solid", borderRightColor: isActive ? "#86efac" : COLORS.border,
                          borderBottomWidth: "1.5px", borderBottomStyle: "solid", borderBottomColor: isActive ? "#86efac" : COLORS.border,
                          borderLeftWidth: "4px", borderLeftStyle: "solid", borderLeftColor: isActive ? COLORS.savings : RANK_ACCENT[i],
                          borderRadius: "8px",
                        },
                        children: [
                          {
                            type: "div",
                            props: {
                              style: { display: "flex", alignItems: "center", gap: "8px" },
                              children: [
                                medalDiv(i),
                                {
                                  type: "div",
                                  props: {
                                    style: { display: "flex", alignItems: "center", gap: "6px" },
                                    children: [
                                      flagImg(e.countryCode, 20) ?? null,
                                      { type: "div", props: { style: { fontFamily: "GmarketSans", fontSize: "20px", fontWeight: 700, color: isActive ? COLORS.savings : COLORS.foreground }, children: e.country } },
                                    ],
                                  },
                                },
                              ],
                            },
                          },
                          {
                            type: "div",
                            props: {
                              style: { fontSize: "22px", fontWeight: 700, color: isActive ? COLORS.savings : COLORS.foreground, paddingLeft: "4px" },
                              children: fmtKrw(e.krw),
                            },
                          },
                        ],
                      },
                    };
                  }),
                },
              },
            ],
          },
        },

        // ── Footer ──
        {
          type: "div",
          props: {
            style: {
              display: "flex", justifyContent: "flex-end", alignItems: "center",
              borderTopWidth: "1px", borderTopStyle: "solid", borderTopColor: COLORS.border,
              paddingTop: "12px",
            },
            children: [
              { type: "div", props: { style: { fontSize: "18px", fontWeight: 600, color: COLORS.primary }, children: "ott.shakilabs.com" } },
            ],
          },
        },
      ],
    },
  };
}

// ─── 메인 실행 ──────────────────────────────────────────────────────────────
async function main() {
  if (!fs.existsSync(DIST_DIR)) {
    throw new Error(`dist/ not found. Run 'vite build' first.`);
  }

  const entries = getCountryEntries();
  const krEntry = entries.find((e) => e.countryCode === "kr") || null;

  // 국기 사전 로드 (Twemoji GitHub CDN)
  await preloadFlags(entries.map((e) => e.countryCode));

  // v2: 카카오 캐시 bust용 버전 디렉토리
  const OG_VER = "v2";
  const ogDir = path.join(DIST_DIR, "og", OG_VER);
  const serviceOgDir = path.join(ogDir, SERVICE_SLUG);
  fs.mkdirSync(serviceOgDir, { recursive: true });

  let generated = 0;

  // 1. 서비스 페이지 OG
  const serviceMarkup = buildServiceOgMarkup(entries, krEntry);
  const servicePng = await renderPng(serviceMarkup);
  fs.writeFileSync(path.join(ogDir, `${SERVICE_SLUG}.png`), servicePng);
  generated++;

  // 2. 국가별 OG
  for (const entry of entries) {
    const markup = buildCountryOgMarkup(entry, krEntry, entries);
    const png = await renderPng(markup);
    fs.writeFileSync(
      path.join(serviceOgDir, `${entry.countryCode}.png`),
      png
    );
    generated++;
  }

  process.stdout.write(
    `[og-images] generated ${generated} images in dist/og/${OG_VER}/\n`
  );
}

main().catch((err) => {
  console.error("[og-images] Error:", err);
  process.exit(1);
});
