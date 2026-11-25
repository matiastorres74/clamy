import { applyScriptNonce, buildCsp, robotsTagFor } from './security-headers';

const NONCE = 'abc123==';

const CONTRACT = '<script type="text/javascript" id="ng-event-dispatch-contract">(()=>{})()</script>';
const BEASTIES =
  "<script>document.querySelectorAll('link[data-beasties-media]').forEach(function(l){l.media=l.getAttribute('data-beasties-media');l.removeAttribute('data-beasties-media')})</script>";
const BOOTSTRAP = '<script>window.__jsaction_bootstrap(document.body,"ng",["click","input"],[]);</script>';

function page(head: string, body: string): string {
  return `<html><head>${head}</head>\n<body><!--nghm-->${body}</body></html>`;
}

describe('applyScriptNonce', () => {
  it("stamps Angular's three inline scripts", () => {
    const html = applyScriptNonce(page('', `${CONTRACT}<app-root></app-root>${BOOTSTRAP}${BEASTIES}`), NONCE);

    expect(html).toContain(`<script nonce="${NONCE}" type="text/javascript" id="ng-event-dispatch-contract">`);
    expect(html).toContain(`<script nonce="${NONCE}">window.__jsaction_bootstrap(`);
    expect(html).toContain(`<script nonce="${NONCE}">document.querySelectorAll(`);
  });

  it('leaves any other inline script without a nonce', () => {
    const injected = [
      '<script>alert(1)</script>',
      '<script>window.__jsaction_bootstrap(document.body,"ng",["click"],[]);alert(1)</script>',
      // The contract only counts as Angular's when it opens <body>.
      `<p>x</p>${CONTRACT}`,
    ];
    const html = applyScriptNonce(page('', injected.join('')), NONCE);

    expect(html).not.toContain('nonce=');
  });

  it('does not touch scripts loaded from a file', () => {
    const tag = '<script src="main-ABC.js" type="module"></script>';
    expect(applyScriptNonce(page(tag, ''), NONCE)).toContain(tag);
  });
});

describe('buildCsp', () => {
  const csp = buildCsp(NONCE);

  it('allows scripts only from this origin or with the nonce', () => {
    expect(csp).toContain(`script-src 'self' 'nonce-${NONCE}'`);
    expect(csp).not.toMatch(/script-src[^;]*unsafe-inline/);
  });

  it('forbids framing and plugins', () => {
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
  });
});

describe('robotsTagFor', () => {
  it('marks the admin pages noindex', () => {
    expect(robotsTagFor('/admin')).toBe('noindex, nofollow');
    expect(robotsTagFor('/admin/login')).toBe('noindex, nofollow');
  });

  it('leaves the storefront alone', () => {
    for (const path of ['/', '/productos', '/productos/3', '/administracion']) {
      expect(robotsTagFor(path)).toBeNull();
    }
  });
});
