import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import type { RuntimeCache } from '@vercel/functions';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';
import { setCacheForTests } from '../src/lib/cache';

const app = createApp();

function adminToken() {
  return jwt.sign({ id: 1, username: 'admin' }, process.env.JWT_SECRET as string, {
    expiresIn: '1h',
  });
}

function productData(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Lámpara de pie',
    description: 'Una lámpara de pie de madera',
    price: 1000,
    category: 'lighting',
    featured: false,
    images: [],
    ...overrides,
  };
}

// Behaves like the Runtime Cache for what the API relies on: values by key,
// and expireTag dropping every entry that carries one of the tags.
class FakeRuntimeCache implements RuntimeCache {
  entries = new Map<string, { value: unknown; tags: string[] }>();
  failReads = false;

  get = async (key: string) => {
    if (this.failReads) throw new Error('cache unreachable');
    return this.entries.get(key)?.value ?? null;
  };
  set = async (key: string, value: unknown, options?: { tags?: string[] }) => {
    // Stored as JSON, like the real cache, so a test cannot pass by sharing
    // an object reference with the route.
    this.entries.set(key, { value: JSON.parse(JSON.stringify(value)), tags: options?.tags ?? [] });
  };
  delete = async (key: string) => {
    this.entries.delete(key);
  };
  expireTag = async (tag: string | string[]) => {
    const tags = Array.isArray(tag) ? tag : [tag];
    for (const [key, entry] of this.entries) {
      if (entry.tags.some((t) => tags.includes(t))) this.entries.delete(key);
    }
  };
}

let cache: FakeRuntimeCache;

beforeEach(async () => {
  await prisma.product.deleteMany();
  cache = new FakeRuntimeCache();
  setCacheForTests(cache);
});

afterEach(() => {
  setCacheForTests(undefined);
});

describe('product reads', () => {
  it('serves the anonymous list from the cache until an admin write expires it', async () => {
    await prisma.product.create({ data: productData({ name: 'Primero' }) });
    await request(app).get('/api/products');

    // Written straight to the database, bypassing the API: still cached.
    await prisma.product.create({ data: productData({ name: 'Directo' }) });
    const stale = await request(app).get('/api/products');
    expect(stale.body.map((p: { name: string }) => p.name)).toEqual(['Primero']);

    // A write through the API expires the tag, so the next read is fresh.
    await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send(productData({ name: 'Por la API' }));
    const fresh = await request(app).get('/api/products');
    expect(fresh.body).toHaveLength(3);
  });

  it('keys the list by its filters', async () => {
    await prisma.product.create({ data: productData({ name: 'Destacado', featured: true }) });
    await prisma.product.create({ data: productData({ name: 'Común' }) });

    const featured = await request(app).get('/api/products?featured=true');
    const all = await request(app).get('/api/products');

    expect(featured.body.map((p: { name: string }) => p.name)).toEqual(['Destacado']);
    expect(all.body).toHaveLength(2);
  });

  it('never caches the admin view, which carries prices', async () => {
    await prisma.product.create({ data: productData() });

    const res = await request(app)
      .get('/api/products')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.body[0].price).toBe(1000);
    expect(cache.entries.size).toBe(0);

    // And an anonymous read afterwards still gets the public projection.
    const anon = await request(app).get('/api/products');
    expect(anon.body[0]).not.toHaveProperty('price');
  });

  it('does not cache free-text searches', async () => {
    await prisma.product.create({ data: productData() });

    const res = await request(app).get('/api/products?search=lampara');

    expect(res.body).toHaveLength(1);
    expect(cache.entries.size).toBe(0);
  });

  it('caches a product page and expires it when the product is edited', async () => {
    const product = await prisma.product.create({ data: productData({ name: 'Antes' }) });
    await request(app).get(`/api/products/${product.id}`);
    expect(cache.entries.size).toBe(1);

    await request(app)
      .put(`/api/products/${product.id}`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send(productData({ name: 'Después' }));
    const res = await request(app).get(`/api/products/${product.id}`);

    expect(res.body.name).toBe('Después');
  });

  it('does not store a 404', async () => {
    const missing = await request(app).get('/api/products/999999');

    expect(missing.status).toBe(404);
    expect(cache.entries.size).toBe(0);
  });

  it('expires the list when a product is deleted', async () => {
    const product = await prisma.product.create({ data: productData() });
    await request(app).get('/api/products');

    await request(app)
      .delete(`/api/products/${product.id}`)
      .set('Authorization', `Bearer ${adminToken()}`);
    const res = await request(app).get('/api/products');

    expect(res.body).toEqual([]);
  });

  it('falls back to the database when the cache is unreachable', async () => {
    await prisma.product.create({ data: productData() });
    cache.failReads = true;

    const res = await request(app).get('/api/products');

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });
});

describe('category reads', () => {
  it('serves the list from the cache and expires it on rename', async () => {
    const before = await request(app).get('/api/categories');
    const first = before.body[0];
    expect(cache.entries.has('categories:list')).toBe(true);

    try {
      await request(app)
        .put(`/api/categories/${first.id}`)
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ label: 'Renombrada' });
      const after = await request(app).get('/api/categories');

      expect(after.body[0].label).toBe('Renombrada');
    } finally {
      // Put the seeded label back for the other suites.
      await prisma.category.update({ where: { id: first.id }, data: { label: first.label } });
    }
  });
});

describe('outside Vercel', () => {
  it('caches nothing, so local edits show up at once', async () => {
    setCacheForTests(undefined);
    const previous = process.env.VERCEL;
    delete process.env.VERCEL;
    try {
      await request(app).get('/api/products');
      await prisma.product.create({ data: productData() });
      const res = await request(app).get('/api/products');
      expect(res.body).toHaveLength(1);
    } finally {
      if (previous !== undefined) process.env.VERCEL = previous;
    }
  });
});
