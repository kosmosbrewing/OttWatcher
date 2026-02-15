import { ref } from "vue";
import { fetchServices, type ServiceInfo } from "@/api";

const services = ref<ServiceInfo[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);

// 서비스 목록 로드 (싱글톤 캐시)
export function useServices() {
  async function loadServices(): Promise<void> {
    if (services.value.length > 0) return;
    loading.value = true;
    error.value = null;
    try {
      const data = await fetchServices();
      services.value = data.services.filter((s) => s.active);
    } catch (e: unknown) {
      error.value = e instanceof Error ? e.message : "서비스 목록을 불러오지 못했습니다.";
    } finally {
      loading.value = false;
    }
  }

  return { services, loading, error, loadServices };
}
