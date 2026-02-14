const express = require("express");
const fs = require("fs");
const path = require("path");
const { z } = require("zod");

const router = express.Router();

const DATA_DIR = path.join(__dirname, "../../../../data");
const ALERTS_DIR = path.join(DATA_DIR, "alerts");
const SUBSCRIPTIONS_FILE = path.join(ALERTS_DIR, "subscriptions.ndjson");

const alertSchema = z.object({
  serviceSlug: z.string().regex(/^[a-z0-9-]+$/),
  countryCode: z.string().regex(/^[A-Za-z]{2}$/),
  planId: z.string().min(2).max(32),
  targetPriceKrw: z.coerce.number().int().positive(),
  email: z.string().email(),
});

function ensureDir() {
  fs.mkdirSync(ALERTS_DIR, { recursive: true });
}

function appendNdjson(filePath, record) {
  ensureDir();
  fs.appendFileSync(filePath, `${JSON.stringify(record)}\n`, "utf-8");
}

router.post("/", (req, res) => {
  const parsed = alertSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      error: parsed.error.issues[0]?.message || "입력값이 올바르지 않습니다.",
    });
  }

  const payload = parsed.data;
  const now = new Date().toISOString();
  const id = `alt_${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 8)}`;

  appendNdjson(SUBSCRIPTIONS_FILE, {
    id,
    createdAt: now,
    status: "active",
    serviceSlug: payload.serviceSlug,
    countryCode: payload.countryCode.toUpperCase(),
    planId: payload.planId,
    targetPriceKrw: payload.targetPriceKrw,
    email: payload.email.toLowerCase(),
  });

  res.status(201).json({
    id,
    message: "가격 하락 알림(베타) 신청이 완료되었습니다.",
  });
});

module.exports = router;

