import { beforeEach, describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';

const app = createApp();

function auth() {
  const token = jwt.sign({ id: 1, username: 'admin' }, process.env.JWT_SECRET as string, {
    expiresIn: '1h',
  });
  return `Bearer ${token}`;
}

const DEFAULT_IDS = ['christmas', 'furniture', 'lighting', 'decoration', 'kitchen', 'everyday-use'];

beforeEach(async () => {
  await prisma.product.deleteMany();
  await prisma.category.deleteMany({ where: { id: { notIn: DEFAULT_IDS } } });
  await prisma.$transaction(
    DEFAULT_IDS.map((id, position) =>
      prisma.category.upsert({
        where: { id },
        update: { position },
        create: { id, label: id, position },
      }),
    ),
  );
  await prisma.category.update({ where: { id: 'christmas' }, data: { label: 'Navidad' } });
});

describe('GET /api/categories', () => {
  it('lists the seeded categories in order, Navidad first', async () => {
    const res = await request(app).get('/api/categories');

    expect(res.status).toBe(200);
    expect(res.body.map((c: { id: string }) => c.id)).toEqual(DEFAULT_IDS);
    expect(res.body[0]).toEqual({ id: 'christmas', label: 'Navidad', position: 0 });
  });
});

describe('POST /api/categories', () => {
  it('requires an admin token', async () => {
    const res = await request(app).post('/api/categories').send({ label: 'Jardín' });
    expect(res.status).toBe(401);
  });

  it('creates a category with a slug id at the end of the list', async () => {
    const res = await request(app)
      .post('/api/categories')
      .set('Authorization', auth())
      .send({ label: '  Jardín y Exterior ' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ id: 'jardin-y-exterior', label: 'Jardín y Exterior', position: 6 });
  });

  it('rejects an empty label and a duplicate', async () => {
    const empty = await request(app)
      .post('/api/categories')
      .set('Authorization', auth())
      .send({ label: '   ' });
    const dup = await request(app)
      .post('/api/categories')
      .set('Authorization', auth())
      .send({ label: 'Lighting' });

    expect(empty.status).toBe(400);
    expect(dup.status).toBe(409);
  });

  it('lets products use the new category', async () => {
    await request(app).post('/api/categories').set('Authorization', auth()).send({ label: 'Jardín' });

    const res = await request(app)
      .post('/api/products')
      .set('Authorization', auth())
      .send({ name: 'Maceta', description: '', price: 10, category: 'jardin' });

    expect(res.status).toBe(201);
  });
});

describe('PUT /api/categories/:id', () => {
  it('renames without changing the id', async () => {
    const res = await request(app)
      .put('/api/categories/kitchen')
      .set('Authorization', auth())
      .send({ label: 'Cocina y bazar' });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ id: 'kitchen', label: 'Cocina y bazar' });
  });

  it('answers 404 for an unknown category', async () => {
    const res = await request(app)
      .put('/api/categories/nope')
      .set('Authorization', auth())
      .send({ label: 'X' });
    expect(res.status).toBe(404);
  });
});

describe('PUT /api/categories/order', () => {
  it('reorders every category', async () => {
    const reversed = [...DEFAULT_IDS].reverse();
    const res = await request(app)
      .put('/api/categories/order')
      .set('Authorization', auth())
      .send({ ids: reversed });

    expect(res.status).toBe(200);
    expect(res.body.map((c: { id: string }) => c.id)).toEqual(reversed);
  });

  it('rejects a partial list', async () => {
    const res = await request(app)
      .put('/api/categories/order')
      .set('Authorization', auth())
      .send({ ids: ['kitchen'] });
    expect(res.status).toBe(409);
  });
});

describe('DELETE /api/categories/:id', () => {
  it('deletes an unused category', async () => {
    const res = await request(app).delete('/api/categories/kitchen').set('Authorization', auth());

    expect(res.status).toBe(204);
    expect(await prisma.category.findUnique({ where: { id: 'kitchen' } })).toBeNull();
  });

  it('refuses while products still use it', async () => {
    await prisma.product.create({
      data: { name: 'Taza', description: '', price: 1, category: 'kitchen' },
    });

    const res = await request(app).delete('/api/categories/kitchen').set('Authorization', auth());

    expect(res.status).toBe(409);
    expect(res.body.productCount).toBe(1);
  });
});
