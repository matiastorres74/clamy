import { beforeEach, describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';

const app = createApp();

function adminToken() {
  return jwt.sign({ id: 1, username: 'admin' }, process.env.JWT_SECRET as string, {
    expiresIn: '1h',
  });
}

function validProductBody(overrides: Record<string, unknown> = {}) {
  return {
    name: 'Lámpara de pie',
    description: 'Una lámpara de pie de madera',
    price: 1000,
    category: 'lighting',
    featured: false,
    imageUrl: null,
    ...overrides,
  };
}

beforeEach(async () => {
  await prisma.product.deleteMany();
});

describe('GET /api/products', () => {
  it('returns an empty list when there are no products', async () => {
    const res = await request(app).get('/api/products');

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('filters by category', async () => {
    await prisma.product.create({ data: validProductBody() });
    await prisma.product.create({
      data: validProductBody({ name: 'Silla', category: 'furniture' }),
    });

    const res = await request(app).get('/api/products').query({ category: 'furniture' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].category).toBe('furniture');
  });

  it('filters by search term matching the name', async () => {
    await prisma.product.create({ data: validProductBody({ name: 'Lámpara colgante' }) });
    await prisma.product.create({ data: validProductBody({ name: 'Silla de madera' }) });

    const res = await request(app).get('/api/products').query({ search: 'Silla' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Silla de madera');
  });

  it('matches the search term regardless of case', async () => {
    await prisma.product.create({ data: validProductBody({ name: 'Aplique de pared LED' }) });

    const res = await request(app).get('/api/products').query({ search: 'aplique' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Aplique de pared LED');
  });

  it('matches the search term when the shopper omits accents', async () => {
    await prisma.product.create({ data: validProductBody({ name: 'Lámpara colgante Nordic' }) });

    const res = await request(app).get('/api/products').query({ search: 'lampara' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Lámpara colgante Nordic');
  });

  it('matches an accented search term against an unaccented name', async () => {
    await prisma.product.create({ data: validProductBody({ name: 'Organizador de bambu' }) });

    const res = await request(app).get('/api/products').query({ search: 'bambú' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
  });

  it('treats wildcard characters in the search term literally', async () => {
    await prisma.product.create({ data: validProductBody({ name: 'Descuento 50% verano' }) });
    await prisma.product.create({ data: validProductBody({ name: 'Silla de madera' }) });

    const res = await request(app).get('/api/products').query({ search: '50%' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Descuento 50% verano');
  });

  it('combines search with a category filter', async () => {
    await prisma.product.create({
      data: validProductBody({ name: 'Lámpara colgante', category: 'lighting' }),
    });
    await prisma.product.create({
      data: validProductBody({ name: 'Lampara de mesa', category: 'furniture' }),
    });

    const res = await request(app)
      .get('/api/products')
      .query({ search: 'lampara', category: 'lighting' });

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].category).toBe('lighting');
  });
});

describe('GET /api/products/:id', () => {
  it('returns the product when it exists', async () => {
    const created = await prisma.product.create({ data: validProductBody() });

    const res = await request(app).get(`/api/products/${created.id}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(created.id);
    expect(res.body.name).toBe(created.name);
  });

  it('returns 404 when the product does not exist', async () => {
    const res = await request(app).get('/api/products/999999');

    expect(res.status).toBe(404);
  });

  it('returns 400 when the id is not a number', async () => {
    const res = await request(app).get('/api/products/not-a-number');

    expect(res.status).toBe(400);
  });
});

describe('POST /api/products', () => {
  it('rejects requests without an admin token', async () => {
    const res = await request(app).post('/api/products').send(validProductBody());

    expect(res.status).toBe(401);
  });

  it('rejects requests with an invalid token', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', 'Bearer not-a-real-token')
      .send(validProductBody());

    expect(res.status).toBe(401);
  });

  it('creates a product with a valid token and body', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send(validProductBody());

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ name: 'Lámpara de pie', price: 1000, category: 'lighting' });

    const stored = await prisma.product.findUnique({ where: { id: res.body.id } });
    expect(stored).not.toBeNull();
  });

  it('rejects a missing name', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send(validProductBody({ name: '' }));

    expect(res.status).toBe(400);
  });

  it('rejects a negative price', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send(validProductBody({ price: -5 }));

    expect(res.status).toBe(400);
  });

  it('rejects an invalid category', async () => {
    const res = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send(validProductBody({ category: 'not-a-real-category' }));

    expect(res.status).toBe(400);
  });
});

describe('PUT /api/products/:id', () => {
  it('rejects requests without an admin token', async () => {
    const created = await prisma.product.create({ data: validProductBody() });

    const res = await request(app)
      .put(`/api/products/${created.id}`)
      .send(validProductBody({ name: 'Nuevo nombre' }));

    expect(res.status).toBe(401);
  });

  it('updates an existing product', async () => {
    const created = await prisma.product.create({ data: validProductBody() });

    const res = await request(app)
      .put(`/api/products/${created.id}`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .send(validProductBody({ name: 'Nuevo nombre', price: 2000 }));

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Nuevo nombre');
    expect(res.body.price).toBe(2000);
  });

  it('returns 404 when updating a product that does not exist', async () => {
    const res = await request(app)
      .put('/api/products/999999')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send(validProductBody());

    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/products/:id', () => {
  it('rejects requests without an admin token', async () => {
    const created = await prisma.product.create({ data: validProductBody() });

    const res = await request(app).delete(`/api/products/${created.id}`);

    expect(res.status).toBe(401);
  });

  it('deletes an existing product', async () => {
    const created = await prisma.product.create({ data: validProductBody() });

    const res = await request(app)
      .delete(`/api/products/${created.id}`)
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(204);

    const stored = await prisma.product.findUnique({ where: { id: created.id } });
    expect(stored).toBeNull();
  });

  it('returns 404 when deleting a product that does not exist', async () => {
    const res = await request(app)
      .delete('/api/products/999999')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(404);
  });
});
