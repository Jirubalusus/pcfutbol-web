// ============================================================
// readCache — tiny memory + localStorage TTL cache
// ------------------------------------------------------------
// Reduces repeated Firestore reads for public / static-ish data
// (leaderboards, leagues, teams). Memory map is the fast path;
// localStorage persists across reloads. Both are best-effort and
// degrade gracefully: any storage/parse error simply behaves as a
// cache miss, so callers always fall back to a live Firestore read.
// Data shape is never altered — values are stored/returned verbatim.
// ============================================================

const memory = new Map(); // key -> { value, expires }

// Bump when the cached payload shape changes so old entries are ignored.
const CACHE_VERSION = 'v1';
const STORAGE_PREFIX = `rc:${CACHE_VERSION}:`;

function hasLocalStorage() {
  try {
    return typeof localStorage !== 'undefined' && localStorage !== null;
  } catch {
    return false;
  }
}

function storageKey(key) {
  return `${STORAGE_PREFIX}${key}`;
}

/**
 * Read a cached value. Returns the value if present and not expired,
 * otherwise null. Checks memory first, then localStorage (re-hydrating
 * memory on a localStorage hit).
 */
export function getCached(key) {
  const now = Date.now();

  const mem = memory.get(key);
  if (mem) {
    if (mem.expires > now) return mem.value;
    memory.delete(key);
  }

  if (!hasLocalStorage()) return null;
  try {
    const raw = localStorage.getItem(storageKey(key));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.expires !== 'number' || parsed.expires <= now) {
      try { localStorage.removeItem(storageKey(key)); } catch { /* ignore */ }
      return null;
    }
    // Re-hydrate memory so subsequent hits skip JSON parsing.
    memory.set(key, { value: parsed.value, expires: parsed.expires });
    return parsed.value;
  } catch {
    return null;
  }
}

/**
 * Store a value with a TTL (milliseconds). Writes to memory always and
 * to localStorage best-effort. Returns the value for convenient chaining.
 */
export function setCached(key, value, ttlMs) {
  const expires = Date.now() + (ttlMs || 0);
  memory.set(key, { value, expires });

  if (hasLocalStorage()) {
    try {
      localStorage.setItem(storageKey(key), JSON.stringify({ value, expires }));
    } catch {
      // Quota / serialization errors are non-fatal — memory cache still works.
    }
  }
  return value;
}

/** Remove a single cached entry from memory and localStorage. */
export function clearCached(key) {
  memory.delete(key);
  if (hasLocalStorage()) {
    try { localStorage.removeItem(storageKey(key)); } catch { /* ignore */ }
  }
}

/**
 * Cache-aware wrapper: return the cached value if fresh, otherwise run
 * loader(), cache its result, and return it. If loader throws, the error
 * propagates so callers can apply their own fallback.
 */
export async function cachedRead(key, ttlMs, loader) {
  const hit = getCached(key);
  if (hit !== null && hit !== undefined) return hit;
  const value = await loader();
  if (value !== null && value !== undefined) setCached(key, value, ttlMs);
  return value;
}

// Common TTLs
export const TTL = {
  FIVE_MIN: 5 * 60 * 1000,
  TEN_MIN: 10 * 60 * 1000,
  ONE_DAY: 24 * 60 * 60 * 1000,
};
