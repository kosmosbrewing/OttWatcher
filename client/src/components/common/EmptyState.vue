<script setup lang="ts">
defineProps<{
  message: string;
  icon?: string;
}>();
</script>

<template>
  <div class="text-center py-12">
    <p v-if="icon" class="text-3xl mb-2">{{ icon }}</p>
    <p class="text-caption text-muted-foreground">{{ message }}</p>
  </div>
</template>
