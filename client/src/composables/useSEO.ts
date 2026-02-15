import { useHead } from "@vueuse/head";
import { toValue, type MaybeRefOrGetter } from "vue";

type SEOOptions = {
  title: MaybeRefOrGetter<string>;
  description: MaybeRefOrGetter<string>;
  ogImage?: MaybeRefOrGetter<string | undefined>;
  noindex?: MaybeRefOrGetter<boolean | undefined>;
};

// 페이지별 메타태그 동적 설정
export function useSEO({ title, description, ogImage, noindex = false }: SEOOptions): void {
  const currentUrl =
    typeof window !== "undefined" ? window.location.href.split("#")[0] : undefined;
  const shouldNoindex = Boolean(toValue(noindex));
  const resolvedOgImage = toValue(ogImage);

  useHead({
    title,
    link: currentUrl ? [{ rel: "canonical", href: currentUrl }] : [],
    meta: [
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      ...(currentUrl ? [{ property: "og:url", content: currentUrl }] : []),
      ...(shouldNoindex ? [{ name: "robots", content: "noindex,nofollow" }] : []),
      ...(resolvedOgImage ? [{ property: "og:image", content: resolvedOgImage }] : []),
    ],
  });
}
