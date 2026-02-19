<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";
import { useServices } from "@/composables/useServices";
import { useMyPlan } from "@/composables/useMyPlan";
import { LoadingSpinner } from "@/components/ui/loading";

const emit = defineEmits<{
  (e: "complete"): void;
  (e: "later"): void;
}>();

const { services, loading, error, loadServices } = useServices();
const { selectedService, selectedPlan, saveMyPlan } = useMyPlan();

const selectedServiceSlug = ref("");
const selectedPlanId = ref("");
const submitError = ref("");

const currentService = computed(() =>
  services.value.find((service) => service.slug === selectedServiceSlug.value)
);

const availablePlans = computed(() => currentService.value?.plans ?? []);

function handleSelectService(serviceSlug: string): void {
  if (selectedServiceSlug.value !== serviceSlug) {
    selectedServiceSlug.value = serviceSlug;
    selectedPlanId.value = "";
  }
}

function handleSelectPlan(planId: string): void {
  selectedPlanId.value = planId;
}

function handleComplete(): void {
  if (!selectedServiceSlug.value || !selectedPlanId.value) return;
  submitError.value = "";
  try {
    saveMyPlan(selectedServiceSlug.value, selectedPlanId.value, services.value);
    emit("complete");
  } catch (e: unknown) {
    submitError.value =
      e instanceof Error ? e.message : "요금제 저장 중 오류가 발생했습니다.";
  }
}

function handleLater(): void {
  emit("later");
}

function onKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape") {
    handleLater();
  }
}

onMounted(async () => {
  if (typeof document !== "undefined") {
    document.body.style.overflow = "hidden";
  }
  if (typeof window !== "undefined") {
    window.addEventListener("keydown", onKeydown);
  }

  await loadServices();
  selectedServiceSlug.value = selectedService.value;
  selectedPlanId.value = selectedPlan.value;
});

onUnmounted(() => {
  if (typeof document !== "undefined") {
    document.body.style.overflow = "";
  }
  if (typeof window !== "undefined") {
    window.removeEventListener("keydown", onKeydown);
  }
});
</script>

<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-[80] bg-black/50 p-4" @click.self="handleLater">
      <div
        class="mx-auto mt-[8vh] w-full max-w-[680px] rounded-2xl border border-border bg-background shadow-2xl"
      >
        <div class="border-b border-border px-5 py-4">
          <h2 class="text-heading font-bold text-foreground">내 요금제 설정</h2>
          <p class="mt-1 text-caption text-muted-foreground">
            내 서비스와 요금제를 선택하면 이후 비교 기능에 바로 활용됩니다.
          </p>
        </div>

        <div class="max-h-[68vh] overflow-y-auto px-5 py-4">
          <LoadingSpinner v-if="loading" message="서비스 목록을 불러오는 중..." />

          <div v-else-if="error" class="rounded-lg border border-destructive/40 bg-destructive/5 p-4">
            <p class="text-caption text-destructive">{{ error }}</p>
          </div>

          <div v-else class="space-y-5">
            <section>
              <p class="mb-2 text-caption font-semibold text-foreground">1. 서비스 선택</p>
              <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
                <button
                  v-for="service in services"
                  :key="service.slug"
                  type="button"
                  class="rounded-lg border px-3 py-2 text-left text-caption font-medium transition-colors"
                  :class="selectedServiceSlug === service.slug
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-foreground hover:border-primary/50'"
                  @click="handleSelectService(service.slug)"
                >
                  {{ service.name }}
                </button>
              </div>
            </section>

            <section v-if="currentService">
              <p class="mb-2 text-caption font-semibold text-foreground">2. 요금제 선택</p>
              <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  v-for="plan in availablePlans"
                  :key="plan.id"
                  type="button"
                  class="rounded-lg border px-3 py-2 text-left text-caption transition-colors"
                  :class="selectedPlanId === plan.id
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border bg-card text-foreground hover:border-primary/50'"
                  @click="handleSelectPlan(plan.id)"
                >
                  <p class="font-semibold">{{ plan.name }}</p>
                  <p v-if="plan.nameEn" class="mt-0.5 text-tiny text-muted-foreground">
                    {{ plan.nameEn }}
                  </p>
                </button>
              </div>
            </section>
          </div>
        </div>

        <div class="flex items-center justify-end gap-2 border-t border-border px-5 py-4">
          <p v-if="submitError" class="mr-auto text-caption text-destructive">{{ submitError }}</p>
          <button type="button" class="retro-button-subtle !px-3 !py-1.5" @click="handleLater">
            나중에 하기
          </button>
          <button
            type="button"
            class="retro-button !px-3 !py-1.5"
            :disabled="!selectedServiceSlug || !selectedPlanId"
            @click="handleComplete"
          >
            선택 완료
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
