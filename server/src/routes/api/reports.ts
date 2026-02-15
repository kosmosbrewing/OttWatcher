import express from "express";
import fs from "fs";
import path from "path";

const router = express.Router();

const DATA_DIR = path.join(__dirname, "../../../../data");
const REPORTS_DIR = path.join(DATA_DIR, "reports");
const CHANGELOG_FILE = path.join(REPORTS_DIR, "changelog.json");

type ReportUpdate = {
  serviceSlug?: string;
  [key: string]: unknown;
};

type ChangelogPayload = {
  updates: ReportUpdate[];
};

function readJson(filePath: string, fallback: ChangelogPayload): ChangelogPayload {
  if (!fs.existsSync(filePath)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf-8")) as ChangelogPayload;
  } catch {
    return fallback;
  }
}

router.post("/", (_req, res) => {
  res.status(410).json({
    error: "가격 제보 기능은 현재 비활성화되었습니다.",
  });
});

router.get("/logs", (req, res) => {
  const serviceSlug =
    typeof req.query.serviceSlug === "string" ? req.query.serviceSlug : "";
  const payload = readJson(CHANGELOG_FILE, { updates: [] });

  const updates = Array.isArray(payload.updates) ? payload.updates : [];
  const filtered = serviceSlug
    ? updates.filter((item) => item.serviceSlug === serviceSlug)
    : updates;

  res.json({ updates: filtered.slice(0, 100) });
});

export default router;
