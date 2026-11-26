// Cache headers for the /api proxy in server.ts. Kept free of Express and
// Node APIs, like security-headers.ts, so the spec runs in the browser test
// runner.
//
// Catalogue reads a visitor makes after the first page (opening a product,
// changing a filter) crossed two functions and the database every time, at
// ~450ms each. Anonymous answers are the same for everyone, so the CDN keeps
// them for a minute and refreshes in the background after that. The admin's
// requests carry a token and include prices: they are never stored, and
// `Vary: Authorization` keeps them from being answered with the public copy.

const CACHEABLE_API_PATH = /^\/(products(\/\d+)?|categories)\/?$/;

export interface ApiRequestInfo {
  method: string;
  /** Path below /api, without the query string: "/products/12". */
  path: string;
  hasAuthorization: boolean;
  status: number;
}

export interface ApiCacheHeaders {
  headers: Record<string, string>;
  /** Whether to append Authorization to Vary (appended, so the API's own Vary: Origin stays). */
  varyOnAuthorization: boolean;
}

export function apiCacheHeaders(req: ApiRequestInfo): ApiCacheHeaders {
  const readOnly = req.method === 'GET' || req.method === 'HEAD';
  const shared =
    readOnly && !req.hasAuthorization && req.status === 200 && CACHEABLE_API_PATH.test(req.path);

  if (!shared) {
    return { headers: { 'Cache-Control': 'private, no-store' }, varyOnAuthorization: false };
  }
  return {
    headers: {
      'Cache-Control': 'public, max-age=0, must-revalidate',
      'Vercel-CDN-Cache-Control': 'max-age=60, stale-while-revalidate=604800',
      // Lets the whole catalogue be purged at once (vercel cache invalidate
      // --tag api-catalog) after a bulk change made outside the admin.
      'Vercel-Cache-Tag': 'api-catalog',
    },
    varyOnAuthorization: true,
  };
}
