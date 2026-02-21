<script setup lang="ts">
import { onMounted, ref } from "vue";
import AppHeader from "@/components/layout/AppHeader.vue";
import AppFooter from "@/components/layout/AppFooter.vue";
import AlertHost from "@/components/ui/alert/AlertHost.vue";
import MyPlanModal from "@/components/onboarding/MyPlanModal.vue";
import { useModal } from "@/composables/useModal";
import { useMyPlan } from "@/composables/useMyPlan";
import { useServices } from "@/composables/useServices";

const showMyPlanModal = ref(false);
const onboardingEnabled = !import.meta.env.PROD;

const { services, loadServices } = useServices();
const { hasChosen, hydrateMyPlan } = useMyPlan();
const myPlanModal = useModal({
  storageKey: "ottwatcher:myplan:dismissedAt:v1",
  hideDays: 3,
});

function closeMyPlanModal(): void {
  showMyPlanModal.value = false;
}

function postponeMyPlanModal(): void {
  myPlanModal.dismiss();
  closeMyPlanModal();
}

onMounted(async () => {
  if (!onboardingEnabled) {
    showMyPlanModal.value = false;
    return;
  }

  await loadServices();
  hydrateMyPlan(services.value);
  showMyPlanModal.value = !hasChosen.value && myPlanModal.shouldOpen();
});
</script>

<template>
  <div class="min-h-screen flex flex-col bg-background">
    <AppHeader />
    <main class="flex-1 relative">
      <RouterView v-slot="{ Component }">
        <Transition name="page-fade" mode="out-in">
          <component :is="Component" />
        </Transition>
      </RouterView>
    </main>
    <AppFooter />
    <AlertHost />
    <MyPlanModal
      v-if="onboardingEnabled && showMyPlanModal"
      @complete="closeMyPlanModal"
      @later="postponeMyPlanModal"
    />
  </div>
</template>

<style scoped>
.page-fade-enter-active,
.page-fade-leave-active {
  transition: opacity 0.18s ease;
}

.page-fade-enter-from,
.page-fade-leave-to {
  opacity: 0;
}
</style>
