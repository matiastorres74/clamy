import { NextFunction, Request, Response } from 'express';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

// A serverless function has no shared memory across invocations/instances,
// so an in-process counter (e.g. express-rate-limit's default store) doesn't
// actually limit anything in production — each cold start/replica gets its
// own counter. Upstash Redis gives every invocation the same shared counter.
const hasUpstashConfig =
  (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) ||
  (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

const ratelimit = hasUpstashConfig
  ? new Ratelimit({
      redis: Redis.fromEnv(),
      limiter: Ratelimit.slidingWindow(10, '15 m'),
      prefix: 'clamy:login',
    })
  : null;

if (!ratelimit) {
  console.warn(
    'No Upstash Redis configured (UPSTASH_REDIS_REST_URL/TOKEN or KV_REST_API_URL/TOKEN) — admin login rate limiting is disabled.',
  );
}

export async function loginLimiter(req: Request, res: Response, next: NextFunction) {
  if (!ratelimit) return next();

  // Fail open: a Redis blip should degrade rate limiting, not take down
  // admin login entirely (bcrypt still slows brute-forcing in the meantime).
  try {
    const identifier = req.ip ?? 'unknown';
    const { success, reset } = await ratelimit.limit(identifier);

    if (!success) {
      res.setHeader('Retry-After', Math.ceil((reset - Date.now()) / 1000).toString());
      return res.status(429).json({ error: 'Too many login attempts. Try again later.' });
    }
  } catch (err) {
    console.error('Rate limiter unavailable, allowing request through:', err);
  }

  next();
}
