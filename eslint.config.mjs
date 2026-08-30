import js from '@eslint/js';
import { defineConfig, globalIgnores } from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier/flat';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default defineConfig(
  globalIgnores(['**/node_modules/**', '**/dist/**', '**/coverage/**']),

  {
    files: ['**/*.{ts,tsx,mts,cts}'],

    extends: [
      js.configs.recommended,
      tseslint.configs.strictTypeChecked,
      tseslint.configs.stylisticTypeChecked,
    ],

    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },

  {
    files: ['apps/client/**/*.{ts,tsx}'],

    extends: [reactHooks.configs.flat.recommended, reactRefresh.configs.vite],

    languageOptions: {
      globals: globals.browser,
    },
  },

  {
    files: ['apps/server/**/*.ts'],

    languageOptions: {
      globals: globals.node,
    },
  },

  {
    files: ['**/*.{js,mjs,cjs}'],

    extends: [js.configs.recommended],

    languageOptions: {
      globals: globals.node,
    },
  },

  eslintConfigPrettier,
);
