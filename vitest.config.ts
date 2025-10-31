import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.spec.ts',
        '**/*.test.ts',
        'src/types/**', // Type definitions
        'src/cli/**', // CLI - tested via smoke tests
      ],
      // Coverage thresholds - set to current baseline to prevent regression
      thresholds: {
        lines: 29,
        functions: 48,
        branches: 66,
        statements: 29,
      },
    },
  },
});
