<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter, RouterLink } from "vue-router";
import { useCommunityPost } from "@/composables/useCommunityPost";
import { useSEO } from "@/composables/useSEO";
import { LoadingSpinner } from "@/components/ui/loading";

const route = useRoute();
const router = useRouter();
const postId = computed(() => {
  const raw = route.params.postId;
  return typeof raw === "string" ? raw : "";
});

const {
  post,
  comments,
  loading,
  error,
  submitting,
  formError,
  loadingMore,
  hasMoreComments,
  loadMoreComments,
  onSubmit,
} = useCommunityPost(postId);
const content = ref("");

const pageTitle = computed(() => {
  if (!post.value) return "커뮤니티 댓글 보기 | OTT 가격 비교";
  return `${post.value.nickname || "익명 유저"}의 글 | 커뮤니티 댓글`;
});

const pageDescription = computed(() => {
  if (!post.value?.content) return "커뮤니티 게시글과 댓글을 확인해보세요.";
  return post.value.content.slice(0, 120);
});

useSEO({
  title: pageTitle,
  description: pageDescription,
});

function formatTime(iso: string | undefined): string {
  if (!iso) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

function goBack(): void {
  if (typeof window !== "undefined" && window.history.length > 1) {
    router.back();
    return;
  }
  void router.push("/youtube-premium");
}

async function submitForm(): Promise<void> {
  const success = await onSubmit(content.value);
  if (success) {
    content.value = "";
  }
}
</script>

<template>
  <div class="container py-8 space-y-4">
    <button type="button" class="retro-button-subtle !px-2 !py-1 !text-xs" @click="goBack">
      ← 뒤로가기
    </button>

    <LoadingSpinner v-if="loading" message="게시글을 불러오는 중..." />

    <div v-else-if="error" class="retro-panel overflow-hidden">
      <div class="retro-panel-content">
        <p class="text-body text-destructive">{{ error }}</p>
        <RouterLink to="/youtube-premium" class="mt-3 inline-block text-sm text-primary hover:underline">
          유튜브 프리미엄 화면으로 이동
        </RouterLink>
      </div>
    </div>

    <section v-else-if="post" class="retro-panel overflow-hidden">
      <div class="retro-panel-content space-y-3">
        <article class="rounded-md border border-primary/40 bg-accent/40 px-3 py-2.5">
          <div class="flex items-center gap-2 !text-xs text-muted-foreground">
            <span class="inline-flex items-center rounded-sm border border-primary/40 px-1.5 py-0.5 font-semibold text-primary">
              작성자
            </span>
            <span class="font-semibold text-foreground">{{ post.nickname || "익명 유저" }}</span>
            <span>·</span>
            <span>{{ formatTime(post.createdAt) }}</span>
          </div>
          <p class="mt-1.5 whitespace-pre-line text-body leading-relaxed text-foreground">
            {{ post.content }}
          </p>
        </article>

        <div class="pt-2">
          <div class="mb-2 flex items-center gap-1.5 !text-xs text-muted-foreground">
            <span class="font-semibold text-primary">↳</span>
            <h2 class="font-semibold text-foreground">답글</h2>
          </div>

          <ul v-if="comments.length > 0" class="ml-2 space-y-1.5 md:ml-4">
            <li v-for="comment in comments" :key="comment.id" class="relative pl-5">
              <span class="absolute left-2 top-0 h-full w-px bg-border/70" aria-hidden="true" />
              <article class="rounded-md border border-border/70 bg-card px-3 py-2">
                <div class="flex items-center gap-2 !text-xs text-muted-foreground">
                  <span class="inline-flex items-center rounded-sm border border-border/70 px-1.5 py-0.5 font-semibold text-foreground">
                    답글
                  </span>
                  <span class="font-semibold text-foreground">{{ comment.nickname || "익명 유저" }}</span>
                  <span>·</span>
                  <span>{{ formatTime(comment.createdAt) }}</span>
                </div>
                <p class="mt-1 whitespace-pre-line !text-sm leading-[1.35] text-foreground">
                  {{ comment.content }}
                </p>
              </article>
            </li>
          </ul>
          <div v-if="hasMoreComments" class="ml-2 mt-2 md:ml-4">
            <button
              type="button"
              class="retro-button-subtle !px-2 !py-1 !text-xs"
              :disabled="loadingMore"
              @click="loadMoreComments"
            >
              {{ loadingMore ? "불러오는 중..." : "댓글 더보기" }}
            </button>
          </div>
          <p v-if="comments.length === 0" class="!text-sm text-muted-foreground">아직 댓글이 없습니다. 첫 댓글을 남겨보세요.</p>
        </div>

        <form class="mt-4 space-y-2 border-t border-border/70 pt-3" @submit.prevent="submitForm">
          <div class="flex items-center justify-between">
            <h2 class="font-semibold text-foreground">댓글 쓰기</h2>
            <span class="retro-kbd">{{ content.length }}/300</span>
          </div>
          <textarea
            v-model="content"
            rows="4"
            maxlength="300"
            class="w-full rounded-none border border-border/70 bg-transparent px-3 py-2 !text-sm leading-5 placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-0"
            placeholder="댓글을 입력해 주세요."
          />
          <div class="flex items-center justify-between">
            <p v-if="formError" class="!text-xs text-destructive">{{ formError }}</p>
            <span v-else class="!text-xs text-muted-foreground">익명으로 등록됩니다.</span>
            <button type="submit" class="retro-button-subtle !px-2 !py-1 !text-xs" :disabled="submitting">
              {{ submitting ? "등록 중..." : "댓글 등록" }}
            </button>
          </div>
        </form>
      </div>
    </section>
  </div>
</template>
