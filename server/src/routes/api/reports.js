const express = require("express");
const fs = require("fs");
const path = require("path");
const { z } = require("zod");

const router = express.Router();

const DATA_DIR = path.join(__dirname, "../../../../data");
const REPORTS_DIR = path.join(DATA_DIR, "reports");
const SUBMISSIONS_FILE = path.join(REPORTS_DIR, "submissions.ndjson");
const CHANGELOG_FILE = path.join(REPORTS_DIR, "changelog.json");

const reportSchema = z.object({
  serviceSlug: z.string().regex(/^[a-z0-9-]+$/),
  countryCode: z.string().regex(/^[A-Za-z]{2}$/),
  planId: z.string().min(2).max(32),
  currency: z.string().min(3).max(8),
  reportedPrice: z.coerce.number().positive(),
  sourceUrl: z.string().url().optional().or(z.literal("")),
  note: z.string().max(1000).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
});

function ensureDir() {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
}

function appendNdjson(filePath, record) {
  ensureDir();
  fs.appendFileSync(filePath, `${JSON.stringify(record)}\n`, "utf-8");
}

function readJson(filePath, fallback) {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return fallback;
  }
}

router.post("/", (req, res) => {
  const parsed = reportSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: parsed.error.issues[0]?.message || "입력값이 올바르지 않습니다.",
    });
  }

  const payload = parsed.data;
  const now = new Date().toISOString();
  const id = `rep_${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 8)}`;

  const record = {
    id,
    createdAt: now,
    status: "pending",
    serviceSlug: payload.serviceSlug,
    countryCode: payload.countryCode.toUpperCase(),
    planId: payload.planId,
    currency: payload.currency.toUpperCase(),
    reportedPrice: payload.reportedPrice,
    sourceUrl: payload.sourceUrl || null,
    note: payload.note || null,
    email: payload.email || null,
    ip: req.ip || null,
    userAgent: req.headers["user-agent"] || null,
  };

  appendNdjson(SUBMISSIONS_FILE, record);

  return res.status(201).json({
    id,
    message: "제보가 접수되었습니다. 검토 후 반영됩니다.",
  });
});

router.get("/logs", (req, res) => {
  const serviceSlug = typeof req.query.serviceSlug === "string" ? req.query.serviceSlug : "";
  const payload = readJson(CHANGELOG_FILE, { updates: [] });

  const updates = Array.isArray(payload.updates) ? payload.updates : [];
  const filtered = serviceSlug
    ? updates.filter((item) => item.serviceSlug === serviceSlug)
    : updates;

  res.json({ updates: filtered.slice(0, 100) });
});

module.exports = router;

