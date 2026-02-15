import express from "express";
import fs from "fs";
import path from "path";
import type { ServicesPayload } from "../../types";

const router = express.Router();

const DATA_DIR = path.join(__dirname, "../../../../data");

// 모듈 레벨 캐시 - 서버 재시작 전까지 유지
let cache: ServicesPayload | null = null;

// GET /api/services - 활성화된 서비스 목록 반환
router.get("/", (_req, res) => {
  if (!cache) {
    const filePath = path.join(DATA_DIR, "services.json");
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: "서비스 데이터를 찾을 수 없습니다." });
      return;
    }
    cache = JSON.parse(fs.readFileSync(filePath, "utf-8")) as ServicesPayload;
  }
  res.json(cache);
});

export default router;
