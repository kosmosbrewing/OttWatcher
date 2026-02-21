import { ref, type Ref } from "vue";

// 모듈 레벨 싱글톤 상태 — AppHeader와 ServicePriceView 간 공유
const messages: Ref<string[]> = ref([]);

export function useHeadlineMessages() {
  function setMessages(next: string[]): void {
    if (next.length > 0) {
      messages.value = next;
    }
  }

  function clearMessages(): void {
    messages.value = [];
  }

  return { messages, setMessages, clearMessages };
}
