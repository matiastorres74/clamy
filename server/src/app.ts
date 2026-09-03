import 'express-async-errors';
import express, { NextFunction, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './lib/env';
import { prisma } from './lib/prisma';
import { authRouter } from './routes/auth';
import { productsRouter } from './routes/products';
import { categoriesRouter } from './routes/categories';
import { uploadRouter } from './routes/upload';

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN }));
  app.use(express.json());

  app.use('/api/auth', authRouter);
  app.use('/api/products', productsRouter);
  app.use('/api/categories', categoriesRouter);
  app.use('/api/upload', uploadRouter);

  // Checks the database round-trip, not just that the process is up — the
  // DB is now a network hop away (Postgres) instead of a local file, so
  // "process is running" no longer implies "requests will succeed."
  app.get('/api/health', async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      res.json({ ok: true, database: 'ok' });
    } catch {
      res.status(503).json({ ok: false, database: 'unreachable' });
    }
  });

  // Catches rejections from async route handlers (forwarded here by
  // express-async-errors, since Express 4 doesn't do this natively) so a
  // database hiccup returns a 500 instead of crashing the process. Logged as
  // structured JSON so Vercel's log explorer can filter/search on it.
  app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
    console.error(
      JSON.stringify({
        timestamp: new Date().toISOString(),
        level: 'error',
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
        method: req.method,
        path: req.path,
      }),
    );
    res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}
