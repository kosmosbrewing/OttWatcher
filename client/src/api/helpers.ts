/** API 내부 공통 유틸리티 */

const SLUG_PATTERN = /^[a-z0-9-]+$/;
const COUNTRY_CODE_PATTERN = /^[A-Za-z]{2}$/;
const POST_ID_PATTERN = /^com_[a-z0-9]+$/;

export const API_BASE = (
  import.meta.env.VITE_OTTWATCHER_API_BASE || "/api/ottwatcher"
).replace(/\/+$/, "");

export const COMMUNITY_API_TIMEOUT_MS = 10_000;

export function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object";
}

export function getNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function ensureValidSlug(serviceSlug: string): void {
  if (!SLUG_PATTERN.test(serviceSlug)) {
    throw new Error("유효하지 않은 서비스 슬러그입니다.");
  }
}

export function ensureValidPostId(postId: string): void {
  if (!POST_ID_PATTERN.test(postId)) {
    throw new Error("유효하지 않은 게시글 ID입니다.");
  }
}

export function normalizeCountryCode(value: string): string {
  const normalized = value.toUpperCase();
  if (normalized === "ALL") return normalized;
  if (!COUNTRY_CODE_PATTERN.test(normalized)) {
    throw new Error("입력값이 올바르지 않습니다.");
  }
  return normalized;
}

export function extractApiErrorMessage(payload: unknown): string | null {
  if (!isRecord(payload)) return null;
  if (typeof payload.error === "string" && payload.error.trim()) return payload.error;
  if (typeof payload.message === "string" && payload.message.trim()) return payload.message;
  return null;
}

export async function requestCommunityApi<T>(
  path: string,
  init: RequestInit
): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), COMMUNITY_API_TIMEOUT_MS);

  try {
    const response = await fetch(`${API_BASE}/community${path}`, {
      ...init,
      headers,
      credentials: "include",
      signal: controller.signal,
    });

    let payload: unknown = null;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    if (!response.ok) {
      throw new Error(
        extractApiErrorMessage(payload) || "커뮤니티 요청 처리 중 오류가 발생했습니다."
      );
    }

    return payload as T;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("요청 시간이 초과되었습니다.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
