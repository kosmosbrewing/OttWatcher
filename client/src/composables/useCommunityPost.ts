import { ref, toValue, watch, type MaybeRefOrGetter } from "vue";
import {
  fetchCommunityThread,
  fetchPostComments,
  submitComment,
  type CommunityComment,
  type CommunityPost,
} from "@/api";

const INITIAL_COMMENT_LIMIT = 30;
const COMMENT_PAGE_SIZE = 30;

export function useCommunityPost(postIdSource: MaybeRefOrGetter<string>) {
  const post = ref<CommunityPost | null>(null);
  const comments = ref<CommunityComment[]>([]);
  const loading = ref(false);
  const loadingMore = ref(false);
  const hasMoreComments = ref(false);
  const error = ref("");
  const submitting = ref(false);
  const formError = ref("");

  function appendUniqueComments(nextComments: CommunityComment[]): void {
    if (nextComments.length === 0) return;

    const existingIds = new Set(comments.value.map((item) => item.id));
    const merged = comments.value.slice();
    for (const item of nextComments) {
      if (!item.id || existingIds.has(item.id)) continue;
      existingIds.add(item.id);
      merged.push(item);
    }
    comments.value = merged;
  }

  async function loadAll(options?: { forceRefresh?: boolean }): Promise<void> {
    const postId = toValue(postIdSource);
    if (!postId) {
      post.value = null;
      comments.value = [];
      hasMoreComments.value = false;
      error.value = "게시글 ID가 올바르지 않습니다.";
      return;
    }

    loading.value = true;
    error.value = "";

    try {
      const thread = await fetchCommunityThread(postId, {
        limit: INITIAL_COMMENT_LIMIT,
        forceRefresh: options?.forceRefresh,
        sort: "asc",
      });
      post.value = thread.post;
      comments.value = thread.comments;
      hasMoreComments.value = thread.hasMore;
    } catch (e: unknown) {
      post.value = null;
      comments.value = [];
      hasMoreComments.value = false;
      error.value = e instanceof Error ? e.message : "게시글을 불러오지 못했습니다.";
    } finally {
      loading.value = false;
    }
  }

  async function loadMoreComments(): Promise<void> {
    const postId = toValue(postIdSource);
    if (!postId || loading.value || loadingMore.value || !hasMoreComments.value) {
      return;
    }

    loadingMore.value = true;
    try {
      const response = await fetchPostComments(postId, COMMENT_PAGE_SIZE + 1, {
        forceRefresh: true,
        sort: "asc",
        offset: comments.value.length,
      });

      const nextBatch = response.comments.slice(0, COMMENT_PAGE_SIZE);
      appendUniqueComments(nextBatch);
      hasMoreComments.value = response.comments.length > COMMENT_PAGE_SIZE;
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : "댓글을 더 불러오지 못했습니다.";
    } finally {
      loadingMore.value = false;
    }
  }

  async function onSubmit(content: string): Promise<boolean> {
    formError.value = "";
    const trimmed = content.trim();

    if (trimmed.length < 2 || trimmed.length > 300) {
      formError.value = "댓글은 2자 이상 300자 이하로 입력해 주세요.";
      return false;
    }

    const postId = toValue(postIdSource);
    if (!postId) {
      formError.value = "게시글 ID가 올바르지 않습니다.";
      return false;
    }

    submitting.value = true;
    const optimisticId = `tmp_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
    const optimisticComment: CommunityComment = {
      id: optimisticId,
      postId,
      nickname: "익명 유저",
      content: trimmed,
      createdAt: new Date().toISOString(),
    };
    comments.value = [...comments.value, optimisticComment];

    try {
      const persisted = await submitComment(postId, trimmed);
      comments.value = comments.value.map((item) =>
        item.id === optimisticId
          ? {
              ...persisted,
              postId: persisted.postId || postId,
            }
          : item
      );
      return true;
    } catch (e: unknown) {
      comments.value = comments.value.filter((item) => item.id !== optimisticId);
      formError.value = e instanceof Error ? e.message : "댓글 등록 중 오류가 발생했습니다.";
      return false;
    } finally {
      submitting.value = false;
    }
  }

  watch(
    () => toValue(postIdSource),
    async () => {
      if (loading.value) return;
      try {
        await loadAll();
      } catch {
        // error ref는 loadAll 내부에서 처리됨
      }
    },
    { immediate: true }
  );

  return {
    post,
    comments,
    loading,
    error,
    submitting,
    formError,
    loadingMore,
    hasMoreComments,
    loadAll,
    loadMoreComments,
    onSubmit,
  };
}
