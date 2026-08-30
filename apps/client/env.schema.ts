import { z } from 'zod';

export const clientEnvSchema = z.object({
  VITE_API_BASE_URL: z.url(),
});
