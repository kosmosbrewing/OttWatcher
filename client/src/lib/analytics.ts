type GtagFn = (...args: unknown[]) => void;

declare global {
  interface Window {
    dataLayer: unknown[];
    gtag?: GtagFn;
    __ga4Initialized?: boolean;
  }
}

const GA_MEASUREMENT_ID_PATTERN = /^G-[A-Z0-9]{4,}$/;
const GA_DEBUG_MODE = import.meta.env.DEV && import.meta.env.VITE_GA_DEBUG === "true";

function normalizeMeasurementId(value: unknown): string {
  if (typeof value !== "string") return "";

  let normalized = value.trim();
  if (
    (normalized.startsWith("\"") && normalized.endsWith("\"")) ||
    (normalized.startsWith("'") && normalized.endsWith("'"))
  ) {
    normalized = normalized.slice(1, -1).trim();
  }

  return normalized.toUpperCase();
}

const GA_MEASUREMENT_ID = normalizeMeasurementId(
  import.meta.env.VITE_GA_MEASUREMENT_ID || import.meta.env.VITE_GA4_MEASUREMENT_ID || ""
);
let gaWarningPrinted = false;
let lastTrackedPath = "";

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function ensureGlobalGtag(): void {
  window.dataLayer = window.dataLayer || [];
  if (!window.gtag) {
    window.gtag = function gtagShim(..._args: unknown[]) {
      // Keep the official gtag bootstrap behavior:
      // function gtag(){dataLayer.push(arguments);}
      window.dataLayer.push(arguments);
    } as GtagFn;
  }
}

function injectGaScript(measurementId: string): void {
  const selector = `script[data-ga4-id="${measurementId}"]`;
  if (document.querySelector(selector)) return;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
  script.setAttribute("data-ga4-id", measurementId);
  script.onload = () => {
    if (GA_DEBUG_MODE) {
      console.info("[ga4] gtag script loaded", { measurementId });
    }
  };
  script.onerror = () => {
    if (!gaWarningPrinted) {
      console.warn("[ga4] gtag script load failed. Check blocker/CSP/network.");
      gaWarningPrinted = true;
    }
  };
  document.head.appendChild(script);
}

function canTrackAnalytics(): boolean {
  if (!GA_MEASUREMENT_ID) {
    if (!gaWarningPrinted) {
      console.warn(
        "[ga4] measurement id missing. Set VITE_GA_MEASUREMENT_ID in Vercel/Env."
      );
      gaWarningPrinted = true;
    }
    return false;
  }

  if (!GA_MEASUREMENT_ID_PATTERN.test(GA_MEASUREMENT_ID)) {
    if (!gaWarningPrinted) {
      console.warn(`[ga4] invalid measurement id: "${GA_MEASUREMENT_ID}"`);
      gaWarningPrinted = true;
    }
    return false;
  }

  return true;
}

export function initAnalytics(): boolean {
  if (!isBrowser() || !canTrackAnalytics()) return false;
  if (window.__ga4Initialized) return true;

  injectGaScript(GA_MEASUREMENT_ID);
  ensureGlobalGtag();

  if (!window.gtag) return false;

  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID, {
    send_page_view: false,
  });

  window.__ga4Initialized = true;
  return true;
}

export function trackPageView(path: string, title?: string): void {
  if (!isBrowser() || !canTrackAnalytics()) return;
  if (!window.__ga4Initialized) initAnalytics();
  if (!window.gtag) return;

  const normalizedPath = path || `${window.location.pathname}${window.location.search}`;
  if (normalizedPath === lastTrackedPath) return;
  lastTrackedPath = normalizedPath;

  const payload = {
    page_title: title || document.title,
    page_path: normalizedPath,
    page_location: `${window.location.origin}${normalizedPath}`,
    ...(GA_DEBUG_MODE ? { debug_mode: true } : {}),
  };
  window.gtag("event", "page_view", payload);

  if (GA_DEBUG_MODE) {
    console.info("[ga4] page_view", {
      measurementId: GA_MEASUREMENT_ID,
      queueSize: window.dataLayer?.length || 0,
      ...payload,
    });
  }
}

export function trackEvent(eventName: string, params?: Record<string, unknown>): void {
  if (!isBrowser() || !canTrackAnalytics()) return;
  if (!window.__ga4Initialized) initAnalytics();
  if (!window.gtag) return;

  const payload = {
    ...(params || {}),
    ...(GA_DEBUG_MODE ? { debug_mode: true } : {}),
  };
  window.gtag("event", eventName, payload);

  if (GA_DEBUG_MODE) {
    console.info("[ga4] event", {
      measurementId: GA_MEASUREMENT_ID,
      eventName,
      queueSize: window.dataLayer?.length || 0,
      ...payload,
    });
  }
}
