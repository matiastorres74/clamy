import { CATEGORIES } from './app/core/models/product.model';
import { ROBOTS_TXT, SITE_URL, buildSitemapXml } from './seo-files';

describe('buildSitemapXml', () => {
  const xml = buildSitemapXml([{ id: 52, updatedAt: '2026-10-01T12:00:00.000Z' }]);

  it('lists the home page, the catalogue and every category', () => {
    expect(xml).toContain(`<loc>${SITE_URL}/</loc>`);
    expect(xml).toContain(`<loc>${SITE_URL}/productos</loc>`);
    for (const category of CATEGORIES) {
      expect(xml).toContain(`<loc>${SITE_URL}/productos?category=${category.id}</loc>`);
    }
  });

  it('lists each product with the date it last changed', () => {
    expect(xml).toContain(
      `<url><loc>${SITE_URL}/productos/52</loc><lastmod>2026-10-01T12:00:00.000Z</lastmod></url>`,
    );
  });

  it('leaves out the admin pages', () => {
    expect(xml).not.toContain('/admin');
  });

  it('produces XML a parser accepts', () => {
    const parsed = new DOMParser().parseFromString(xml, 'application/xml');
    expect(parsed.querySelector('parsererror')).toBeNull();
    expect(parsed.querySelectorAll('url').length).toBe(2 + CATEGORIES.length + 1);
  });
});

describe('ROBOTS_TXT', () => {
  it('blocks nothing and points to the sitemap', () => {
    expect(ROBOTS_TXT).not.toMatch(/Disallow/i);
    expect(ROBOTS_TXT).toContain(`Sitemap: ${SITE_URL}/sitemap.xml`);
  });
});
