import { ref, type Ref } from "vue";
import { z } from "zod";
import { togglePostLike } from "@/api";

const STORAGE_KEY = "ottwatcher:likes:v1";

// 백엔드에서 postId 형식을 검증하므로 클라이언트는 기본 타입만 검증
const likedSetSchema = z.array(z.string().max(128));

function readLikedSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    const result = likedSetSchema.safeParse(parsed);
    if (!result.success) return new Set();
    return new Set(result.data);
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

    // 비동기 구간에서 postId가 바뀌어도 올바른 ID를 사용하도록 스냅샷
    const currentId = postId.value;
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
      set.add(currentId);
    } else {
      set.delete(currentId);
    }
    writeLikedSet(set);

    try {
      const result = await togglePostLike(currentId);
      // 서버 응답으로 동기화
      liked.value = result.liked;
      likeCount.value = result.likeCount;

      // localStorage를 서버 상태와 동기화
      const freshSet = readLikedSet();
      if (result.liked) {
        freshSet.add(currentId);
      } else {
        freshSet.delete(currentId);
      }
      writeLikedSet(freshSet);
    } catch {
      // 롤백
      liked.value = prevLiked;
      likeCount.value = prevCount;

      const rollbackSet = readLikedSet();
      if (prevLiked) {
        rollbackSet.add(currentId);
      } else {
        rollbackSet.delete(currentId);
      }
      writeLikedSet(rollbackSet);
    } finally {
      toggling.value = false;
    }
  }

  return { liked, likeCount, toggling, toggle };
}
