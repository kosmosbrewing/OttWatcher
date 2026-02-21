/**
 * 빌드 후처리: dist/sitemap.xml의 <lastmod>를 빌드 날짜(YYYY-MM-DD)로 일괄 치환
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SITEMAP_PATH = path.resolve(__dirname, "../dist/sitemap.xml");

function main() {
  if (!fs.existsSync(SITEMAP_PATH)) {
    process.stdout.write("[update-sitemap] dist/sitemap.xml not found, skipping.\n");
    return;
  }

  const today = new Date().toISOString().slice(0, 10);
  const original = fs.readFileSync(SITEMAP_PATH, "utf-8");
  const updated = original.replace(
    /<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/g,
    `<lastmod>${today}</lastmod>`
  );

  fs.writeFileSync(SITEMAP_PATH, updated, "utf-8");
  process.stdout.write(`[update-sitemap] lastmod updated to ${today}\n`);
}

main();
