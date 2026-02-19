<script setup lang="ts">
import { ref, watch } from "vue";
import { fetchCommunityPosts, submitCommunityPost, type CommunityPost } from "@/api";
import { LoadingSpinner } from "@/components/ui/loading";

const props = defineProps<{
  serviceSlug: string;
}>();

const COMMUNITY_SERVICE_SLUG =
  import.meta.env.VITE_COMMUNITY_SERVICE_SLUG || "global-community";

const posts = ref<CommunityPost[]>([]);
const loading = ref(false);
const submitting = ref(false);
const error = ref("");
const formError = ref("");
const content = ref("");

function formatTime(iso: string | undefined): string {
  if (!iso) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

async function loadPosts(forceRefresh = false): Promise<void> {
  loading.value = true;
  error.value = "";
  try {
    const response = await fetchCommunityPosts(COMMUNITY_SERVICE_SLUG, "ALL", 30, {
      skipCache: forceRefresh,
      forceRefresh,
    });
    posts.value = Array.isArray(response.posts) ? response.posts : [];
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : "커뮤니티 글을 불러오지 못했습니다.";
  } finally {
    loading.value = false;
  }
}

async function onSubmit(): Promise<void> {
  formError.value = "";
  const trimmed = content.value.trim();

  if (trimmed.length < 2) {
    formError.value = "내용을 2자 이상 입력해 주세요.";
    return;
  }

  submitting.value = true;
  try {
    await submitCommunityPost({
      serviceSlug: COMMUNITY_SERVICE_SLUG,
      countryCode: "ALL",
      content: trimmed,
    });
    content.value = "";
    await loadPosts(true);
  } catch (e: unknown) {
    formError.value = e instanceof Error ? e.message : "등록 중 오류가 발생했습니다.";
  } finally {
    submitting.value = false;
  }
}

watch(
  () => props.serviceSlug,
  () => {
    loadPosts();
  },
  { immediate: true }
);
</script>

<template>
  <aside class="retro-panel overflow-hidden lg:sticky lg:top-20 lg:self-start">
    <div class="retro-panel-content space-y-2.5">
      <div class="max-h-[420px] overflow-y-auto pr-1">
        <LoadingSpinner v-if="loading" variant="dots" size="sm" :center="false" />
        <p v-else-if="error" class="!text-xs text-destructive">{{ error }}</p>
        <ul v-else-if="posts.length > 0" class="divide-y divide-border/60">
          <li
            v-for="post in posts"
            :key="post.id"
            class="py-1.5"
          >
            <div class="flex items-center gap-1.5 !text-[11px] text-muted-foreground">
              <span class="!text-xs font-semibold text-foreground">{{ post.nickname || "익명 유저" }}</span>
              <span>·</span>
              <span>{{ formatTime(post.createdAt) }}</span>
            </div>
            <p class="mt-0.5 whitespace-pre-line !text-xs leading-4 text-foreground">
              {{ post.content }}
            </p>
          </li>
        </ul>
        <p v-else class="!text-xs text-muted-foreground">
          아직 등록된 글이 없습니다.
        </p>
      </div>

      <form class="space-y-1.5 border-t border-border/60 pt-2.5" @submit.prevent="onSubmit">
        <label for="anonymous-post" class="!text-xs font-medium text-muted-foreground">
          익명 글쓰기
        </label>
        <textarea
          id="anonymous-post"
          v-model="content"
          rows="3"
          maxlength="300"
          class="w-full rounded-none border border-border/70 bg-transparent px-2 py-1.5 !text-xs leading-4 placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-0"
          placeholder="가격 체감, 우회 결제 경험, 변경 제보 등을 익명으로 남겨주세요."
        />
        <div class="flex items-center justify-between">
          <span class="!text-[11px] text-muted-foreground">{{ content.length }}/300</span>
          <button
            type="submit"
            class="retro-button-subtle !px-1.5 !py-0.5 !text-xs"
            :disabled="submitting"
          >
            {{ submitting ? "등록 중..." : "등록" }}
          </button>
        </div>
        <p v-if="formError" class="!text-xs text-destructive">{{ formError }}</p>
      </form>
    </div>
  </aside>
</template>
