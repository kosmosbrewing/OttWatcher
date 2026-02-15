import express from "express";
import fs from "fs";
import path from "path";
import { z } from "zod";
import type { PricesPayload } from "../../types";

const router = express.Router();

const DATA_DIR = path.join(__dirname, "../../../../data");

// 입력 검증: slug는 영문 소문자, 숫자, 하이픈만 허용
const slugSchema = z
  .string()
  .regex(/^[a-z0-9-]+$/, "유효하지 않은 서비스 슬러그입니다.");

// slug별 모듈 레벨 캐시 - Object.prototype 상속 방지 (constructor 등)
const pricesCache: Record<string, PricesPayload> = Object.create(null);

// GET /api/prices/:serviceSlug - 서비스별 가격 데이터 반환
router.get("/:serviceSlug", (req, res) => {
  const result = slugSchema.safeParse(req.params.serviceSlug);

  if (!result.success) {
    res.status(400).json({ error: result.error.issues[0].message });
    return;
  }

  const slug = result.data;

  if (!pricesCache[slug]) {
    const filePath = path.join(DATA_DIR, "prices", `${slug}.json`);
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: "해당 서비스의 가격 데이터를 찾을 수 없습니다." });
      return;
    }
    pricesCache[slug] = JSON.parse(fs.readFileSync(filePath, "utf-8")) as PricesPayload;
  }

  res.json(pricesCache[slug]);
});

export default router;
