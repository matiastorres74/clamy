import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'node:path';
import { authRouter } from './routes/auth';
import { productsRouter } from './routes/products';
import { categoriesRouter } from './routes/categories';
import { uploadRouter } from './routes/upload';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: process.env.CORS_ORIGIN ?? 'http://localhost:4200' }));
  app.use(express.json());
  app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

  app.use('/api/auth', authRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/categories', categoriesRouter);
  app.use('/api/upload', uploadRouter);

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  return app;
}
