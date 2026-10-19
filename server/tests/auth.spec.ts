import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import bcrypt from 'bcryptjs';
import request from 'supertest';
import { createApp } from '../src/app';
import { prisma } from '../src/lib/prisma';

const app = createApp();

beforeEach(async () => {
  await prisma.adminUser.deleteMany();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('POST /api/auth/login', () => {
  it('logs in with the right password and rejects a wrong one', async () => {
    // Cost 4 keeps the test fast; the route doesn't depend on the cost factor.
    await prisma.adminUser.create({
      data: { username: 'admin', passwordHash: await bcrypt.hash('correct-horse', 4) },
    });

    const ok = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'correct-horse' });
    const wrong = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'nope' });

    expect(ok.status).toBe(200);
    expect(ok.body).toEqual({ token: expect.any(String), username: 'admin' });
    expect(wrong.status).toBe(401);
  });

  // Regression: an unknown username used to return before bcrypt ran, so
  // its faster response revealed which usernames exist.
  it('runs the password check even when the username does not exist', async () => {
    const compare = vi.spyOn(bcrypt, 'compare');

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'nobody', password: 'guess' });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ error: 'Invalid credentials' });
    expect(compare).toHaveBeenCalledTimes(1);
  });

  // Regression: express.json()'s parse error reached the global handler,
  // which answered 500 and logged it as a server failure.
  it('answers 400 for a malformed JSON body', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .send('{"username": "x",');

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error');
  });
});
