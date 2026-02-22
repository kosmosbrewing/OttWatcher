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

// ─── Twemoji: 빌드 전 emoji → base64 SVG 사전 캐시 ─────────────────────────
const emojiCache = new Map();

function emojiToCodepoints(emoji) {
  return [...emoji]
    .map((c) => c.codePointAt(0).toString(16).padStart(4, "0"))
    .join("-")
    .replace(/-fe0f/g, ""); // variation selector 제거
}

async function preloadEmojis(emojis) {
  await Promise.all(
    [...new Set(emojis)].map(async (emoji) => {
      const cp = emojiToCodepoints(emoji);
      const url = `https://cdn.jsdelivr.net/npm/twemoji@14.0.2/assets/svg/${cp}.svg`;
      try {
        const res = await fetch(url);
        if (!res.ok) return;
        const svg = await res.text();
        emojiCache.set(emoji, `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`);
      } catch { /* fallback: 이모지 생략 */ }
    })
  );
}

function emojiImg(emoji, size) {
  const src = emojiCache.get(emoji);
  if (!src) return null;
  return { type: "img", props: { src, width: size, height: size, style: { display: "flex" } } };
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
function buildServiceOgMarkup(entries, krEntry, medals) {
  const sorted = entries
    .filter((e) => e.krw != null)
    .sort((a, b) => a.krw - b.krw);
  const top3 = sorted.slice(0, 3);
  const baseKrw = krEntry?.krw ?? null;
  const MEDALS = medals;

  return {
    type: "div",
    props: {
      style: {
        width: `${WIDTH}px`,
        height: `${HEIGHT}px`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "52px 64px 40px",
        backgroundColor: COLORS.bg,
        fontFamily: "Pretendard",
        color: COLORS.foreground,
      },
      children: [
        // Header
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              flexDirection: "column",
              gap: "4px",
            },
            children: [
              {
                type: "div",
                props: {
                  style: {
                    fontFamily: "GmarketSans",
                    fontSize: "50px",
                    fontWeight: 700,
                    lineHeight: "1.2",
                    color: COLORS.foreground,
                  },
                  children: "YouTube Premium",
                },
              },
              {
                type: "div",
                props: {
                  style: {
                    fontFamily: "GmarketSans",
                    fontSize: "26px",
                    fontWeight: 700,
                    color: COLORS.muted,
                  },
                  children: "글로벌 가격 랭킹",
                },
              },
            ],
          },
        },
        // Top 3 rows
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            },
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
                    backgroundColor: COLORS.card,
                    border: `1.5px solid ${COLORS.border}`,
                    borderRadius: "10px",
                    padding: "14px 24px",
                  },
                  children: [
                    // Left: medal + country
                    {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          alignItems: "center",
                          gap: "16px",
                        },
                        children: [
                          emojiImg(MEDALS[i], 40) ?? {
                            type: "div",
                            props: {
                              style: { fontFamily: "GmarketSans", fontSize: "26px", fontWeight: 700, flexShrink: 0 },
                              children: String(i + 1),
                            },
                          },
                          {
                            type: "div",
                            props: {
                              style: {
                                display: "flex",
                                alignItems: "center",
                                gap: "10px",
                              },
                              children: [
                                emojiImg(countryFlag(entry.countryCode), 32) ?? null,
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
                    // Right: price + savings
                    {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          alignItems: "center",
                          gap: "16px",
                        },
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
                                    flexDirection: "column",
                                    alignItems: "flex-end",
                                    gap: "2px",
                                    backgroundColor: "#f0fdf4",
                                    padding: "6px 14px",
                                    borderRadius: "6px",
                                  },
                                  children: [
                                    {
                                      type: "div",
                                      props: {
                                        style: {
                                          fontSize: "22px",
                                          fontWeight: 700,
                                          color: COLORS.savings,
                                        },
                                        children: `-${pct}%`,
                                      },
                                    },
                                    {
                                      type: "div",
                                      props: {
                                        style: {
                                          fontSize: "15px",
                                          fontWeight: 400,
                                          color: COLORS.savings,
                                        },
                                        children: `월 ${fmtKrw(savingsAmt)} 절약`,
                                      },
                                    },
                                  ],
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
            },
            children: [
              {
                type: "div",
                props: {
                  style: { fontSize: "20px", fontWeight: 400, color: COLORS.muted },
                  children: baseKrw
                    ? `한국 기준 ${fmtKrw(baseKrw)}/월`
                    : "",
                },
              },
              {
                type: "div",
                props: {
                  style: { fontSize: "20px", fontWeight: 400, color: COLORS.muted },
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

// ─── 국가별 OG (한국 vs 해당 국가) ──────────────────────────────────────────
function buildCountryOgMarkup(entry, krEntry) {
  const baseKrw = krEntry?.krw ?? null;
  const pct = savingsPercent(entry.krw, baseKrw);
  const diff =
    baseKrw && entry.krw != null ? Math.round(baseKrw - entry.krw) : 0;
  const isCheaper = pct > 0;

  return {
    type: "div",
    props: {
      style: {
        width: `${WIDTH}px`,
        height: `${HEIGHT}px`,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "48px 64px 36px",
        backgroundColor: COLORS.bg,
        fontFamily: "Pretendard",
        color: COLORS.foreground,
      },
      children: [
        // Title
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              alignItems: "center",
              gap: "12px",
              fontFamily: "GmarketSans",
              fontSize: "38px",
              fontWeight: 700,
              color: COLORS.foreground,
            },
            children: [
              {
                type: "div",
                props: {
                  children: "YouTube Premium",
                },
              },
              {
                type: "div",
                props: {
                  style: { color: COLORS.muted },
                  children: `\u00B7 ${entry.country}`,
                },
              },
            ],
          },
        },
        // VS comparison cards
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "32px",
              width: "100%",
            },
            children: [
              // 한국 카드
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "6px",
                    padding: "28px 44px",
                    backgroundColor: COLORS.card,
                    border: `1.5px solid ${COLORS.border}`,
                    borderRadius: "14px",
                    minWidth: "300px",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "24px",
                          fontWeight: 400,
                          color: COLORS.muted,
                        },
                        children: "한국",
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "44px",
                          fontWeight: 700,
                          color: COLORS.muted,
                        },
                        children: fmtKrw(baseKrw),
                      },
                    },
                  ],
                },
              },
              // VS
              {
                type: "div",
                props: {
                  style: {
                    fontFamily: "GmarketSans",
                    fontSize: "28px",
                    fontWeight: 700,
                    color: COLORS.border,
                  },
                  children: "VS",
                },
              },
              // 대상 국가 카드
              {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "6px",
                    padding: "28px 44px",
                    backgroundColor: isCheaper ? "#f0fdf4" : COLORS.card,
                    border: `1.5px solid ${isCheaper ? "#86efac" : COLORS.border}`,
                    borderRadius: "14px",
                    minWidth: "300px",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "24px",
                          fontWeight: 700,
                          color: isCheaper ? COLORS.savings : COLORS.muted,
                        },
                        children: entry.country,
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          fontSize: "44px",
                          fontWeight: 700,
                          color: isCheaper ? COLORS.savings : COLORS.foreground,
                        },
                        children: fmtKrw(entry.krw),
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        // Savings summary
        {
          type: "div",
          props: {
            style: {
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "8px",
            },
            children: [
              isCheaper
                ? {
                    type: "div",
                    props: {
                      style: {
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      },
                      children: [
                        {
                          type: "div",
                          props: {
                            style: {
                              fontFamily: "GmarketSans",
                              fontSize: "36px",
                              fontWeight: 700,
                              color: COLORS.savings,
                            },
                            children: `${pct}% 절약`,
                          },
                        },
                        {
                          type: "div",
                          props: {
                            style: {
                              fontSize: "24px",
                              fontWeight: 400,
                              color: COLORS.muted,
                            },
                            children: `${fmtKrw(diff)} 저렴`,
                          },
                        },
                      ],
                    },
                  }
                : {
                    type: "div",
                    props: {
                      style: {
                        fontSize: "28px",
                        fontWeight: 700,
                        color: COLORS.muted,
                      },
                      children:
                        pct === 0
                          ? "한국과 동일한 가격"
                          : `한국보다 ${Math.abs(pct)}% 비쌈`,
                    },
                  },
              {
                type: "div",
                props: {
                  style: {
                    fontSize: "20px",
                    fontWeight: 400,
                    color: COLORS.muted,
                  },
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

// ─── 메인 실행 ──────────────────────────────────────────────────────────────
async function main() {
  if (!fs.existsSync(DIST_DIR)) {
    throw new Error(`dist/ not found. Run 'vite build' first.`);
  }

  const entries = getCountryEntries();
  const krEntry = entries.find((e) => e.countryCode === "kr") || null;

  // 이모지 사전 로드 (🥇🥈🥉 + 전국기)
  const MEDALS = ["🥇", "🥈", "🥉"];
  const flagEmojis = entries.map((e) => countryFlag(e.countryCode));
  await preloadEmojis([...MEDALS, ...flagEmojis]);

  const ogDir = path.join(DIST_DIR, "og");
  const serviceOgDir = path.join(ogDir, SERVICE_SLUG);
  fs.mkdirSync(serviceOgDir, { recursive: true });

  let generated = 0;

  // 1. 서비스 페이지 OG
  const serviceMarkup = buildServiceOgMarkup(entries, krEntry, MEDALS);
  const servicePng = await renderPng(serviceMarkup);
  fs.writeFileSync(path.join(ogDir, `${SERVICE_SLUG}.png`), servicePng);
  generated++;

  // 2. 국가별 OG
  for (const entry of entries) {
    const markup = buildCountryOgMarkup(entry, krEntry);
    const png = await renderPng(markup);
    fs.writeFileSync(
      path.join(serviceOgDir, `${entry.countryCode}.png`),
      png
    );
    generated++;
  }

  process.stdout.write(
    `[og-images] generated ${generated} images in dist/og/\n`
  );
}

main().catch((err) => {
  console.error("[og-images] Error:", err);
  process.exit(1);
});
