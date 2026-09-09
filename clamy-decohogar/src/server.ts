import {
  AngularNodeAppEngine,
  createNodeRequestHandler,
  isMainModule,
  writeResponseToNodeResponse,
} from '@angular/ssr/node';
import express from 'express';
import helmet from 'helmet';
import { join } from 'node:path';

const browserDistFolder = join(import.meta.dirname, '../browser');

const app = express();
const angularApp = new AngularNodeAppEngine();

// CSP is left to the app's own build/asset setup rather than helmet's
// generic default, which is tuned for typical hand-written HTML and can
// block Angular's hydration/inline styles without page-specific tuning.
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

    const upstream = await fetch(`${API_ORIGIN}${req.originalUrl}`, {
      method: req.method,
      headers,
      body: req.method === 'GET' || req.method === 'HEAD' ? undefined : body,
    });

    res.status(upstream.status);
    upstream.headers.forEach((value, key) => {
      if (!['content-encoding', 'transfer-encoding'].includes(key)) {
        res.setHeader(key, value);
      }
    });
    res.send(Buffer.from(await upstream.arrayBuffer()));
  } catch (err) {
    next(err);
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
 * so visitors stop paying the cold-start cost of waking this function.
 *
 * Admin pages are client-rendered and user-specific, so they stay uncached.
 */
const PAGE_CACHE_CONTROL = 'public, s-maxage=600, stale-while-revalidate=86400';

function isCacheablePage(method: string, path: string): boolean {
  return method === 'GET' && !path.startsWith('/admin');
}

/**
 * Handle all other requests by rendering the Angular application.
 */
app.use((req, res, next) => {
  angularApp
    .handle(req)
    .then((response) => {
      if (!response) return next();
      if (isCacheablePage(req.method, req.path)) {
        response.headers.set('Cache-Control', PAGE_CACHE_CONTROL);
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
