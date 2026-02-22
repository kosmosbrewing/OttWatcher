import { z } from "zod/v4";
import {
  ensureValidSlug,
  ensureValidPostId,
  normalizeCountryCode,
  isRecord,
  requestCommunityApi,
  isBrowser,
  clone,
} from "./helpers";
import type {
  JsonRecord,
  CommunityPost,
  CommunityPostResponse,
  CommunityPostsResponse,
  CommunityComment,
  CommentsResponse,
  CommunityThreadResponse,
  LikeResponse,
  PopularPostsResponse,
  CountryVotePayload,
  CountryVoteResponse,
  CountryVoteResultsResponse,
} from "./types";

// Zod 검증 스키마 — 사용자 입력 경계에서 검증
const priceAlertSchema = z.object({
  serviceSlug: z.string().regex(/^[a-z0-9-]+$/, "유효하지 않은 서비스 슬러그입니다."),
  countryCode: z.string().regex(/^[A-Za-z]{2}$/, "입력값이 올바르지 않습니다."),
  planId: z.string().min(2).max(32, "입력값이 올바르지 않습니다."),
  targetPriceKrw: z.number().int().positive("입력값이 올바르지 않습니다."),
  email: z.email("이메일 형식이 올바르지 않습니다."),
});

const communityPostSchema = z.object({
  serviceSlug: z.string().regex(/^[a-z0-9-]+$/, "유효하지 않은 서비스 슬러그입니다."),
  countryCode: z.string().default("ALL"),
  title: z.string().trim().min(2, "입력값이 올바르지 않습니다.").max(100, "입력값이 올바르지 않습니다.").optional(),
  content: z.string().min(2, "입력값이 올바르지 않습니다.").max(2000, "입력값이 올바르지 않습니다."),
});

const commentSchema = z.string().min(2, "입력값이 올바르지 않습니다.").max(300, "입력값이 올바르지 않습니다.");

const likePostIdSchema = z.string().regex(/^com_[a-z0-9]+$/, "유효하지 않은 게시글 ID입니다.");
const likeCommentIdSchema = z.string().regex(/^cmt_[a-z0-9]+$/, "유효하지 않은 댓글 ID입니다.");

const countryVoteSchema = z.object({
  serviceSlug: z.string().regex(/^[a-z0-9-]+$/, "유효하지 않은 서비스 슬러그입니다."),
  countryCode: z.string().regex(/^[A-Za-z]{2}$/, "입력값이 올바르지 않습니다."),
  allowRevote: z.boolean().optional(),
});

const ALERT_STORAGE_KEY = "ottwatcher:alerts:v1";

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

let memoryAlerts: AlertSubscription[] = [];

function readStoredAlerts(): AlertSubscription[] {
  if (!isBrowser()) return clone(memoryAlerts);

  try {
    const raw = window.localStorage.getItem(ALERT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(isRecord).map((alert) => ({
      id: typeof alert.id === "string" ? alert.id : "",
      createdAt: typeof alert.createdAt === "string" ? alert.createdAt : "",
      status: "active" as const,
      serviceSlug: typeof alert.serviceSlug === "string" ? alert.serviceSlug : "",
      countryCode:
        typeof alert.countryCode === "string"
          ? alert.countryCode.toUpperCase()
          : "",
      planId: typeof alert.planId === "string" ? alert.planId : "",
      targetPriceKrw:
        typeof alert.targetPriceKrw === "number" ? alert.targetPriceKrw : 0,
      email: typeof alert.email === "string" ? alert.email.toLowerCase() : "",
    }));
  } catch {
    return [];
  }
}

function writeStoredAlerts(alerts: AlertSubscription[]): void {
  if (!isBrowser()) {
    memoryAlerts = clone(alerts);
    return;
  }

  try {
    window.localStorage.setItem(ALERT_STORAGE_KEY, JSON.stringify(alerts));
  } catch {
    // localStorage 접근 실패 시 무시
  }
}

function normalizeCommunityPosts(value: unknown): CommunityPost[] {
  if (!isRecord(value) || !Array.isArray(value.posts)) {
    return [];
  }

  return value.posts
    .filter(isRecord)
    .map((post) => ({
      id: typeof post.id === "string" || typeof post.id === "number" ? post.id : "",
      title: typeof post.title === "string" ? post.title : "",
      nickname: typeof post.nickname === "string" ? post.nickname : "익명 유저",
      content: typeof post.content === "string" ? post.content : "",
      createdAt: typeof post.createdAt === "string" ? post.createdAt : "",
      serviceSlug: typeof post.serviceSlug === "string" ? post.serviceSlug : undefined,
      countryCode: typeof post.countryCode === "string" ? post.countryCode : undefined,
      commentCount:
        typeof post.commentCount === "number" && Number.isFinite(post.commentCount)
          ? Math.max(0, Math.floor(post.commentCount))
          : typeof post.comment_count === "number" && Number.isFinite(post.comment_count)
            ? Math.max(0, Math.floor(post.comment_count))
            : 0,
      likeCount:
        typeof post.likeCount === "number" && Number.isFinite(post.likeCount)
          ? Math.max(0, Math.floor(post.likeCount))
          : typeof post.like_count === "number" && Number.isFinite(post.like_count)
            ? Math.max(0, Math.floor(post.like_count))
            : 0,
    }))
    .filter((post) => post.id && post.content && post.createdAt)
    .map((post) => ({
      ...post,
      id: String(post.id),
    }));
}

function normalizeCommunityPost(value: unknown): CommunityPost | null {
  if (!isRecord(value) || !isRecord(value.post)) return null;
  const post = value.post;

  const normalizedId =
    typeof post.id === "string" || typeof post.id === "number" ? String(post.id) : "";
  const createdAt = typeof post.createdAt === "string" ? post.createdAt : "";
  const content = typeof post.content === "string" ? post.content : "";
  if (!normalizedId || !createdAt || !content) return null;

  return {
    id: normalizedId,
    title: typeof post.title === "string" ? post.title : "",
    nickname: typeof post.nickname === "string" ? post.nickname : "익명 유저",
    content,
    createdAt,
    serviceSlug: typeof post.serviceSlug === "string" ? post.serviceSlug : undefined,
    countryCode: typeof post.countryCode === "string" ? post.countryCode : undefined,
    likeCount:
      typeof post.likeCount === "number" && Number.isFinite(post.likeCount)
        ? Math.max(0, Math.floor(post.likeCount))
        : typeof post.like_count === "number" && Number.isFinite(post.like_count)
          ? Math.max(0, Math.floor(post.like_count))
          : 0,
  };
}

function normalizeCommunityComments(value: unknown): CommunityComment[] {
  if (!isRecord(value) || !Array.isArray(value.comments)) {
    return [];
  }

  return value.comments
    .filter(isRecord)
    .map((comment) => ({
      id:
        typeof comment.id === "string" || typeof comment.id === "number"
          ? String(comment.id)
          : "",
      postId:
        typeof comment.postId === "string" || typeof comment.post_id === "string"
          ? String(comment.postId || comment.post_id)
          : undefined,
      nickname: typeof comment.nickname === "string" ? comment.nickname : "익명 유저",
      content: typeof comment.content === "string" ? comment.content : "",
      createdAt: typeof comment.createdAt === "string" ? comment.createdAt : "",
      likeCount:
        typeof comment.likeCount === "number" && Number.isFinite(comment.likeCount)
          ? Math.max(0, Math.floor(comment.likeCount))
          : 0,
    }))
    .filter((comment) => comment.id && comment.content && comment.createdAt);
}

function normalizeCommunityThread(value: unknown): CommunityThreadResponse {
  const post = normalizeCommunityPost(value);
  const comments = normalizeCommunityComments(value);
  const hasMore = isRecord(value) && typeof value.hasMore === "boolean" ? value.hasMore : false;

  if (!post) {
    throw new Error("게시글 정보를 불러오지 못했습니다.");
  }

  return { post, comments, hasMore };
}

export async function subscribePriceAlert(payload: JsonRecord): Promise<JsonRecord> {
  const parsed = priceAlertSchema.parse({
    serviceSlug: payload.serviceSlug ?? "",
    countryCode: payload.countryCode ?? "",
    planId: typeof payload.planId === "string" ? payload.planId.trim() : "",
    targetPriceKrw:
      typeof payload.targetPriceKrw === "number"
        ? payload.targetPriceKrw
        : Number(payload.targetPriceKrw),
    email: typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "",
  });

  const id = `alt_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  const nextRecord: AlertSubscription = {
    id,
    createdAt: new Date().toISOString(),
    status: "active",
    serviceSlug: parsed.serviceSlug,
    countryCode: parsed.countryCode.toUpperCase(),
    planId: parsed.planId,
    targetPriceKrw: parsed.targetPriceKrw,
    email: parsed.email,
  };

  const stored = readStoredAlerts();
  stored.push(nextRecord);
  writeStoredAlerts(stored);

  return { id, message: "가격 하락 알림 신청이 완료되었습니다." };
}

export function fetchCommunityPosts(
  serviceSlug: string,
  countryCode = "ALL",
  limit = 30,
  options?: { skipCache?: boolean; forceRefresh?: boolean }
): Promise<CommunityPostsResponse> {
  ensureValidSlug(serviceSlug);

  const normalizedCountryCode = normalizeCountryCode(countryCode);
  const normalizedLimit = Number.isFinite(limit)
    ? Math.min(100, Math.max(1, Math.floor(limit)))
    : 30;

  const query = new URLSearchParams({
    serviceSlug,
    countryCode: normalizedCountryCode,
    limit: String(normalizedLimit),
  });

  return requestCommunityApi<CommunityPostsResponse>(`?${query.toString()}`, {
    method: "GET",
    cache: options?.skipCache || options?.forceRefresh ? "no-store" : "default",
  }).then((payload) => ({
    posts: normalizeCommunityPosts(payload),
    total:
      isRecord(payload) && typeof payload.total === "number" && Number.isFinite(payload.total)
        ? Math.max(0, Math.floor(payload.total))
        : undefined,
  }));
}

export function fetchAllCommunityPosts(
  page = 1,
  limit = 20
): Promise<CommunityPostsResponse> {
  const normalizedPage = Number.isFinite(page)
    ? Math.max(1, Math.floor(page))
    : 1;
  const normalizedLimit = Number.isFinite(limit)
    ? Math.min(50, Math.max(1, Math.floor(limit)))
    : 20;

  const query = new URLSearchParams({
    page: String(normalizedPage),
    limit: String(normalizedLimit),
  });

  return requestCommunityApi<CommunityPostsResponse>(`/all?${query.toString()}`, {
    method: "GET",
  }).then((payload) => ({
    posts: normalizeCommunityPosts(payload),
    hasMore: isRecord(payload) && typeof payload.hasMore === "boolean" ? payload.hasMore : undefined,
  }));
}

export async function fetchCommunityPost(postId: string): Promise<CommunityPostResponse> {
  ensureValidPostId(postId);

  const payload = await requestCommunityApi<CommunityPostResponse>(`/${postId}`, {
    method: "GET",
    cache: "no-store",
  });

  const normalizedPost = normalizeCommunityPost(payload);
  if (!normalizedPost) {
    throw new Error("게시글 정보를 불러오지 못했습니다.");
  }

  return { post: normalizedPost };
}

export async function fetchPostComments(
  postId: string,
  limit = 100,
  options?: { skipCache?: boolean; forceRefresh?: boolean; sort?: "asc" | "desc"; offset?: number }
): Promise<CommentsResponse> {
  ensureValidPostId(postId);

  const normalizedLimit = Number.isFinite(limit)
    ? Math.min(100, Math.max(1, Math.floor(limit)))
    : 100;

  const query = new URLSearchParams({
    limit: String(normalizedLimit),
    sort: options?.sort === "desc" ? "desc" : "asc",
  });
  if (typeof options?.offset === "number" && Number.isFinite(options.offset) && options.offset > 0) {
    query.set("offset", String(Math.floor(options.offset)));
  }

  const payload = await requestCommunityApi<CommentsResponse>(
    `/${postId}/comments?${query.toString()}`,
    {
      method: "GET",
      cache: options?.skipCache || options?.forceRefresh ? "no-store" : "default",
    }
  );

  return { comments: normalizeCommunityComments(payload) };
}

export async function fetchCommunityThread(
  postId: string,
  options?: { limit?: number; skipCache?: boolean; forceRefresh?: boolean; sort?: "asc" | "desc" }
): Promise<CommunityThreadResponse> {
  ensureValidPostId(postId);

  const requestedLimit =
    typeof options?.limit === "number" && Number.isFinite(options.limit)
      ? options.limit
      : 30;
  const normalizedLimit = Math.min(100, Math.max(1, Math.floor(requestedLimit)));

  const query = new URLSearchParams({
    limit: String(normalizedLimit),
    sort: options?.sort === "desc" ? "desc" : "asc",
  });

  const payload = await requestCommunityApi<CommunityThreadResponse>(
    `/${postId}/thread?${query.toString()}`,
    {
      method: "GET",
      cache: options?.skipCache || options?.forceRefresh ? "no-store" : "default",
    }
  );

  return normalizeCommunityThread(payload);
}

export async function submitComment(postId: string, content: string): Promise<CommunityComment> {
  ensureValidPostId(postId);

  const trimmed = commentSchema.parse(content.trim());

  const payload = await requestCommunityApi<JsonRecord>(`/${postId}/comments`, {
    method: "POST",
    body: JSON.stringify({ content: trimmed }),
  });

  const normalized = normalizeCommunityComments({ comments: [payload] })[0];
  if (!normalized) {
    throw new Error("댓글 정보를 처리하지 못했습니다.");
  }

  return normalized;
}

export async function submitCommunityPost(payload: JsonRecord): Promise<JsonRecord> {
  const parsed = communityPostSchema.parse({
    serviceSlug: payload.serviceSlug ?? "",
    countryCode: payload.countryCode ?? "ALL",
    title: typeof payload.title === "string" ? payload.title.trim() : undefined,
    content: typeof payload.content === "string" ? payload.content.trim() : "",
  });

  const countryCode = normalizeCountryCode(parsed.countryCode);
  return requestCommunityApi<JsonRecord>("", {
    method: "POST",
    body: JSON.stringify({
      serviceSlug: parsed.serviceSlug,
      countryCode,
      title: parsed.title,
      content: parsed.content,
    }),
  });
}

export async function togglePostLike(postId: string): Promise<LikeResponse> {
  const validId = likePostIdSchema.parse(postId);

  const payload = await requestCommunityApi<LikeResponse>(`/${validId}/like`, {
    method: "POST",
  });

  return {
    liked: typeof payload.liked === "boolean" ? payload.liked : false,
    likeCount:
      typeof payload.likeCount === "number" && Number.isFinite(payload.likeCount)
        ? Math.max(0, Math.floor(payload.likeCount))
        : 0,
  };
}

export async function toggleCommentLike(
  postId: string,
  commentId: string
): Promise<LikeResponse> {
  ensureValidPostId(postId);
  const validCommentId = likeCommentIdSchema.parse(commentId);

  const payload = await requestCommunityApi<LikeResponse>(
    `/${postId}/comments/${validCommentId}/like`,
    { method: "POST" }
  );

  return {
    liked: typeof payload.liked === "boolean" ? payload.liked : false,
    likeCount:
      typeof payload.likeCount === "number" && Number.isFinite(payload.likeCount)
        ? Math.max(0, Math.floor(payload.likeCount))
        : 0,
  };
}

export function fetchPopularPosts(
  serviceSlug: string,
  limit = 5
): Promise<PopularPostsResponse> {
  ensureValidSlug(serviceSlug);

  const normalizedLimit = Number.isFinite(limit)
    ? Math.min(30, Math.max(1, Math.floor(limit)))
    : 5;

  const query = new URLSearchParams({
    serviceSlug,
    limit: String(normalizedLimit),
  });

  return requestCommunityApi<PopularPostsResponse>(`/popular?${query.toString()}`, {
    method: "GET",
    cache: "no-cache",
  }).then((payload) => ({ posts: normalizeCommunityPosts(payload) }));
}

export async function submitCountryVote(
  payload: CountryVotePayload
): Promise<CountryVoteResponse> {
  const parsed = countryVoteSchema.parse(payload);

  const body: {
    serviceSlug: string;
    countryCode: string;
    allowRevote?: boolean;
  } = {
    serviceSlug: parsed.serviceSlug,
    countryCode: parsed.countryCode.toUpperCase(),
  };

  if (parsed.allowRevote) {
    body.allowRevote = true;
  }

  const result = await requestCommunityApi<CountryVoteResponse>("/vote", {
    method: "POST",
    body: JSON.stringify(body),
  });

  return {
    voted: typeof result.voted === "boolean" ? result.voted : true,
    countryCode: typeof result.countryCode === "string" ? result.countryCode : parsed.countryCode,
    revoted: typeof result.revoted === "boolean" ? result.revoted : undefined,
  };
}

export async function fetchVoteResults(
  serviceSlug: string
): Promise<CountryVoteResultsResponse> {
  ensureValidSlug(serviceSlug);

  const query = new URLSearchParams({ serviceSlug });

  const payload = await requestCommunityApi<CountryVoteResultsResponse>(
    `/vote/results?${query.toString()}`,
    { method: "GET", cache: "no-cache" }
  );

  const results = Array.isArray(payload.results)
    ? payload.results.filter(isRecord).map((r) => ({
        countryCode: typeof r.countryCode === "string" ? r.countryCode : "",
        country: typeof r.country === "string" ? r.country : "",
        voteCount:
          typeof r.voteCount === "number" && Number.isFinite(r.voteCount)
            ? Math.max(0, Math.floor(r.voteCount))
            : 0,
      }))
    : [];

  return {
    results,
    totalVotes:
      typeof payload.totalVotes === "number" && Number.isFinite(payload.totalVotes)
        ? payload.totalVotes
        : results.reduce((sum, r) => sum + r.voteCount, 0),
  };
}
