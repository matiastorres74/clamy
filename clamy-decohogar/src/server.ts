import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import helmet from 'helmet';
import { join } from 'node:path';
import { Category, Product } from './app/core/models/product.model';
import { ROBOTS_TXT, buildSitemapXml } from './seo-files';
import { applyScriptNonce, buildCsp, robotsTagFor } from './security-headers';
import { apiCacheHeaders } from './api-cache-headers';
import { randomBytes } from 'node:crypto';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

// helmet's generic CSP would block Angular's inline scripts; rendered pages
// get their own nonce-based policy below (see security-headers.ts).
app.use(helmet({ contentSecurityPolicy: false }));

/**
 * Proxies /api/* to the backend (a separate Vercel project). Done here
 * rather than via vercel.json rewrites — a custom `rewrites` array there
 * disables Vercel's automatic Angular SSR routing (the whole app then
 * 404s, since this build has no prerendered index.html to fall back to).
 * Keeping the proxy in-app means the frontend's own SSR routing is
 * untouched and vercel.json needs no routing config at all.
 */
const API_ORIGIN = process.env['API_ORIGIN'] || 'http://localhost:3001';
const API_TIMEOUT_MS = 10_000;

// What the CDN may keep is decided in api-cache-headers.ts.
function setApiCacheHeaders(req: express.Request, res: express.Response, status: number): void {
  const { headers, varyOnAuthorization } = apiCacheHeaders({
    method: req.method,
    path: req.path,
    hasAuthorization: Boolean(req.headers['authorization']),
    status,
  });
  for (const [name, value] of Object.entries(headers)) res.setHeader(name, value);
  if (varyOnAuthorization) res.vary('Authorization');
}

app.use('/api', async (req, res, next) => {
  try {
    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(chunk as Buffer);
    const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;

    const headers: Record<string, string> = {};
    for (const [key, value] of Object.entries(req.headers)) {
      if (typeof value === 'string' && !['host', 'connection', 'content-length'].includes(key)) {
        headers[key] = value;
      }
    }

    // Without a timeout a hung API held this function open until Vercel's
    // 300s limit, with the visitor waiting the whole time.
    const upstream = await fetch(`${API_ORIGIN}${req.originalUrl}`, {
      method: req.method,
      headers,
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });

    res.status(upstream.status);
    upstream.headers.forEach((value, key) => {
      if (!['content-encoding', 'transfer-encoding'].includes(key)) {
        res.setHeader(key, value);
      }
    });
    // After copying the API's headers, so its own Cache-Control does not win.
    setApiCacheHeaders(req, res, upstream.status);
    res.send(Buffer.from(await upstream.arrayBuffer()));
  } catch (err) {
    if (err instanceof Error && err.name === 'TimeoutError') {
      res.status(504).json({ error: 'The API did not respond in time' });
      return;
    }
    next(err);
  }
});

// Served from here rather than public/ because express.static below caches
// for a year, and because the sitemap has to follow the catalogue. An hour on
// the CDN keeps a crawl from hitting the API on every request.
const SEO_BROWSER_CACHE = 'public, s-maxage=3600';
const SEO_CDN_CACHE = 'max-age=3600';

app.get('/robots.txt', (_req, res) => {
  res.setHeader('Cache-Control', SEO_BROWSER_CACHE);
  res.setHeader('Vercel-CDN-Cache-Control', SEO_CDN_CACHE);
  res.type('text/plain').send(ROBOTS_TXT);
});

app.get('/sitemap.xml', async (_req, res) => {
  try {
    const fetchJson = async <T>(path: string): Promise<T> => {
      const upstream = await fetch(`${API_ORIGIN}${path}`, {
        signal: AbortSignal.timeout(API_TIMEOUT_MS),
      });
      if (!upstream.ok) throw new Error(`API answered ${upstream.status} for ${path}`);
      return (await upstream.json()) as T;
    };
    const [products, categories] = await Promise.all([
      fetchJson<Pick<Product, 'id' | 'updatedAt'>[]>('/api/products'),
      fetchJson<Pick<Category, 'id'>[]>('/api/categories'),
    ]);
    res.setHeader('Cache-Control', SEO_BROWSER_CACHE);
    res.setHeader('Vercel-CDN-Cache-Control', SEO_CDN_CACHE);
    res.type('application/xml').send(buildSitemapXml(products, categories));
  } catch (err) {
    // A 503 tells Google to retry later. A sitemap missing the products would
    // read as if they had all been removed.
    console.error('Could not build the sitemap:', err);
    res.status(503).setHeader('Retry-After', '3600').type('text/plain').send('Sitemap unavailable');
  }
});

/**
 * Serve static files from /browser
 */
app.use(
  express.static(browserDistFolder, {
    maxAge: '1y',
    index: false,
    redirect: false,
  }),
);

/**
 * Lets Vercel's CDN serve rendered pages instead of invoking this function on
 * every visit. Storefront HTML is identical for every visitor — the cart lives
 * in localStorage and renders empty on the server — so a shared cache is safe.
 *
 * `stale-while-revalidate` is the part that matters on low traffic: once a page
 * is warm the CDN keeps serving it instantly and refreshes in the background,
 * so visitors stop paying the cold-start cost of waking this function. A cold
 * render costs ~4.7s (this function, the API's and Neon waking from
 * scale-to-zero), so the stale window is a week: any page visited at least once
 * a week is answered from the CDN, and the refresh happens behind it.
 *
 * Admin pages are client-rendered and user-specific, so they stay uncached.
 */
const PAGE_CACHE_CONTROL = 'public, s-maxage=600, stale-while-revalidate=604800';

// Vercel rewrites `Cache-Control` on framework-rendered responses to its own
// `max-age=0, must-revalidate`, which is why setting that header alone left
// every request a cache MISS in production. `Vercel-CDN-Cache-Control` is the
// channel it does honour: the CDN consumes it and strips it before the browser
// sees it, so the two headers together give us an edge cache without telling
// browsers to hold a private copy of the page.
const CDN_CACHE_CONTROL = 'max-age=600, stale-while-revalidate=604800';

// Only a real page (200) or a real "not found" (404) is shared through the
// CDN. A redirect or a 503 rendered while the API was failing used to be
// cached as well, and then served to every visitor for ten minutes.
function isCacheablePage(method: string, path: string, status: number): boolean {
  return method === 'GET' && !path.startsWith('/admin') && (status === 200 || status === 404);
}

// A fresh nonce per render. A page cached on the CDN keeps the header and the
// HTML it was rendered with, so the two always match.
async function withSecurityHeaders(response: Response, path: string): Promise<Response> {
  const headers = new Headers(response.headers);
  const robots = robotsTagFor(path);
  if (robots) headers.set('X-Robots-Tag', robots);

  if (!headers.get('content-type')?.includes('text/html')) {
    return new Response(response.body, { status: response.status, headers });
  }

  const nonce = randomBytes(16).toString('base64');
  const html = applyScriptNonce(await response.text(), nonce);
  headers.set('Content-Security-Policy', buildCsp(nonce));
  headers.delete('content-length');
  return new Response(html, { status: response.status, statusText: response.statusText, headers });
}

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => {
      if (!response) return null;
      return withSecurityHeaders(response, req.path);
    })
    .then((response) => {
      if (!response) return next();
      if (isCacheablePage(req.method, req.path, response.status)) {
        response.headers.set('Cache-Control', PAGE_CACHE_CONTROL);
        response.headers.set('Vercel-CDN-Cache-Control', CDN_CACHE_CONTROL);
      }
      return writeResponseToNodeResponse(response, res);
    })
    .catch(next);
});

/**
 * Start the server if this module is the main entry point, or it is ran via PM2.
 * The server listens on the port defined by the `PORT` environment variable, or defaults to 4000.
 */
if (isMainModule(import.meta.url) || process.env['pm_id']) {
  const port = process.env['PORT'] || 4000;
  app.listen(port, (error) => {
    if (error) {
      throw error;
    }

    console.log(`Node Express server listening on http://localhost:${port}`);
  });
}

/**
 * Request handler used by the Angular CLI (for dev-server and during build) or Firebase Cloud Functions.
 */
export const reqHandler = createNodeRequestHandler(app);
