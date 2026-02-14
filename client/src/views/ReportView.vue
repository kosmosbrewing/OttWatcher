<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { useServices } from "@/composables/useServices";
import { useSEO } from "@/composables/useSEO";
import { submitPriceReport } from "@/api";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const { services, loadServices } = useServices();

const submitting = ref(false);
const submitError = ref("");
const successMessage = ref("");

const form = ref({
  serviceSlug: "",
  countryCode: "",
  planId: "individual",
  currency: "KRW",
  reportedPrice: "",
  sourceUrl: "",
  note: "",
  email: "",
});

const selectedService = computed(() =>
  services.value.find((service) => service.slug === form.value.serviceSlug)
);

const availablePlans = computed(() => selectedService.value?.plans || []);

useSEO({
  title: "가격 제보 | OTT 가격 비교",
  description: "OTT 국가별 가격 정보 오류를 제보하고 최신 데이터 반영에 참여하세요.",
});

function normalizeCountryCode(value) {
  return value.replace(/[^a-z]/gi, "").slice(0, 2).toUpperCase();
}

async function init() {
  await loadServices();
  if (!form.value.serviceSlug && services.value.length > 0) {
    form.value.serviceSlug = services.value[0].slug;
  }
}

watch(
  () => form.value.serviceSlug,
  () => {
    const firstPlan = availablePlans.value[0];
    if (firstPlan) form.value.planId = firstPlan.id;
  }
);

async function onSubmit() {
  submitError.value = "";
  successMessage.value = "";
  submitting.value = true;

  try {
    const response = await submitPriceReport({
      serviceSlug: form.value.serviceSlug,
      countryCode: normalizeCountryCode(form.value.countryCode),
      planId: form.value.planId,
      currency: form.value.currency.trim().toUpperCase(),
      reportedPrice: Number(form.value.reportedPrice),
      sourceUrl: form.value.sourceUrl.trim(),
      note: form.value.note.trim(),
      email: form.value.email.trim(),
    });

    successMessage.value = `${response.message} (접수번호: ${response.id})`;
    form.value.countryCode = "";
    form.value.reportedPrice = "";
    form.value.sourceUrl = "";
    form.value.note = "";
  } catch (e) {
    submitError.value = e.message;
  } finally {
    submitting.value = false;
  }
}

onMounted(init);
</script>

<template>
  <div class="container py-8 max-w-3xl">
    <section class="retro-panel overflow-hidden mb-6">
      <div class="retro-titlebar">
        <h1 class="retro-title">가격 제보 센터</h1>
        <span class="retro-kbd">REPORT</span>
      </div>
      <div class="p-4">
        <p class="text-body text-muted-foreground">
          잘못된 가격 정보나 최근 변경된 요금제를 제보해 주세요. 검토 후 반영 로그에 업데이트됩니다.
        </p>
      </div>
    </section>

    <Card class="retro-panel overflow-hidden">
      <div class="retro-titlebar">
        <h2 class="retro-title">제보 양식</h2>
      </div>
      <CardHeader>
        <CardTitle>서비스별 가격 업데이트 요청</CardTitle>
      </CardHeader>
      <CardContent>
        <form class="space-y-4" @submit.prevent="onSubmit">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label class="space-y-1">
              <span class="text-caption text-muted-foreground">서비스</span>
              <select
                v-model="form.serviceSlug"
                required
                class="retro-input"
              >
                <option v-for="service in services" :key="service.id" :value="service.slug">
                  {{ service.name }}
                </option>
              </select>
            </label>

            <label class="space-y-1">
              <span class="text-caption text-muted-foreground">국가 코드 (예: KR)</span>
              <input
                v-model="form.countryCode"
                required
                maxlength="2"
                placeholder="KR"
                class="retro-input uppercase"
              />
            </label>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <label class="space-y-1">
              <span class="text-caption text-muted-foreground">요금제</span>
              <select
                v-model="form.planId"
                required
                class="retro-input"
              >
                <option v-for="plan in availablePlans" :key="plan.id" :value="plan.id">
                  {{ plan.name }}
                </option>
              </select>
            </label>

            <label class="space-y-1">
              <span class="text-caption text-muted-foreground">통화 (예: KRW)</span>
              <input
                v-model="form.currency"
                required
                maxlength="8"
                class="retro-input uppercase"
              />
            </label>

            <label class="space-y-1">
              <span class="text-caption text-muted-foreground">제보 가격</span>
              <input
                v-model="form.reportedPrice"
                required
                min="0"
                step="0.01"
                type="number"
                class="retro-input"
              />
            </label>
          </div>

          <label class="space-y-1 block">
            <span class="text-caption text-muted-foreground">출처 URL (선택)</span>
            <input
              v-model="form.sourceUrl"
              type="url"
              placeholder="https://..."
              class="retro-input"
            />
          </label>

          <label class="space-y-1 block">
            <span class="text-caption text-muted-foreground">메모 (선택)</span>
            <textarea
              v-model="form.note"
              rows="4"
              maxlength="1000"
              class="retro-input"
              placeholder="변경 시점, 공식 페이지 캡처 정보 등을 남겨주세요."
            ></textarea>
          </label>

          <label class="space-y-1 block">
            <span class="text-caption text-muted-foreground">이메일 (선택)</span>
            <input
              v-model="form.email"
              type="email"
              placeholder="you@example.com"
              class="retro-input"
            />
          </label>

          <p v-if="submitError" class="text-destructive text-caption">{{ submitError }}</p>
          <p v-if="successMessage" class="text-savings text-caption">{{ successMessage }}</p>

          <button
            type="submit"
            :disabled="submitting"
            class="retro-button disabled:opacity-50"
          >
            {{ submitting ? "접수 중..." : "제보 접수" }}
          </button>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
