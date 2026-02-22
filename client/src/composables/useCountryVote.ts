import { ref, computed, type Ref } from "vue";
import { z } from "zod";
import { submitCountryVote, fetchVoteResults, type CountryVoteResult } from "@/api";

const STORAGE_KEY = "ottwatcher:countryVote:v1";

// serviceSlug: 영소문자·숫자·하이픈만 허용, countryCode: 대문자 알파벳 2자리
const voteMapSchema = z.record(
  z.string().regex(/^[a-z0-9-]+$/),
  z.string().regex(/^[A-Z]{2}$/)
);

/** localStorage에 서비스별 투표한 국가 코드 저장 */
function readVoteMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    const result = voteMapSchema.safeParse(parsed);
    if (!result.success) return {};
    return result.data;
  } catch {
    return {};
  }
}

function writeVoteMap(map: Record<string, string>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // localStorage 접근 실패 시 무시
  }
}

export function useCountryVote(serviceSlug: Ref<string>) {
  const results = ref<CountryVoteResult[]>([]);
  const totalVotes = ref(0);
  const hasVoted = ref(false);
  const votedCountry = ref("");
  const loading = ref(false);
  const voting = ref(false);
  const error = ref("");

  // 득표순 정렬
  const sortedResults = computed(() =>
    [...results.value].sort((a, b) => b.voteCount - a.voteCount)
  );

  // 바 차트 비율 계산용
  const maxVoteCount = computed(() => {
    if (!sortedResults.value.length) return 0;
    return sortedResults.value[0].voteCount;
  });

  function checkLocalVote(): void {
    const map = readVoteMap();
    const voted = map[serviceSlug.value];
    if (voted) {
      hasVoted.value = true;
      votedCountry.value = voted;
    } else {
      hasVoted.value = false;
      votedCountry.value = "";
    }
  }

  async function loadResults(): Promise<void> {
    if (!serviceSlug.value) return;
    loading.value = true;
    error.value = "";
    try {
      const data = await fetchVoteResults(serviceSlug.value);
      results.value = data.results;
      totalVotes.value = data.totalVotes;
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : "투표 결과를 불러오지 못했습니다.";
    } finally {
      loading.value = false;
    }
    checkLocalVote();
  }

  async function vote(
    countryCode: string,
    options?: { allowRevote?: boolean }
  ): Promise<boolean> {
    const allowRevote = options?.allowRevote === true;
    if (voting.value || !serviceSlug.value || (hasVoted.value && !allowRevote)) {
      return false;
    }

    voting.value = true;
    error.value = "";
    try {
      await submitCountryVote({
        serviceSlug: serviceSlug.value,
        countryCode,
        allowRevote,
      });

      // localStorage에 투표 기록
      const map = readVoteMap();
      map[serviceSlug.value] = countryCode.toUpperCase();
      writeVoteMap(map);

      hasVoted.value = true;
      votedCountry.value = countryCode.toUpperCase();

      // 투표 후 결과 자동 갱신
      await loadResults();
      return true;
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : "투표 처리 중 오류가 발생했습니다.";
      return false;
    } finally {
      voting.value = false;
    }
  }

  return {
    results,
    sortedResults,
    totalVotes,
    maxVoteCount,
    hasVoted,
    votedCountry,
    loading,
    voting,
    error,
    vote,
    loadResults,
  };
}
