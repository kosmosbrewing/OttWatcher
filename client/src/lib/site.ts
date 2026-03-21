export const DEFAULT_SITE_URL = "https://shakilabs.com/ott";

/** 후행 슬래시 제거 */
function trimTrailingSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

/** 정규 사이트 URL (환경변수 또는 기본값) */
export function getCanonicalSiteUrl(): string {
  return trimTrailingSlash(DEFAULT_SITE_URL);
}

/**
 * 브라우저 환경에서는 origin + base path 조합,
 * SSR/빌드 환경에서는 정규 URL 반환
 */
export function getSiteUrl(): string {
  if (typeof window !== "undefined" && window.location.origin) {
    const basePath = new URL(getCanonicalSiteUrl()).pathname.replace(/\/+$/, "");
    return trimTrailingSlash(`${window.location.origin}${basePath}`);
  }
  return getCanonicalSiteUrl();
}
