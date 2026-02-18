import { apiCache, cachePolicies, type CachePolicy, NEVER_CACHE_PATTERNS } from "./apiCache";

const API_BASE = (import.meta.env.VITE_OTTWATCHER_API_BASE || "/api/ottwatcher").replace(
  /\/+$/,
  ""
);

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

function cacheKey(pathname: string, method: string): string {
  return `${method.toUpperCase()} ${pathname}`;
}

function shouldNeverCache(pathname: string): boolean {
  return NEVER_CACHE_PATTERNS.some((pattern) => pattern.test(pathname));
}

function parseErrorMessage(payload: unknown, fallback = "요청 처리 중 오류가 발생했습니다."): string {
  if (!payload || typeof payload !== "object") return fallback;

  const record = payload as Record<string, unknown>;
  if (typeof record.error === "string" && record.error.trim()) return record.error;
  if (typeof record.message === "string" && record.message.trim()) return record.message;
  return fallback;
}

type ApiRequestOptions = RequestInit & {
  cachePolicy?: CachePolicy;
  skipCache?: boolean;
};

export async function apiRequest<T>(
  pathname: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const {
    cachePolicy = "noCache",
    skipCache = false,
    headers,
    ...fetchOptions
  } = options;

  const method = (fetchOptions.method || "GET").toUpperCase();
  const policy = cachePolicy;
  const maxAge = cachePolicies[policy].maxAge;
  const key = cacheKey(pathname, method);

  if (method === "GET" && !skipCache && !shouldNeverCache(pathname)) {
    const cached = apiCache.get<T>(key, maxAge);
    if (cached != null) return cached;
  }

  const response = await fetch(`${API_BASE}${pathname}`, {
    ...fetchOptions,
    method,
    credentials: fetchOptions.credentials || "include",
    headers: {
      ...(fetchOptions.body ? { "Content-Type": "application/json" } : {}),
      ...(headers || {}),
    },
  });

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text) as unknown;
    } catch {
      payload = { message: text };
    }
  }

  if (!response.ok) {
    throw new ApiError(response.status, parseErrorMessage(payload));
  }

  const data = (payload as T) ?? ({} as T);

  if (method === "GET" && !shouldNeverCache(pathname) && maxAge > 0) {
    apiCache.set(key, data);
  }

  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    apiCache.invalidate(/^GET \/(services|prices|trends|continents)/);
    apiCache.invalidate(/^GET \/community/);
  }

  return data;
}

export function clearApiCache(): void {
  apiCache.clear();
}
