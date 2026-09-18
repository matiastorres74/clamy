import { beforeEach, describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import request from 'supertest';

// Stub the Blob SDK so these tests never need real credentials or network.
vi.mock('@vercel/blob', () => ({ put: vi.fn() }));

import { put } from '@vercel/blob';
import { createApp } from '../src/app';

const app = createApp();
const mockedPut = vi.mocked(put);

// Smallest valid PNG (1x1, transparent) — enough for multer's mimetype check.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

function adminToken() {
  return jwt.sign({ id: 1, username: 'admin' }, process.env.JWT_SECRET as string, {
    expiresIn: '1h',
  });
}

beforeEach(() => {
  mockedPut.mockReset();
});

describe('POST /api/upload', () => {
  it('rejects requests without an admin token', async () => {
    const res = await request(app).post('/api/upload').attach('image', PNG, 'photo.png');

    expect(res.status).toBe(401);
    expect(mockedPut).not.toHaveBeenCalled();
  });

  it('rejects requests with no file', async () => {
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'No image file provided' });
  });

  it('rejects files that are not images', async () => {
    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${adminToken()}`)
      .attach('image', Buffer.from('not an image'), { filename: 'notes.txt', contentType: 'text/plain' });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/JPEG, PNG, WEBP or GIF/);
    expect(mockedPut).not.toHaveBeenCalled();
  });

  it('stores the image and returns its public URL', async () => {
    mockedPut.mockResolvedValue({ url: 'https://blob.example/abc.png' } as never);

    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${adminToken()}`)
      .attach('image', PNG, { filename: 'photo.png', contentType: 'image/png' });

    expect(res.status).toBe(201);
    expect(res.body).toEqual({ imageUrl: 'https://blob.example/abc.png' });
    expect(mockedPut).toHaveBeenCalledWith(
      expect.stringMatching(/\.png$/),
      expect.any(Buffer),
      expect.objectContaining({ access: 'public', contentType: 'image/png' }),
    );
  });

  // Regression: this used to be an unhandled rejection inside multer's
  // callback, which never answered the request and crashed the process.
  it('answers 500 instead of hanging when blob storage fails', async () => {
    mockedPut.mockRejectedValue(new Error('No blob credentials found'));

    const res = await request(app)
      .post('/api/upload')
      .set('Authorization', `Bearer ${adminToken()}`)
      .attach('image', PNG, { filename: 'photo.png', contentType: 'image/png' });

    expect(res.status).toBe(500);
    expect(res.body).toEqual({ error: 'Internal server error' });
  });
});
