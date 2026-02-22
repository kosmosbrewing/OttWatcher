import { ref, type Ref } from "vue";
import { togglePostLike } from "@/api";

const STORAGE_KEY = "ottwatcher:likes:v1";

function readLikedSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((v): v is string => typeof v === "string"));
  } catch {
    return new Set();
  }
}

function writeLikedSet(set: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
  } catch {
    // localStorage 접근 실패 시 무시
  }
}

/** 목록 렌더링에서 liked 여부 확인용 헬퍼 */
export function isPostLiked(postId: string): boolean {
  return readLikedSet().has(postId);
}

/**
 * 게시글 좋아요 토글 composable
 * 낙관적 UI: 즉시 카운트 변경 → API → 서버 응답 동기화 → 실패 시 롤백
 */
export function useLike(postId: Ref<string>, initialCount = 0) {
  const likedSet = readLikedSet();
  const liked = ref(likedSet.has(postId.value));
  const likeCount = ref(initialCount);
  const toggling = ref(false);

  async function toggle(): Promise<void> {
    if (toggling.value || !postId.value) return;

    toggling.value = true;

    // 낙관적 업데이트
    const prevLiked = liked.value;
    const prevCount = likeCount.value;
    liked.value = !prevLiked;
    likeCount.value = prevLiked
      ? Math.max(0, prevCount - 1)
      : prevCount + 1;

    // localStorage 즉시 반영
    const set = readLikedSet();
    if (liked.value) {
      set.add(postId.value);
    } else {
      set.delete(postId.value);
    }
    writeLikedSet(set);

    try {
      const result = await togglePostLike(postId.value);
      // 서버 응답으로 동기화
      liked.value = result.liked;
      likeCount.value = result.likeCount;

      // localStorage를 서버 상태와 동기화
      const freshSet = readLikedSet();
      if (result.liked) {
        freshSet.add(postId.value);
      } else {
        freshSet.delete(postId.value);
      }
      writeLikedSet(freshSet);
    } catch {
      // 롤백
      liked.value = prevLiked;
      likeCount.value = prevCount;

      const rollbackSet = readLikedSet();
      if (prevLiked) {
        rollbackSet.add(postId.value);
      } else {
        rollbackSet.delete(postId.value);
      }
      writeLikedSet(rollbackSet);
    } finally {
      toggling.value = false;
    }
  }

  return { liked, likeCount, toggling, toggle };
}
