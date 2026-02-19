import { ref } from "vue";
import { z } from "zod";
import type { ServiceInfo } from "@/api";

const MY_PLAN_STORAGE_KEY = "ottwatcher:myplan:v1";

const myPlanSchema = z.object({
  serviceSlug: z.string().regex(/^[a-z0-9-]+$/),
  planId: z.string().min(1).max(64),
  hasChosen: z.literal(true),
});

type MyPlanPayload = z.infer<typeof myPlanSchema>;

const selectedService = ref<string>("");
const selectedPlan = ref<string>("");
const hasChosen = ref(false);

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function resetState(): void {
  selectedService.value = "";
  selectedPlan.value = "";
  hasChosen.value = false;
}

function clearStoredMyPlan(): void {
  if (isBrowser()) {
    window.localStorage.removeItem(MY_PLAN_STORAGE_KEY);
  }
  resetState();
}

function isValidActiveServicePlan(
  payload: MyPlanPayload,
  activeServices: ServiceInfo[]
): boolean {
  const service = activeServices.find((item) => item.slug === payload.serviceSlug);
  if (!service || service.active === false || !Array.isArray(service.plans)) {
    return false;
  }

  return service.plans.some((plan) => plan?.id === payload.planId);
}

function hydrateMyPlan(activeServices: ServiceInfo[]): void {
  if (!isBrowser()) {
    resetState();
    return;
  }

  const raw = window.localStorage.getItem(MY_PLAN_STORAGE_KEY);
  if (!raw) {
    resetState();
    return;
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(raw) as unknown;
  } catch {
    clearStoredMyPlan();
    return;
  }

  const parsed = myPlanSchema.safeParse(parsedJson);
  if (!parsed.success) {
    clearStoredMyPlan();
    return;
  }

  if (!isValidActiveServicePlan(parsed.data, activeServices)) {
    clearStoredMyPlan();
    return;
  }

  selectedService.value = parsed.data.serviceSlug;
  selectedPlan.value = parsed.data.planId;
  hasChosen.value = true;
}

function saveMyPlan(
  serviceSlug: string,
  planId: string,
  activeServices: ServiceInfo[]
): void {
  const parsed = myPlanSchema.safeParse({
    serviceSlug,
    planId,
    hasChosen: true,
  });

  if (!parsed.success) {
    throw new Error("내 요금제 저장값이 올바르지 않습니다.");
  }

  if (!isValidActiveServicePlan(parsed.data, activeServices)) {
    throw new Error("활성 서비스/요금제와 일치하지 않는 값입니다.");
  }

  if (isBrowser()) {
    window.localStorage.setItem(MY_PLAN_STORAGE_KEY, JSON.stringify(parsed.data));
  }

  selectedService.value = parsed.data.serviceSlug;
  selectedPlan.value = parsed.data.planId;
  hasChosen.value = true;
}

export function useMyPlan() {
  return {
    selectedService,
    selectedPlan,
    hasChosen,
    hydrateMyPlan,
    saveMyPlan,
    clearStoredMyPlan,
  };
}
