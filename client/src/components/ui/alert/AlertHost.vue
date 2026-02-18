<script setup lang="ts">
import Alert from "./Alert.vue";
import { cancelAlert, confirmAlert, useAlert } from "@/composables/useAlert";

const { alertState, closeAlert } = useAlert();
</script>

<template>
  <Alert
    v-if="alertState.isOpen"
    :message="alertState.message"
    :type="alertState.type"
    :duration="alertState.duration"
    :confirm-mode="alertState.mode === 'confirm'"
    :confirm-variant="alertState.confirmVariant"
    :confirm-text="alertState.confirmText"
    :cancel-text="alertState.cancelText"
    @close="closeAlert"
    @confirm="confirmAlert"
    @cancel="cancelAlert"
  />
</template>

