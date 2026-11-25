// Content-Security-Policy and robots headers for server-rendered pages.
// Kept free of Node APIs so the spec can run in the browser test runner;
// the nonce itself is generated in server.ts.

// Product photos are uploaded to Vercel Blob's public store (see
// server/src/routes/upload.ts), which serves them from per-store subdomains.
const IMAGE_HOSTS = 'https://*.public.blob.vercel-storage.com';

export function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    // Only our own bundles and the three inline scripts Angular emits, which
    // get the per-request nonce in applyScriptNonce below.
    `script-src 'self' 'nonce-${nonce}'`,
    // Angular writes component styles and [style.x] bindings into the
    // server-rendered HTML as <style> tags and style="" attributes, which a
    // nonce can't cover. Styles can't run code, so this stays open.
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    // data: for tiny inline images, blob: for the admin's photo previews
    // (URL.createObjectURL) before upload.
    `img-src 'self' data: blob: ${IMAGE_HOSTS}`,
    "media-src 'self'",
    // The API is proxied through this same origin under /api.
    "connect-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    // Nobody may frame the site, so the admin panel can't be clickjacked.
    "frame-ancestors 'none'",
  ].join('; ');
}

const BEASTIES_SCRIPT =
  "document.querySelectorAll('link[data-beasties-media]').forEach(function(l){l.media=l.getAttribute('data-beasties-media');l.removeAttribute('data-beasties-media')})";
// Angular puts the event replay contract first thing in <body> (after only
// its own hydration comment), ahead of anything rendered from data.
const EVENT_CONTRACT_AT_BODY_START =
  /(<body[^>]*>\s*(?:<!--[^>]*-->\s*)*)<script type="text\/javascript" id="ng-event-dispatch-contract">/;
const JSACTION_BOOTSTRAP =
  /^window\.__jsaction_bootstrap\(document\.body,"ng",\[(?:"[a-z]+",?)*\],\[(?:"[a-z]+",?)*\]\);$/;

/**
 * Adds the nonce to the inline scripts Angular itself emits, matched by their
 * exact content, and to nothing else. Stamping every <script> in the page
 * would also bless one injected through rendered data, which is the case the
 * CSP exists to stop.
 */
export function applyScriptNonce(html: string, nonce: string): string {
  html = html.replace(
    EVENT_CONTRACT_AT_BODY_START,
    `$1<script nonce="${nonce}" type="text/javascript" id="ng-event-dispatch-contract">`,
  );

  return html.replace(/<script>([^<]*)<\/script>/g, (tag, body: string) =>
    body === BEASTIES_SCRIPT || JSACTION_BOOTSTRAP.test(body)
      ? `<script nonce="${nonce}">${body}</script>`
      : tag,
  );
}

/** Admin pages hold nothing for a search engine and shouldn't be listed. */
export function robotsTagFor(path: string): string | null {
  return path === '/admin' || path.startsWith('/admin/') ? 'noindex, nofollow' : null;
}
