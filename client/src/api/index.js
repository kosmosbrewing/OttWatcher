import axios from "axios";

// API 클라이언트 (샤키샤키 패턴 재활용)
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  headers: { "Content-Type": "application/json" },
});

// 응답 인터셉터: data 자동 추출
apiClient.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message =
      error.response?.data?.error ||
      error.response?.data?.message ||
      error.message ||
      "요청 처리 중 오류가 발생했습니다.";
    return Promise.reject(new Error(message));
  }
);

// 서비스 목록 조회
export function fetchServices() {
  return apiClient.get("/services");
}

// 서비스별 가격 데이터 조회
export function fetchPrices(serviceSlug) {
  return apiClient.get(`/prices/${serviceSlug}`);
}

// 대륙 목록 조회
export function fetchContinents() {
  return apiClient.get("/continents");
}

// 서비스 트렌드 조회
export function fetchTrends(serviceSlug) {
  return apiClient.get(`/trends/${serviceSlug}`);
}

// 가격 제보 접수
export function submitPriceReport(payload) {
  return apiClient.post("/reports", payload);
}

// 반영 로그 조회
export function fetchChangelog(serviceSlug = "") {
  const params = serviceSlug ? { serviceSlug } : undefined;
  return apiClient.get("/reports/logs", { params });
}

// 가격 하락 알림 신청
export function subscribePriceAlert(payload) {
  return apiClient.post("/alerts", payload);
}

export default apiClient;
