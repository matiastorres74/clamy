import { PrismaClient } from '@prisma/client';

// Vercel functions can reuse a warm container between invocations. Without
// caching the client on globalThis, every invocation (and every hot reload
// in dev) would open a fresh pool of Postgres connections until the DB's
// connection limit is exhausted.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
