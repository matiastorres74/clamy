import { Request, Response, Router } from 'express';
import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';
import { put } from '@vercel/blob';
import { blobToken } from '../lib/env';
import { requireAdmin } from '../middleware/requireAdmin';

const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, WEBP or GIF images are allowed'));
    }
    cb(null, true);
  },
});

export const uploadRouter = Router();

// Multer only speaks callbacks. Wrapping it lets the route below be a plain
// async handler, which matters more than it looks: the previous version did
// the Blob upload *inside* multer's callback, so when `put()` rejected (e.g.
// no BLOB_READ_WRITE_TOKEN) nothing awaited that promise. express-async-errors
// never saw it, no response was written, and Node treated it as an unhandled
// rejection and killed the process — every image upload took the API down.
function parseImage(req: Request, res: Response): Promise<void> {
  return new Promise((resolve, reject) => {
    upload.single('image')(req, res, (err: unknown) => (err ? reject(err) : resolve()));
  });
}

uploadRouter.post('/', requireAdmin, async (req, res) => {
  try {
    await parseImage(req, res);
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : 'Invalid upload' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'No image file provided' });
  }

  // A failure here now propagates to the global error handler in app.ts,
  // which logs it and answers 500 instead of leaving the request hanging.
  const ext = path.extname(req.file.originalname).toLowerCase();
  // `access: 'public'` is deliberate: the storefront renders these URLs in
  // plain <img> tags for anonymous visitors, so the store itself must be
  // public too — a private store rejects this call outright.
  const blob = await put(`${crypto.randomUUID()}${ext}`, req.file.buffer, {
    access: 'public',
    contentType: req.file.mimetype,
    token: blobToken,
  });

  res.status(201).json({ imageUrl: blob.url });
});
