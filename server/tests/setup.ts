import { execSync } from 'node:child_process';
import path from 'node:path';
import { afterAll } from 'vitest';

// Requires a disposable Postgres reachable via TEST_DATABASE_URL, e.g.:
//   docker run --rm -p 5433:5432 -e POSTGRES_PASSWORD=test postgres:16
//   TEST_DATABASE_URL="postgresql://postgres:test@localhost:5433/clamy_test"
if (!process.env.TEST_DATABASE_URL) {
  throw new Error(
    'TEST_DATABASE_URL must point at a disposable Postgres database before running tests',
  );
}

process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.DIRECT_URL = process.env.TEST_DATABASE_URL;
process.env.JWT_SECRET = 'test-secret-at-least-16-chars';
process.env.CORS_ORIGIN = 'http://localhost:4200';

execSync('npx prisma db push --skip-generate --force-reset', {
  cwd: path.join(__dirname, '..'),
  env: process.env,
  stdio: 'inherit',
});

afterAll(async () => {
  const { prisma } = await import('../src/lib/prisma');
  await prisma.$disconnect();
});
