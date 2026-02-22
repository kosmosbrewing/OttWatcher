import { ref } from "vue";
import { fetchAllCommunityPosts, type CommunityPost } from "@/api";

const DEFAULT_LIMIT = 20;

export function useCommunityList(limit = DEFAULT_LIMIT) {
  const posts = ref<CommunityPost[]>([]);
  const loading = ref(false);
  const error = ref("");
  const page = ref(1);
  const hasMore = ref(true);
  const total = ref<number | undefined>(undefined);

  const normalizedLimit = Number.isFinite(limit)
    ? Math.min(50, Math.max(1, Math.floor(limit)))
    : DEFAULT_LIMIT;

  async function loadPage(targetPage: number, reset = false): Promise<void> {
    if (loading.value) return;

    loading.value = true;
    error.value = "";
    try {
      const response = await fetchAllCommunityPosts(targetPage, normalizedLimit);
      const nextPosts = Array.isArray(response.posts) ? response.posts : [];

      posts.value = reset ? nextPosts : [...posts.value, ...nextPosts];
      page.value = targetPage;
      total.value = response.total;

      if (typeof response.total === "number") {
        hasMore.value = posts.value.length < response.total;
      } else {
        hasMore.value = nextPosts.length >= normalizedLimit;
      }
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : "커뮤니티 글을 불러오지 못했습니다.";
    } finally {
      loading.value = false;
    }
  }

  async function refresh(): Promise<void> {
    hasMore.value = true;
    total.value = undefined;
    await loadPage(1, true);
  }

  async function loadMore(): Promise<void> {
    if (!hasMore.value || loading.value) return;
    await loadPage(page.value + 1);
  }

  return {
    posts,
    loading,
    error,
    page,
    hasMore,
    total,
    refresh,
    loadMore,
  };
}
