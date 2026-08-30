import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { clientEnvSchema } from './env.schema.ts';

export default defineConfig(({ mode }) => {
  const rawEnv = loadEnv(mode, process.cwd(), 'VITE_');

  const result = clientEnvSchema.safeParse(rawEnv);

  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('\n');

    throw new Error(`Invalid client environment variables:\n${errors}`);
  }

  return {
    plugins: [react()],
  };
});
