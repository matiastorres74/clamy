import { execSync } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { afterAll } from 'vitest';

const TEST_DB_PATH = path.join(__dirname, '..', 'prisma', 'test.db');

process.env.DATABASE_URL = `file:${TEST_DB_PATH}`;
process.env.JWT_SECRET = 'test-secret';
process.env.CORS_ORIGIN = 'http://localhost:4200';

function removeTestDbFiles() {
  for (const suffix of ['', '-journal']) {
    const file = `${TEST_DB_PATH}${suffix}`;
    if (fs.existsSync(file)) fs.rmSync(file);
  }
}

removeTestDbFiles();

execSync('npx prisma db push --skip-generate --force-reset', {
  cwd: path.join(__dirname, '..'),
  env: process.env,
  stdio: 'inherit',
});

afterAll(async () => {
  const { prisma } = await import('../src/lib/prisma');
  await prisma.$disconnect();
  removeTestDbFiles();
});
