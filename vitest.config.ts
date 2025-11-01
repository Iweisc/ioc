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
      // Coverage thresholds
      // Note: Functions already at 83.33%, Branches at 79.8% (near 80%)
      // Lines/Statements at 72.26% - limited by WASM/LLVM backends requiring external deps
      thresholds: {
        lines: 72,
        functions: 80,
        branches: 79,
        statements: 72,
      },
    },
  },
});
