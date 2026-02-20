import { useHead } from "@vueuse/head";
import { toValue, type MaybeRefOrGetter } from "vue";

type SEOOptions = {
  title: MaybeRefOrGetter<string>;
  description: MaybeRefOrGetter<string>;
  ogImage?: MaybeRefOrGetter<string | undefined>;
  noindex?: MaybeRefOrGetter<boolean | undefined>;
  jsonLd?: MaybeRefOrGetter<Record<string, unknown> | undefined>;
};

// 페이지별 메타태그 동적 설정
export function useSEO({
  title,
  description,
  ogImage,
  noindex = false,
  jsonLd,
}: SEOOptions): void {
  useHead(() => {
    const resolvedTitle = toValue(title);
    const resolvedDescription = toValue(description);
    const resolvedNoindex = Boolean(toValue(noindex));
    const resolvedOgImage = toValue(ogImage);
    const resolvedJsonLd = toValue(jsonLd);
    const currentUrl =
      typeof window !== "undefined" ? window.location.href.split("#")[0] : undefined;

    return {
      title: resolvedTitle,
      link: currentUrl ? [{ rel: "canonical", href: currentUrl }] : [],
      meta: [
        { name: "description", content: resolvedDescription },
        { property: "og:title", content: resolvedTitle },
        { property: "og:description", content: resolvedDescription },
        ...(currentUrl ? [{ property: "og:url", content: currentUrl }] : []),
        ...(resolvedNoindex ? [{ name: "robots", content: "noindex,nofollow" }] : []),
        ...(resolvedOgImage ? [{ property: "og:image", content: resolvedOgImage }] : []),
      ],
      script: resolvedJsonLd
        ? [
            {
              key: "json-ld",
              type: "application/ld+json",
              children: JSON.stringify(resolvedJsonLd),
            },
          ]
        : [],
    };
  });
}
