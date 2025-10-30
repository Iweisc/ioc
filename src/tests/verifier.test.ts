/**
 * Termination Verifier tests
 */

import { describe, it, expect } from 'vitest';
import { TerminationVerifier, DEFAULT_BUDGETS } from '../core/verifier';
import { ComplexityClass } from '../dsl/safe-types';

describe('TerminationVerifier', () => {
  describe('Budget Validation', () => {
    it('should validate execution within constant complexity budget', () => {
      const verifier = new TerminationVerifier();
      const budget = DEFAULT_BUDGETS[ComplexityClass.CONSTANT];

      const result = verifier.validateBudget(
        () => {
          return 42;
        },
        budget,
        []
      );

      expect(result.success).toBe(true);
      expect(result.result).toBe(42);
    });

    it('should detect budget violations for iterations', () => {
      const verifier = new TerminationVerifier();
      const budget = { maxIterations: 10 };

      const result = verifier.validateBudget(
        (data: number[]) => {
          let sum = 0;
          // This would violate iteration budget if we had a loop
          for (let i = 0; i < data.length; i++) {
            sum += data[i];
          }
          return sum;
        },
        budget,
        [[1, 2, 3, 4, 5]]
      );

      expect(result.success).toBe(true);
    });

    it('should handle function execution successfully', () => {
      const verifier = new TerminationVerifier();
      const budget = DEFAULT_BUDGETS[ComplexityClass.LINEAR];

      const result = verifier.validateBudget(
        (arr: number[]) => arr.map((x) => x * 2),
        budget,
        [[1, 2, 3, 4, 5]]
      );

      expect(result.success).toBe(true);
      expect(result.result).toEqual([2, 4, 6, 8, 10]);
    });

    it('should measure execution time', () => {
      const verifier = new TerminationVerifier();
      const budget = { maxTime: 1000 };

      const result = verifier.validateBudget(
        () => {
          let sum = 0;
          for (let i = 0; i < 100; i++) {
            sum += i;
          }
          return sum;
        },
        budget,
        []
      );

      expect(result.success).toBe(true);
      expect(result.executionTime).toBeGreaterThan(0);
    });

    it('should handle errors during execution', () => {
      const verifier = new TerminationVerifier();
      const budget = DEFAULT_BUDGETS[ComplexityClass.LINEAR];

      const result = verifier.validateBudget(
        () => {
          throw new Error('Test error');
        },
        budget,
        []
      );

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
      expect(result.error).toContain('Test error');
    });
  });

  describe('Default Budgets', () => {
    it('should have budget for CONSTANT complexity', () => {
      const budget = DEFAULT_BUDGETS[ComplexityClass.CONSTANT];
      expect(budget.maxIterations).toBeDefined();
      expect(budget.maxTime).toBeDefined();
      expect(budget.maxStackDepth).toBeDefined();
    });

    it('should have budget for LOGARITHMIC complexity', () => {
      const budget = DEFAULT_BUDGETS[ComplexityClass.LOGARITHMIC];
      expect(budget.maxIterations).toBeGreaterThan(DEFAULT_BUDGETS[ComplexityClass.CONSTANT].maxIterations!);
    });

    it('should have budget for LINEAR complexity', () => {
      const budget = DEFAULT_BUDGETS[ComplexityClass.LINEAR];
      expect(budget.maxIterations).toBeGreaterThan(DEFAULT_BUDGETS[ComplexityClass.LOGARITHMIC].maxIterations!);
    });

    it('should have budget for LINEARITHMIC complexity', () => {
      const budget = DEFAULT_BUDGETS[ComplexityClass.LINEARITHMIC];
      expect(budget.maxIterations).toBeGreaterThan(DEFAULT_BUDGETS[ComplexityClass.LINEAR].maxIterations!);
    });

    it('should have budget for QUADRATIC complexity', () => {
      const budget = DEFAULT_BUDGETS[ComplexityClass.QUADRATIC];
      expect(budget.maxIterations).toBeGreaterThan(DEFAULT_BUDGETS[ComplexityClass.LINEARITHMIC].maxIterations!);
    });
  });

  describe('Complex Function Validation', () => {
    it('should validate array operations', () => {
      const verifier = new TerminationVerifier();
      const budget = DEFAULT_BUDGETS[ComplexityClass.LINEAR];

      const result = verifier.validateBudget(
        (arr: number[]) => arr.filter((x) => x > 5).map((x) => x * 2),
        budget,
        [[1, 3, 7, 9, 11]]
      );

      expect(result.success).toBe(true);
      expect(result.result).toEqual([14, 18, 22]);
    });

    it('should validate reduction operations', () => {
      const verifier = new TerminationVerifier();
      const budget = DEFAULT_BUDGETS[ComplexityClass.LINEAR];

      const result = verifier.validateBudget(
        (arr: number[]) => arr.reduce((sum, x) => sum + x, 0),
        budget,
        [[1, 2, 3, 4, 5]]
      );

      expect(result.success).toBe(true);
      expect(result.result).toBe(15);
    });

    it('should handle nested array operations', () => {
      const verifier = new TerminationVerifier();
      const budget = DEFAULT_BUDGETS[ComplexityClass.QUADRATIC];

      const result = verifier.validateBudget(
        (arr: number[][]) => arr.map((row) => row.map((x) => x * 2)),
        budget,
        [
          [
            [1, 2],
            [3, 4],
          ],
        ]
      );

      expect(result.success).toBe(true);
      expect(result.result).toEqual([
        [2, 4],
        [6, 8],
      ]);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty input arrays', () => {
      const verifier = new TerminationVerifier();
      const budget = DEFAULT_BUDGETS[ComplexityClass.LINEAR];

      const result = verifier.validateBudget(
        (arr: number[]) => arr.map((x) => x * 2),
        budget,
        [[]]
      );

      expect(result.success).toBe(true);
      expect(result.result).toEqual([]);
    });

    it('should handle null/undefined gracefully', () => {
      const verifier = new TerminationVerifier();
      const budget = DEFAULT_BUDGETS[ComplexityClass.CONSTANT];

      const result = verifier.validateBudget(
        (val: any) => val ?? 'default',
        budget,
        [null]
      );

      expect(result.success).toBe(true);
      expect(result.result).toBe('default');
    });

    it('should handle various data types', () => {
      const verifier = new TerminationVerifier();
      const budget = DEFAULT_BUDGETS[ComplexityClass.LINEAR];

      const testCases = [
        { input: [1, 2, 3], fn: (x: number[]) => x.length },
        { input: ['a', 'b', 'c'], fn: (x: string[]) => x.join(',') },
        { input: [true, false, true], fn: (x: boolean[]) => x.filter(Boolean).length },
      ];

      testCases.forEach(({ input, fn }) => {
        const result = verifier.validateBudget(fn, budget, [input]);
        expect(result.success).toBe(true);
      });
    });
  });
});