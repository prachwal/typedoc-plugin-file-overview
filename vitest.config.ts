/**
 * @file packages/typedoc-plugin-file-overview/vitest.config.ts
 * Local Vitest configuration for the file overview plugin package.
 * @sideEffects None
 */

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
