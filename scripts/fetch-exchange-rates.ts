/**
 * 환율 갱신 스크립트
 * 사용법: node scripts/fetch-exchange-rates.ts
 * 무료 API: https://open.er-api.com/v6/latest/USD
 */
const fs = require("fs");
const path = require("path");

const OUTPUT_PATH = path.join(process.cwd(), "data/exchange-rates.json");

async function fetchRates() {
  const response = await fetch("https://open.er-api.com/v6/latest/USD");
  const data = await response.json();

  if (data.result !== "success") {
    throw new Error("환율 API 호출 실패");
  }

  // 필요한 통화만 필터링
  const needed = [
    "KRW",
    "TRY",
    "INR",
    "ARS",
    "BRL",
    "MXN",
    "PHP",
    "IDR",
    "THB",
    "VND",
    "EGP",
    "NGN",
    "ZAR",
    "PLN",
    "CZK",
    "HUF",
    "RON",
    "UAH",
    "GBP",
    "EUR",
    "JPY",
    "CAD",
    "AUD",
    "NZD",
    "CHF",
    "SEK",
    "NOK",
    "DKK",
    "SGD",
    "HKD",
    "TWD",
    "MYR",
    "CLP",
    "COP",
    "PEN",
    "KES",
    "GHS",
    "PKR",
    "BDT",
    "LKR",
    "SAR",
    "AED",
    "ILS",
  ];

  const rates = {};
  for (const code of needed) {
    if (data.rates[code]) {
      rates[code] = data.rates[code];
    }
  }

  const output = {
    fetchedAt: new Date().toISOString().split("T")[0],
    base: "USD",
    rates,
  };

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(output, null, 2), "utf-8");
  console.log(
    `환율 갱신 완료: ${Object.keys(rates).length}개 통화, ${output.fetchedAt}`
  );

  // prices JSON 파일에 krwRate / exchangeRateDate 자동 반영
  const krwRate = rates["KRW"];
  const pricesDirs = [
    path.join(process.cwd(), "data/prices"),
    path.join(process.cwd(), "client/public/data/prices"),
  ];

  for (const dir of pricesDirs) {
    if (!fs.existsSync(dir)) continue;
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
    for (const file of files) {
      const filePath = path.join(dir, file);
      const json = JSON.parse(fs.readFileSync(filePath, "utf-8"));
      json.krwRate = krwRate;
      json.exchangeRateDate = output.fetchedAt;

      // converted.usd, converted.krw를 오늘 환율 기준으로 재계산
      for (const price of json.prices || []) {
        if (!price.converted || !price.currency || !price.plans) continue;
        const currency = price.currency;

        for (const planKey of Object.keys(price.converted)) {
          const entry = price.converted[planKey];
          const localPrice = price.plans[planKey]?.monthly;
          if (!entry || localPrice == null) continue;

          if (currency === "USD") {
            // USD 국가는 그대로
            entry.usd = localPrice;
          } else if (currency === "KRW") {
            // KRW 국가: usd = localPrice / krwRate
            entry.usd = Math.round((localPrice / krwRate) * 100) / 100;
          } else if (rates[currency]) {
            // 기타 통화: usd = localPrice / currency_rate
            entry.usd = Math.round((localPrice / rates[currency]) * 100) / 100;
          }

          // krw = usd * krwRate
          if (entry.usd != null) {
            entry.krw = Math.round(entry.usd * krwRate);
          }
        }
      }

      fs.writeFileSync(filePath, JSON.stringify(json, null, 2), "utf-8");
      console.log(`  → ${path.relative(process.cwd(), filePath)} 업데이트`);
    }
  }
}

fetchRates().catch((err) => {
  const message = err instanceof Error ? err.message : "알 수 없는 오류";
  console.error("환율 갱신 실패:", message);
  process.exit(1);
});
