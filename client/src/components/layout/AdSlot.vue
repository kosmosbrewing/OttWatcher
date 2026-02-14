<script setup>
import { ref, computed, onMounted } from "vue";

const props = defineProps({
  position: {
    type: String,
    default: "top",
    validator: (v) => ["top", "middle", "bottom", "sidebar"].includes(v),
  },
  slot: {
    type: String,
    default: "",
  },
});

const publisherId = (import.meta.env.VITE_ADSENSE_PUBLISHER_ID || "").trim();
const slotMap = {
  top: (import.meta.env.VITE_ADSENSE_SLOT_TOP || "").trim(),
  middle: (import.meta.env.VITE_ADSENSE_SLOT_MIDDLE || "").trim(),
  bottom: (import.meta.env.VITE_ADSENSE_SLOT_BOTTOM || "").trim(),
  sidebar: (import.meta.env.VITE_ADSENSE_SLOT_SIDEBAR || "").trim(),
};
const adRef = ref(null);

// 위치별 광고 포맷 매핑
const adConfig = {
  top: { format: "horizontal", style: "display:block", height: "h-[90px]" },
  middle: { format: "fluid", style: "display:block; text-align:center", height: "h-[250px]" },
  bottom: { format: "auto", style: "display:block", height: "h-[250px]" },
  sidebar: { format: "vertical", style: "display:block", height: "h-[600px]" },
};

const resolvedSlot = computed(() => {
  if (props.slot && props.slot.trim()) return props.slot.trim();
  return slotMap[props.position] || "";
});

const canRenderRealAd = computed(() => Boolean(publisherId && resolvedSlot.value));

let adsenseScriptPromise;
function ensureAdsenseScript() {
  if (window.adsbygoogle) return Promise.resolve();
  if (adsenseScriptPromise) return adsenseScriptPromise;

  adsenseScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-adsense-loader="true"]');
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("AdSense script load failed")), { once: true });
      return;
    }

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`;
    script.crossOrigin = "anonymous";
    script.dataset.adsenseLoader = "true";
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("AdSense script load failed"));
    document.head.appendChild(script);
  });

  return adsenseScriptPromise;
}

onMounted(() => {
  if (!canRenderRealAd.value) return;

  ensureAdsenseScript()
    .then(() => {
      try {
        if (!adRef.value?.dataset?.adSlot) return;
        (window.adsbygoogle = window.adsbygoogle || []).push({});
      } catch {
        // 광고 로드 실패 시 플레이스홀더 유지
      }
    })
    .catch(() => {
      // 광고 스크립트 로드 실패 시 플레이스홀더 유지
    });
});
</script>

<template>
  <div v-if="canRenderRealAd" class="w-full my-4 overflow-hidden">
    <ins
      ref="adRef"
      class="adsbygoogle"
      :style="adConfig[position].style"
      :data-ad-client="publisherId"
      :data-ad-slot="resolvedSlot"
      :data-ad-format="adConfig[position].format"
      data-full-width-responsive="true"
    ></ins>
  </div>
</template>
