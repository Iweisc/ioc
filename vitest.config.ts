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
        'src/parser/ast.ts', // Type definitions only
        '*.config.ts', // Config files
        '*.config.js', // Config files
        '**/eslint.config.js',
        '**/tsup.config.ts',
        '**/vitest.config.ts',
      ],
      // Coverage thresholds - all metrics now exceed 80%
      // Lines: 82.2%, Functions: 84.73%, Branches: 80.12%, Statements: 82.2%
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
