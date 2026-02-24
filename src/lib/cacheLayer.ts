// API-Football Optimized Cache Layer
// Smart caching with deduplication, persistence, and adaptive durations

// ================= CACHE CONFIGURATION =================

// Adaptive cache durations based on data type and match status
export const CACHE_DURATIONS = {
  // Static data - rarely changes
  TEAM_INFO: 24 * 60 * 60 * 1000,      // 24 hours
  SQUAD: 6 * 60 * 60 * 1000,           // 6 hours
  LEAGUE_INFO: 24 * 60 * 60 * 1000,    // 24 hours

  // Semi-static data - changes occasionally
  STANDINGS: 30 * 60 * 1000,           // 30 minutes
  INJURIES: 60 * 60 * 1000,            // 1 hour
  TEAM_STATS: 30 * 60 * 1000,          // 30 minutes
  H2H: 60 * 60 * 1000,                 // 1 hour

  // Dynamic data - changes frequently
  FIXTURES: 10 * 60 * 1000,            // 10 minutes
  TEAM_FIXTURES: 10 * 60 * 1000,       // 10 minutes
  PAST_FIXTURES: 30 * 60 * 1000,       // 30 minutes (results don't change)

  // Live data - very short cache
  LIVE_MATCHES: 30 * 1000,             // 30 seconds
  MATCH_EVENTS: 15 * 1000,             // 15 seconds
  LINEUPS: 5 * 60 * 1000,              // 5 minutes (lineups published before match)
};

// In-flight request tracking (deduplication)
const inflightRequests = new Map<string, Promise<unknown>>();

// Memory cache
const memoryCache = new Map<string, { data: unknown; timestamp: number; duration: number }>();

// LocalStorage key prefix
const STORAGE_PREFIX = 'api-football-cache-';

// ================= CACHE UTILITIES =================

/**
 * Generate a cache key
 */
export function getCacheKey(endpoint: string, params: Record<string, unknown>): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(k => `${k}=${params[k]}`)
    .join('&');
  return `${endpoint}?${sortedParams}`;
}

/**
 * Get from memory cache
 */
export function getFromMemoryCache<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;

  const age = Date.now() - entry.timestamp;
  if (age > entry.duration) {
    memoryCache.delete(key);
    return null;
  }

  console.log(`[Cache] HIT (memory): ${key} (age: ${Math.round(age / 1000)}s)`);
  return entry.data as T;
}

/**
 * Set to memory cache
 */
export function setToMemoryCache<T>(key: string, data: T, duration: number): void {
  memoryCache.set(key, { data, timestamp: Date.now(), duration });
  console.log(`[Cache] SET (memory): ${key} (duration: ${Math.round(duration / 60000)}min)`);
}

/**
 * Get from localStorage (for static data persistence)
 */
export function getFromPersistentCache<T>(key: string): T | null {
  try {
    const storageKey = STORAGE_PREFIX + key.replace(/[^a-zA-Z0-9]/g, '_');
    const stored = localStorage.getItem(storageKey);
    
    if (!stored) return null;
    
    const { data, timestamp, duration } = JSON.parse(stored);
    const age = Date.now() - timestamp;
    
    if (age > duration) {
      localStorage.removeItem(storageKey);
      return null;
    }
    
    console.log(`[Cache] HIT (persistent): ${key}`);
    return data as T;
  } catch {
    return null;
  }
}

/**
 * Set to localStorage (for static data persistence)
 */
export function setToPersistentCache<T>(key: string, data: T, duration: number): void {
  try {
    const storageKey = STORAGE_PREFIX + key.replace(/[^a-zA-Z0-9]/g, '_');
    localStorage.setItem(storageKey, JSON.stringify({
      data,
      timestamp: Date.now(),
      duration,
    }));
    console.log(`[Cache] SET (persistent): ${key}`);
  } catch {
    // localStorage might be full or unavailable
  }
}

/**
 * Clear all caches
 */
export function clearAllCaches(): void {
  memoryCache.clear();
  
  // Clear localStorage
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) {
      localStorage.removeItem(key);
    }
  }
  
  console.log('[Cache] All caches cleared');
}

/**
 * Clear expired entries from localStorage
 */
export function cleanupExpiredCache(): void {
  const now = Date.now();
  let cleaned = 0;
  
  for (let i = localStorage.length - 1; i >= 0; i--) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) {
      try {
        const stored = localStorage.getItem(key);
        if (stored) {
          const { timestamp, duration } = JSON.parse(stored);
          if (now - timestamp > duration) {
            localStorage.removeItem(key);
            cleaned++;
          }
        }
      } catch {
        localStorage.removeItem(key);
        cleaned++;
      }
    }
  }
  
  if (cleaned > 0) {
    console.log(`[Cache] Cleaned ${cleaned} expired entries`);
  }
}

// ================= REQUEST DEDUPLICATION =================

/**
 * Get or create in-flight request (deduplication)
 */
export function getInflightRequest<T>(key: string): Promise<T> | null {
  return inflightRequests.get(key) as Promise<T> | null;
}

/**
 * Set in-flight request
 */
export function setInflightRequest<T>(key: string, request: Promise<T>): void {
  inflightRequests.set(key, request);
  
  // Auto-cleanup when request completes
  request.finally(() => {
    inflightRequests.delete(key);
  });
}

/**
 * Remove in-flight request
 */
export function removeInflightRequest(key: string): void {
  inflightRequests.delete(key);
}

// ================= SMART FETCH WRAPPER =================

interface SmartFetchOptions {
  persistToStorage?: boolean;  // Save to localStorage
  cacheDuration: number;       // Cache duration in ms
  fetchFn: () => Promise<unknown>;  // Actual fetch function
}

/**
 * Smart fetch with caching and deduplication
 */
export async function smartFetch<T>(
  key: string,
  options: SmartFetchOptions
): Promise<T | null> {
  // 1. Check memory cache
  const memoryCached = getFromMemoryCache<T>(key);
  if (memoryCached !== null) {
    return memoryCached;
  }

  // 2. Check persistent cache (for static data)
  if (options.persistToStorage) {
    const persistentCached = getFromPersistentCache<T>(key);
    if (persistentCached !== null) {
      // Also set to memory for faster subsequent access
      setToMemoryCache(key, persistentCached, options.cacheDuration);
      return persistentCached;
    }
  }

  // 3. Check for in-flight request (deduplication)
  const inflight = getInflightRequest<T>(key);
  if (inflight) {
    console.log(`[Cache] DEDUP: ${key} - waiting for in-flight request`);
    return inflight;
  }

  // 4. Make new request
  const request = options.fetchFn() as Promise<T>;
  setInflightRequest(key, request);

  try {
    const data = await request;
    
    if (data !== null) {
      // 5. Cache the result
      setToMemoryCache(key, data, options.cacheDuration);
      
      if (options.persistToStorage) {
        setToPersistentCache(key, data, options.cacheDuration);
      }
    }
    
    return data;
  } catch (error) {
    console.error(`[Cache] Fetch error for ${key}:`, error);
    return null;
  }
}

// ================= BACKGROUND REFRESH =================

const refreshIntervals = new Map<string, NodeJS.Timeout>();

/**
 * Start background refresh for a key
 */
export function startBackgroundRefresh(
  key: string,
  refreshFn: () => Promise<void>,
  intervalMs: number
): void {
  // Stop existing refresh if any
  stopBackgroundRefresh(key);
  
  const intervalId = setInterval(async () => {
    console.log(`[Cache] Background refresh: ${key}`);
    try {
      await refreshFn();
    } catch (error) {
      console.error(`[Cache] Background refresh error for ${key}:`, error);
    }
  }, intervalMs);
  
  refreshIntervals.set(key, intervalId);
  console.log(`[Cache] Started background refresh: ${key} (every ${Math.round(intervalMs / 1000)}s)`);
}

/**
 * Stop background refresh
 */
export function stopBackgroundRefresh(key: string): void {
  const intervalId = refreshIntervals.get(key);
  if (intervalId) {
    clearInterval(intervalId);
    refreshIntervals.delete(key);
    console.log(`[Cache] Stopped background refresh: ${key}`);
  }
}

/**
 * Stop all background refreshes
 */
export function stopAllBackgroundRefreshes(): void {
  for (const key of refreshIntervals.keys()) {
    stopBackgroundRefresh(key);
  }
}

// ================= CACHE STATS =================

export function getCacheStats(): {
  memoryEntries: number;
  inflightRequests: number;
  persistentEntries: number;
} {
  let persistentEntries = 0;
  
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) {
      persistentEntries++;
    }
  }
  
  return {
    memoryEntries: memoryCache.size,
    inflightRequests: inflightRequests.size,
    persistentEntries,
  };
}

// ================= INITIALIZATION =================

// Run cleanup on load
if (typeof window !== 'undefined') {
  // Delay cleanup to not block initial render
  setTimeout(cleanupExpiredCache, 5000);
}

export const cacheLayer = {
  getCacheKey,
  getFromMemoryCache,
  setToMemoryCache,
  getFromPersistentCache,
  setToPersistentCache,
  clearAllCaches,
  cleanupExpiredCache,
  getInflightRequest,
  setInflightRequest,
  removeInflightRequest,
  smartFetch,
  startBackgroundRefresh,
  stopBackgroundRefresh,
  stopAllBackgroundRefreshes,
  getCacheStats,
  CACHE_DURATIONS,
};

export default cacheLayer;
