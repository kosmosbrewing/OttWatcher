const express = require("express");
const fs = require("fs");
const path = require("path");
const { z } = require("zod");
const { loadPrices } = require("../../utils/meta");

const router = express.Router();

const DATA_DIR = path.join(__dirname, "../../../../data");
const HISTORY_DIR = path.join(DATA_DIR, "history");
const slugSchema = z
  .string()
  .regex(/^[a-z0-9-]+$/, "유효하지 않은 서비스 슬러그입니다.");

function readHistory(slug) {
  const filePath = path.join(HISTORY_DIR, `${slug}.json`);
  if (!fs.existsSync(filePath)) return [];

  try {
    const payload = JSON.parse(fs.readFileSync(filePath, "utf-8"));
    if (!Array.isArray(payload.snapshots)) return [];

    return payload.snapshots
      .filter(
        (snapshot) =>
          snapshot &&
          typeof snapshot.date === "string" &&
          Array.isArray(snapshot.prices)
      )
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch {
    return [];
  }
}

function buildRows(priceData) {
  const baseCountry = priceData.prices.find(
    (country) => country.countryCode === priceData.baseCountry
  );
  const baseKrw = baseCountry?.converted?.individual?.krw ?? null;

  return priceData.prices.map((country) => {
    const individual = country.converted?.individual || {};
    const currentKrw = individual.krw ?? null;
    const savingsPercent =
      baseKrw && currentKrw != null && baseKrw > 0
        ? Math.round(((baseKrw - currentKrw) / baseKrw) * 100)
        : 0;

    return {
      country: country.country,
      countryCode: country.countryCode,
      continent: country.continent,
      currency: country.currency,
      localMonthly: country.plans?.individual?.monthly ?? null,
      usd: individual.usd ?? null,
      krw: currentKrw,
      savingsPercent,
    };
  });
}

function getPreviousSnapshot(snapshots, currentDate) {
  if (snapshots.length === 0) return null;
  if (!currentDate) return snapshots[snapshots.length - 1];

  const sameDateIdx = snapshots.findIndex((snapshot) => snapshot.date === currentDate);
  if (sameDateIdx > 0) return snapshots[sameDateIdx - 1];
  if (sameDateIdx === 0) return null;
  return snapshots[snapshots.length - 1];
}

function buildCountryChanges(rows, snapshots, currentDate) {
  const timelineByCountry = Object.create(null);

  for (const snapshot of snapshots) {
    for (const item of snapshot.prices) {
      const countryCode = typeof item.countryCode === "string" ? item.countryCode.toUpperCase() : "";
      if (!countryCode) continue;
      if (typeof item.krw !== "number" || Number.isNaN(item.krw)) continue;

      if (!timelineByCountry[countryCode]) timelineByCountry[countryCode] = [];
      timelineByCountry[countryCode].push({ date: snapshot.date, krw: item.krw });
    }
  }

  for (const row of rows) {
    if (row.krw == null) continue;
    const code = row.countryCode.toUpperCase();
    if (!timelineByCountry[code]) timelineByCountry[code] = [];

    const series = timelineByCountry[code];
    const hasCurrentDate = series.some((item) => item.date === currentDate);
    if (!hasCurrentDate && currentDate) {
      series.push({ date: currentDate, krw: row.krw });
    }

    series.sort((a, b) => a.date.localeCompare(b.date));
    timelineByCountry[code] = series.slice(-6);
  }

  return timelineByCountry;
}

router.get("/:serviceSlug", (req, res) => {
  const parsed = slugSchema.safeParse(req.params.serviceSlug);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }

  const serviceSlug = parsed.data;
  const priceData = loadPrices(serviceSlug);
  if (!priceData?.prices?.length) {
    return res.status(404).json({ error: "트렌드 데이터를 찾을 수 없습니다." });
  }

  const rows = buildRows(priceData);
  const snapshots = readHistory(serviceSlug);
  const previousSnapshot = getPreviousSnapshot(snapshots, priceData.lastUpdated);
  const previousMap = new Map();

  if (previousSnapshot?.prices) {
    for (const item of previousSnapshot.prices) {
      const countryCode =
        typeof item.countryCode === "string" ? item.countryCode.toUpperCase() : "";
      if (!countryCode) continue;
      if (typeof item.krw !== "number" || Number.isNaN(item.krw)) continue;
      previousMap.set(countryCode, item.krw);
    }
  }

  const cheapest = rows
    .filter((row) => row.krw != null)
    .sort((a, b) => a.krw - b.krw)
    .slice(0, 10);

  const highestSavings = rows
    .filter((row) => row.krw != null && row.savingsPercent > 0)
    .sort((a, b) => b.savingsPercent - a.savingsPercent)
    .slice(0, 10);

  const biggestDrops = rows
    .map((row) => {
      const previousKrw = previousMap.get(row.countryCode.toUpperCase());
      if (previousKrw == null || row.krw == null) return null;

      const changeKrw = row.krw - previousKrw;
      const changePercent =
        previousKrw > 0 ? Math.round((changeKrw / previousKrw) * 1000) / 10 : 0;

      return {
        country: row.country,
        countryCode: row.countryCode,
        previousDate: previousSnapshot?.date || null,
        previousKrw,
        currentKrw: row.krw,
        changeKrw,
        changePercent,
      };
    })
    .filter(Boolean)
    .sort((a, b) => a.changeKrw - b.changeKrw)
    .slice(0, 10);

  const countryChanges = buildCountryChanges(
    rows,
    snapshots,
    priceData.lastUpdated || null
  );

  res.json({
    serviceSlug,
    asOf: priceData.lastUpdated || null,
    exchangeRateDate: priceData.exchangeRateDate || null,
    previousSnapshotDate: previousSnapshot?.date || null,
    cheapest,
    highestSavings,
    biggestDrops,
    countryChanges,
  });
});

module.exports = router;

