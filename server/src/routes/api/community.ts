import express from "express";
import fs from "fs";
import path from "path";
import { z } from "zod";

const router = express.Router();

const DATA_DIR = path.join(__dirname, "../../../../data");
const COMMUNITY_DIR = path.join(DATA_DIR, "community");
const POSTS_FILE = path.join(COMMUNITY_DIR, "posts.ndjson");

const slugSchema = z.string().regex(/^[a-z0-9-]+$/);
const countryCodeSchema = z.string().regex(/^[A-Za-z]{2}$/);

const postSchema = z.object({
  serviceSlug: slugSchema,
  countryCode: z.string().regex(/^(ALL|[A-Za-z]{2})$/),
  content: z.string().trim().min(2).max(300),
});

const querySchema = z.object({
  serviceSlug: slugSchema,
  countryCode: z.string().regex(/^(ALL|[A-Za-z]{2})$/).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

const NICKNAME_ADJECTIVES = [
  "빠른",
  "조용한",
  "차분한",
  "반짝이는",
  "기민한",
  "느긋한",
  "담대한",
  "영리한",
  "유쾌한",
  "단단한",
  "날카로운",
  "호기심많은",
  "재빠른",
  "귀여운",
  "성실한",
  "용감한",
  "신중한",
  "상냥한",
  "명랑한",
  "든든한",
  "부지런한",
  "섬세한",
  "강인한",
  "낙천적인",
  "엉뚱한",
  "반듯한",
  "활발한",
  "평온한",
  "근엄한",
  "재치있는",
  "따뜻한",
  "맑은",
  "청량한",
  "은은한",
  "화려한",
  "대담한",
];

const NICKNAME_NOUNS = [
  "고래",
  "여우",
  "토끼",
  "사자",
  "늑대",
  "고양이",
  "참새",
  "판다",
  "펭귄",
  "해달",
  "다람쥐",
  "올빼미",
  "수달",
  "햄스터",
  "치타",
  "독수리",
  "기린",
  "코끼리",
  "하이에나",
  "부엉이",
  "앵무새",
  "까치",
  "매",
  "두루미",
  "사슴",
  "말",
  "황소",
  "곰",
  "표범",
  "강아지",
  "해마",
  "문어",
  "돌고래",
  "나비",
  "벌",
  "오리",
];

type CommunityRecord = {
  id: string;
  createdAt: string;
  serviceSlug: string;
  countryCode: string;
  nickname: string;
  content: string;
  ip: string | null;
  userAgent: string | null;
};

function ensureDir(): void {
  fs.mkdirSync(COMMUNITY_DIR, { recursive: true });
}

function appendNdjson(filePath: string, record: CommunityRecord): void {
  ensureDir();
  fs.appendFileSync(filePath, `${JSON.stringify(record)}\n`, "utf-8");
}

function readPosts(): CommunityRecord[] {
  if (!fs.existsSync(POSTS_FILE)) return [];

  const content = fs.readFileSync(POSTS_FILE, "utf-8");
  const lines = content.split("\n").filter(Boolean);

  const posts: CommunityRecord[] = [];
  for (const line of lines) {
    try {
      posts.push(JSON.parse(line) as CommunityRecord);
    } catch {
      // 깨진 라인은 건너뜀
    }
  }

  return posts;
}

function hashString(value: string): number {
  const input = String(value || "");
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

function buildNicknameFromSeed(seed: string): string {
  const hash = hashString(seed);
  const adjective = NICKNAME_ADJECTIVES[hash % NICKNAME_ADJECTIVES.length];
  const noun =
    NICKNAME_NOUNS[
      Math.floor(hash / NICKNAME_ADJECTIVES.length) % NICKNAME_NOUNS.length
    ];
  return `${adjective} ${noun}`;
}

function createRandomNickname(): string {
  return buildNicknameFromSeed(
    `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
  );
}

router.get("/", (req, res) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({
      error: parsed.error.issues[0]?.message || "입력값이 올바르지 않습니다.",
    });
    return;
  }

  const serviceSlug = parsed.data.serviceSlug;
  const countryCode = parsed.data.countryCode?.toUpperCase();
  const limit = parsed.data.limit ?? 30;

  const filtered = readPosts()
    .filter((post) => post.serviceSlug === serviceSlug)
    .filter((post) => {
      if (!countryCode || countryCode === "ALL") return true;
      return post.countryCode === countryCode;
    })
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )
    .slice(0, limit)
    .map((post) => ({
      id: post.id,
      createdAt: post.createdAt,
      serviceSlug: post.serviceSlug,
      countryCode: post.countryCode,
      nickname:
        typeof post.nickname === "string" && post.nickname.trim()
          ? post.nickname.trim()
          : buildNicknameFromSeed(
              post.id || post.createdAt || post.content || "anonymous"
            ),
      content: post.content,
    }));

  res.json({ posts: filtered });
});

router.post("/", (req, res) => {
  const parsed = postSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({
      error: parsed.error.issues[0]?.message || "입력값이 올바르지 않습니다.",
    });
    return;
  }

  const payload = parsed.data;
  const now = new Date().toISOString();
  const id = `com_${Date.now().toString(36)}${Math.random()
    .toString(36)
    .slice(2, 8)}`;

  const normalizedCountryCode =
    payload.countryCode.toUpperCase() === "ALL"
      ? "ALL"
      : countryCodeSchema.parse(payload.countryCode).toUpperCase();

  const userAgentHeader = req.headers["user-agent"];
  const record: CommunityRecord = {
    id,
    createdAt: now,
    serviceSlug: payload.serviceSlug,
    countryCode: normalizedCountryCode,
    nickname: createRandomNickname(),
    content: payload.content.trim(),
    ip: req.ip || null,
    userAgent: typeof userAgentHeader === "string" ? userAgentHeader : null,
  };

  appendNdjson(POSTS_FILE, record);

  res.status(201).json({
    id: record.id,
    createdAt: record.createdAt,
    serviceSlug: record.serviceSlug,
    countryCode: record.countryCode,
    nickname: record.nickname,
    content: record.content,
    message: "익명 글이 등록되었습니다.",
  });
});

export default router;
