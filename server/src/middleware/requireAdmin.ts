import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../lib/env';

export interface AuthedRequest extends Request {
  admin?: { id: number; username: string };
}

function readAdmin(req: AuthedRequest): { id: number; username: string } | null {
  const header = req.headers.authorization;
  const token = header?.startsWith('Bearer ') ? header.slice('Bearer '.length) : null;
  if (!token) return null;
  try {
    return jwt.verify(token, env.JWT_SECRET) as { id: number; username: string };
  } catch {
    return null;
  }
}

export function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing authorization token' });
  }
  const admin = readAdmin(req);
  if (!admin) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  req.admin = admin;
  next();
}

// For public routes whose response differs for a logged-in admin (the
// product listing includes prices only for them). Never rejects: a missing or
// bad token just means an anonymous visitor.
export function optionalAdmin(req: AuthedRequest, _res: Response, next: NextFunction) {
  const admin = readAdmin(req);
  if (admin) req.admin = admin;
  next();
}
