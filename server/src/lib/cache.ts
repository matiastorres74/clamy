import { getCache } from '@vercel/functions';
import type { RuntimeCache } from '@vercel/functions';

// Public catalogue reads are cached in Vercel's Runtime Cache, per region, and
// every admin write expires the matching tag, so an edit shows up on the next
// read instead of after the TTL. The TTL is only a backstop for changes that
// bypass the API (Prisma Studio, a migration that rewrites rows).
export const CACHE_TTL_SECONDS = 15 * 60;

export const CacheTags = {
  products: 'products',
  categories: 'categories',
} as const;

// Outside Vercel, getCache() does not turn itself off: it falls back to a
// process-wide in-memory cache. Locally that would serve rows the tests just
// wiped, or hide an edit made in Prisma Studio, so off Vercel nothing is
// cached unless a test installs a cache on purpose.
let override: RuntimeCache | null | undefined;

export function setCacheForTests(cache: RuntimeCache | null | undefined): void {
  override = cache;
}

function activeCache(): RuntimeCache | null {
  if (override !== undefined) return override;
  if (!process.env.VERCEL) return null;
  // Namespaced because on a Hobby team the Runtime Cache is shared by every
  // project, and the storefront could one day cache its own keys.
  return getCache({ namespace: 'clamy-api' });
}

function logCacheError(operation: string, detail: string, err: unknown): void {
  console.error(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level: 'error',
      message: `Runtime Cache ${operation} failed`,
      detail,
      error: err instanceof Error ? err.message : String(err),
    }),
  );
}

/**
 * Returns the cached value for `key`, or runs `load`, caches its result and
 * returns it. A cache outage degrades to reading the database, never to a
 * failed request.
 */
export async function cached<T>(key: string, tags: string[], load: () => Promise<T>): Promise<T> {
  const cache = activeCache();
  if (!cache) return load();

  try {
    const hit = await cache.get(key);
    if (hit !== null && hit !== undefined) return hit as T;
  } catch (err) {
    logCacheError('get', key, err);
  }

  const value = await load();
  // A miss (unknown product id) is not stored: a get() returning null could
  // not tell it apart from "not cached", and ids that do not exist yet would
  // otherwise fill the cache.
  if (value === null || value === undefined) return value;
  try {
    await cache.set(key, value, { ttl: CACHE_TTL_SECONDS, tags, name: key.split(':')[0] });
  } catch (err) {
    logCacheError('set', key, err);
  }
  return value;
}

/**
 * Expires every entry carrying one of `tags`. Called after a write has been
 * committed: if expiring fails, the write still stands and readers see the
 * change once the TTL runs out, so the error is logged instead of thrown.
 */
export async function expireTags(...tags: string[]): Promise<void> {
  const cache = activeCache();
  if (!cache) return;
  try {
    await cache.expireTag(tags);
  } catch (err) {
    logCacheError('expireTag', tags.join(','), err);
  }
}
