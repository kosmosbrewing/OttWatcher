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
}

fetchRates().catch((err) => {
  const message = err instanceof Error ? err.message : "알 수 없는 오류";
  console.error("환율 갱신 실패:", message);
  process.exit(1);
});
