import { z } from 'zod';

// Validated once at module load (triggered by the first import of this
// module, from either entry point) so a missing/malformed required variable
// fails startup with a clear message instead of surfacing later as a cryptic
// error deep inside a request handler (e.g. jsonwebtoken throwing on an
// undefined secret).
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(3001),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters'),
  CORS_ORIGIN: z.string().default('http://localhost:4200'),
});

export const env = envSchema.parse(process.env);
