<script setup lang="ts">
import { Camera, MessageSquare, Link } from "lucide-vue-next";

const props = defineProps<{
  show: boolean;
  shareBusy: boolean;
  kakaoBusy: boolean;
}>();

const emit = defineEmits<{
  close: [];
  shareImage: [];
  shareKakao: [];
  copyLink: [];
}>();

function handleAction(action: "image" | "kakao" | "link"): void {
  emit("close");
  if (action === "image") emit("shareImage");
  else if (action === "kakao") emit("shareKakao");
  else emit("copyLink");
}
</script>

<template>
  <Teleport to="body">
    <Transition name="modal-fade">
      <div
        v-if="props.show"
        class="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
      >
        <div class="absolute inset-0 bg-black/60" @click="emit('close')" />
        <div class="relative z-10 w-full max-w-sm mx-4 retro-panel border border-border">
          <div class="retro-titlebar flex items-center justify-between">
            <h3 class="retro-title text-[1rem]!">공유하기</h3>
            <button class="retro-kbd text-xs" @click="emit('close')">ESC</button>
          </div>

          <div class="p-4 grid grid-cols-3 gap-3">
            <!-- 이미지 공유 -->
            <button
              class="flex flex-col items-center gap-2 retro-panel-muted border border-border/40 p-3 hover:border-primary/60 transition-colors disabled:opacity-50"
              :disabled="props.shareBusy"
              @click="handleAction('image')"
            >
              <Camera class="h-6 w-6 text-primary" />
              <span class="text-[0.72rem] font-bold text-center leading-tight">이미지<br>공유</span>
            </button>

            <!-- 카카오톡 공유 -->
            <button
              class="flex flex-col items-center gap-2 retro-panel-muted border border-border/40 p-3 hover:border-yellow-400/60 transition-colors disabled:opacity-50"
              :disabled="props.kakaoBusy"
              @click="handleAction('kakao')"
            >
              <MessageSquare class="h-6 w-6 text-yellow-400" />
              <span class="text-[0.72rem] font-bold text-center leading-tight">카카오톡<br>공유</span>
            </button>

            <!-- 링크 복사 -->
            <button
              class="flex flex-col items-center gap-2 retro-panel-muted border border-border/40 p-3 hover:border-border/80 transition-colors"
              @click="handleAction('link')"
            >
              <Link class="h-6 w-6 text-muted-foreground" />
              <span class="text-[0.72rem] font-bold text-center leading-tight">링크<br>복사</span>
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.retro-title {
  font-size: 1rem !important;
}

.modal-fade-enter-active,
.modal-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.modal-fade-enter-from,
.modal-fade-leave-to {
  opacity: 0;
  transform: translateY(8px);
}
</style>
