import { ref } from "vue";
import { fetchServices } from "@/api";

const services = ref([]);
const loading = ref(false);
const error = ref(null);

// 서비스 목록 로드 (싱글톤 캐시)
export function useServices() {
  async function loadServices() {
    if (services.value.length > 0) return;
    loading.value = true;
    error.value = null;
    try {
      const data = await fetchServices();
      services.value = data.services.filter((s) => s.active);
    } catch (e) {
      error.value = e.message;
    } finally {
      loading.value = false;
    }
  }

  return { services, loading, error, loadServices };
}
