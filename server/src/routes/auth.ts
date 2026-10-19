import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { env } from '../lib/env';
import { loginLimiter } from '../middleware/loginLimiter';

export const authRouter = Router();

// Compared against when the username doesn't exist. Answering that case
// straight away skipped the ~100ms bcrypt check, so response time alone told
// an attacker which usernames are real. Same cost factor (10) as the hashes
// prisma/seed.ts stores, so both paths take the same time.
const DUMMY_PASSWORD_HASH = '$2a$10$qYu3U0mezoNPiHERf5qTN.adGVIKt3l18vs5RhN9nxi1C62bD3bc6';

authRouter.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body ?? {};

  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'username and password are required' });
  }

  const admin = await prisma.adminUser.findUnique({ where: { username } });
  const valid = await bcrypt.compare(password, admin?.passwordHash ?? DUMMY_PASSWORD_HASH);
  if (!admin || !valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: admin.id, username: admin.username }, env.JWT_SECRET, {
    expiresIn: '8h',
  });

  res.json({ token, username: admin.username });
});
