import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  PORT: z.coerce.number().int().min(1).max(65535).default(3000),

  CLIENT_ORIGIN: z.url().default('http://localhost:5173'),

  GDELT_LASTUPDATE_URL: z.url().default('https://data.gdeltproject.org/gdeltv2/lastupdate.txt'),

  DATABASE_URL: z.url(),

  REDIS_URL: z.url(),

  API_CACHE_TTL_SECONDS: z.coerce.number().int().min(1).max(3600).default(60),

  GDELT_MANIFEST_CACHE_TTL_SECONDS: z.coerce.number().int().min(1).max(900).default(60),
});

const result = envSchema.safeParse(process.env);

if (!result.success) {
  console.error('Invalid server environment variables:');

  for (const issue of result.error.issues) {
    console.error(`- ${issue.path.join('.')}: ${issue.message}`);
  }

  process.exit(1);
}

export const env = result.data;
