type UseModalOptions = {
  storageKey: string;
  hideDays?: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function useModal(options: UseModalOptions) {
  const hideDays = options.hideDays ?? 3;
  const hideDurationMs = Math.max(0, hideDays) * DAY_MS;

  function readLastDismissedAt(): Date | null {
    if (!isBrowser()) return null;

    const raw = window.localStorage.getItem(options.storageKey);
    if (!raw) return null;

    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return null;
    return date;
  }

  function shouldOpen(): boolean {
    const dismissedAt = readLastDismissedAt();
    if (!dismissedAt) return true;
    return Date.now() - dismissedAt.getTime() >= hideDurationMs;
  }

  function dismiss(): void {
    if (!isBrowser()) return;
    window.localStorage.setItem(options.storageKey, new Date().toISOString());
  }

  function clearDismissed(): void {
    if (!isBrowser()) return;
    window.localStorage.removeItem(options.storageKey);
  }

  return {
    shouldOpen,
    dismiss,
    clearDismissed,
  };
}
