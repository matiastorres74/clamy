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
  // The Blob SDK only auto-discovers the unprefixed name, but Vercel's
  // dashboard integration names the variable after the prefix chosen when the
  // store is connected (the public store came in as BLOB_PUBLIC_*). Sensitive
  // values can't be read back to copy them across, so accept both here.
  BLOB_READ_WRITE_TOKEN: z.string().min(1).optional(),
  BLOB_PUBLIC_READ_WRITE_TOKEN: z.string().min(1).optional(),
});

export const env = envSchema.parse(process.env);

// Undefined is fine: the SDK then does its own lookup and uploads report a
// clear 500 if nothing is configured. The unprefixed name wins so a manually
// set token still takes precedence over whatever the integration generated.
export const blobToken = env.BLOB_READ_WRITE_TOKEN ?? env.BLOB_PUBLIC_READ_WRITE_TOKEN;
