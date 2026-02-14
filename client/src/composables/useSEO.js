import { useHead } from "@vueuse/head";

// 페이지별 메타태그 동적 설정
export function useSEO({ title, description, ogImage, noindex = false }) {
  const currentUrl =
    typeof window !== "undefined" ? window.location.href.split("#")[0] : undefined;

  useHead({
    title,
    link: currentUrl ? [{ rel: "canonical", href: currentUrl }] : [],
    meta: [
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      ...(currentUrl ? [{ property: "og:url", content: currentUrl }] : []),
      ...(noindex ? [{ name: "robots", content: "noindex,nofollow" }] : []),
      ...(ogImage ? [{ property: "og:image", content: ogImage }] : []),
    ],
  });
}
