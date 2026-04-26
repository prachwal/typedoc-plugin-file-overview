/**
 * @file packages/typedoc-plugin-file-overview/eslint.config.ts
 * Local ESLint configuration for the file overview plugin package.
 * @sideEffects None
 */

import tseslint from 'typescript-eslint';
import tsdocPlugin from 'eslint-plugin-tsdoc';
import vitestPlugin from '@vitest/eslint-plugin';

export default tseslint.config(
  {
    ignores: ['dist/**', 'artifacts/**', 'node_modules/**'],
  },
  {
    files: ['src/**/*.ts', 'eslint.config.ts', 'vitest.config.ts'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ['src/**/*.ts', 'eslint.config.ts', 'vitest.config.ts'],
    plugins: {
      tsdoc: tsdocPlugin,
    },
    rules: {
      'tsdoc/syntax': 'warn',
    },
  },
  {
    files: ['src/**/*.test.ts', '**/*.spec.ts'],
    plugins: {
      vitest: vitestPlugin,
    },
    rules: {
      ...(vitestPlugin.configs?.recommended?.rules ?? {}),
    },
  },
);
