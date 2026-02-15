import express from "express";
import fs from "fs";
import path from "path";
import { z } from "zod";

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

type AlertSubscription = {
  id: string;
  createdAt: string;
  status: "active";
  serviceSlug: string;
  countryCode: string;
  planId: string;
  targetPriceKrw: number;
  email: string;
};

function ensureDir(): void {
  fs.mkdirSync(ALERTS_DIR, { recursive: true });
}

function appendNdjson(filePath: string, record: AlertSubscription): void {
  ensureDir();
  fs.appendFileSync(filePath, `${JSON.stringify(record)}\n`, "utf-8");
}

router.post("/", (req, res) => {
  const parsed = alertSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: parsed.error.issues[0]?.message || "입력값이 올바르지 않습니다.",
    });
    return;
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

export default router;
