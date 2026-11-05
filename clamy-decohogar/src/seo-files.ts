import { CATEGORIES, Product } from './app/core/models/product.model';

export const SITE_URL = 'https://clamy-web.vercel.app';

// Nothing is blocked on purpose: the admin pages hold no data without a login.
export const ROBOTS_TXT = `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function urlEntry(path: string, lastmod?: string): string {
  const lastmodTag = lastmod ? `<lastmod>${escapeXml(lastmod)}</lastmod>` : '';
  return `  <url><loc>${escapeXml(SITE_URL + path)}</loc>${lastmodTag}</url>`;
}

/** Public pages only: the admin routes have nothing to offer a search engine. */
export function buildSitemapXml(products: Pick<Product, 'id' | 'updatedAt'>[]): string {
  const entries = [
    urlEntry('/'),
    urlEntry('/productos'),
    ...CATEGORIES.map((category) => urlEntry(`/productos?category=${category.id}`)),
    ...products.map((product) => urlEntry(`/productos/${product.id}`, product.updatedAt)),
  ];
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries,
    '</urlset>',
    '',
  ].join('\n');
}
