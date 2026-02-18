type CacheEntry<T> = {
  data: T;
  timestamp: number;
};

class ApiCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private readonly maxSize: number;

  constructor(maxSize = 150) {
    this.maxSize = maxSize;
  }

  get<T>(key: string, maxAge: number): T | null {
    if (maxAge <= 0) return null;

    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.timestamp > maxAge) {
      this.cache.delete(key);
      return null;
    }

    // LRU 갱신
    this.cache.delete(key);
    this.cache.set(key, entry);

    return entry.data as T;
  }

  set<T>(key: string, data: T): void {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.cache.delete(firstKey);
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
    });
  }

  invalidate(pattern: string | RegExp): void {
    const regex = typeof pattern === "string" ? new RegExp(pattern) : pattern;
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  clear(): void {
    this.cache.clear();
  }
}

export const apiCache = new ApiCache();

export const cachePolicies = {
  services: { maxAge: 5 * 60 * 1000 },
  prices: { maxAge: 60 * 1000 },
  trends: { maxAge: 60 * 1000 },
  continents: { maxAge: 10 * 60 * 1000 },
  community: { maxAge: 15 * 1000 },
  noCache: { maxAge: 0 },
} as const;

export type CachePolicy = keyof typeof cachePolicies;

export const NEVER_CACHE_PATTERNS: RegExp[] = [
  /^\/alerts($|\/)/,
];
