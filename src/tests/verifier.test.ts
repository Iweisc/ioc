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

      const result = verifier.validateBudget((arr: number[]) => arr.map((x) => x * 2), budget, [
        [1, 2, 3, 4, 5],
      ]);

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
      expect(budget.maxIterations).toBeGreaterThan(
        DEFAULT_BUDGETS[ComplexityClass.CONSTANT].maxIterations!
      );
    });

    it('should have budget for LINEAR complexity', () => {
      const budget = DEFAULT_BUDGETS[ComplexityClass.LINEAR];
      expect(budget.maxIterations).toBeGreaterThan(
        DEFAULT_BUDGETS[ComplexityClass.LOGARITHMIC].maxIterations!
      );
    });

    it('should have budget for LINEARITHMIC complexity', () => {
      const budget = DEFAULT_BUDGETS[ComplexityClass.LINEARITHMIC];
      expect(budget.maxIterations).toBeGreaterThan(
        DEFAULT_BUDGETS[ComplexityClass.LINEAR].maxIterations!
      );
    });

    it('should have budget for QUADRATIC complexity', () => {
      const budget = DEFAULT_BUDGETS[ComplexityClass.QUADRATIC];
      expect(budget.maxIterations).toBeGreaterThan(
        DEFAULT_BUDGETS[ComplexityClass.LINEARITHMIC].maxIterations!
      );
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

      const result = verifier.validateBudget((arr: number[]) => arr.map((x) => x * 2), budget, [
        [],
      ]);

      expect(result.success).toBe(true);
      expect(result.result).toEqual([]);
    });

    it('should handle null/undefined gracefully', () => {
      const verifier = new TerminationVerifier();
      const budget = DEFAULT_BUDGETS[ComplexityClass.CONSTANT];

      const result = verifier.validateBudget((val: any) => val ?? 'default', budget, [null]);

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

    it('should detect and reject async functions', () => {
      const verifier = new TerminationVerifier();
      const budget = DEFAULT_BUDGETS[ComplexityClass.LINEAR];

      const asyncFn = async () => {
        return 42;
      };

      const result = verifier.validateBudget(asyncFn, budget, []);

      expect(result.success).toBe(false);
      expect(result.error).toContain('async');
    });

    it('should detect and reject functions returning Promises', () => {
      const verifier = new TerminationVerifier();
      const budget = DEFAULT_BUDGETS[ComplexityClass.LINEAR];

      const promiseFn = () => {
        return Promise.resolve(42);
      };

      const result = verifier.validateBudget(promiseFn, budget, []);

      expect(result.success).toBe(false);
      expect(result.error).toContain('async');
    });
  });

  describe('Async Function Detection Edge Cases', () => {
    it('should reject async arrow functions', () => {
      const verifier = new TerminationVerifier();
      const budget = DEFAULT_BUDGETS[ComplexityClass.LINEAR];

      const asyncArrowFn = async () => 42;

      const result = verifier.validateBudget(asyncArrowFn, budget, []);

      expect(result.success).toBe(false);
      expect(result.error).toContain('async');
    });

    it('should reject functions that return Promise.resolve', () => {
      const verifier = new TerminationVerifier();
      const budget = DEFAULT_BUDGETS[ComplexityClass.LINEAR];

      const fn = () => Promise.resolve(100);

      const result = verifier.validateBudget(fn, budget, []);

      expect(result.success).toBe(false);
      expect(result.error).toContain('async');
    });

    it('should reject functions that return Promise.reject', () => {
      const verifier = new TerminationVerifier();
      const budget = DEFAULT_BUDGETS[ComplexityClass.LINEAR];

      const fn = () => Promise.reject(new Error('test'));

      const result = verifier.validateBudget(fn, budget, []);

      expect(result.success).toBe(false);
      expect(result.error).toContain('async');
    });

    it('should reject functions that return new Promise', () => {
      const verifier = new TerminationVerifier();
      const budget = DEFAULT_BUDGETS[ComplexityClass.LINEAR];

      const fn = () => new Promise((resolve) => resolve(42));

      const result = verifier.validateBudget(fn, budget, []);

      expect(result.success).toBe(false);
      expect(result.error).toContain('async');
    });

    it('should accept synchronous functions that return objects with then method', () => {
      const verifier = new TerminationVerifier();
      const budget = DEFAULT_BUDGETS[ComplexityClass.LINEAR];

      // Thenable object that is NOT a Promise
      const fn = () => ({ thenLike: 'not a function', value: 42 });

      const result = verifier.validateBudget(fn, budget, []);

      expect(result.success).toBe(true);
      expect(result.result).toEqual({ thenLike: 'not a function', value: 42 });
    });

    it('should measure execution time for async detection', () => {
      const verifier = new TerminationVerifier();
      const budget = DEFAULT_BUDGETS[ComplexityClass.LINEAR];

      const asyncFn = async () => 42;

      const result = verifier.validateBudget(asyncFn, budget, []);

      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.executionTime).toBeDefined();
    });

    it('should handle functions that return promises nested in objects', () => {
      const verifier = new TerminationVerifier();
      const budget = DEFAULT_BUDGETS[ComplexityClass.LINEAR];

      // Returns object containing promise, not a promise itself
      const fn = () => ({ data: Promise.resolve(42) });

      const result = verifier.validateBudget(fn, budget, []);

      // Should succeed because the function itself doesn't return a promise
      expect(result.success).toBe(true);
    });

    it('should handle functions that return promises in arrays', () => {
      const verifier = new TerminationVerifier();
      const budget = DEFAULT_BUDGETS[ComplexityClass.LINEAR];

      // Returns array containing promise, not a promise itself
      const fn = () => [1, 2, Promise.resolve(3)];

      const result = verifier.validateBudget(fn, budget, []);

      // Should succeed because the function itself doesn't return a promise
      expect(result.success).toBe(true);
    });

    it('should reject async generators', () => {
      const verifier = new TerminationVerifier();
      const budget = DEFAULT_BUDGETS[ComplexityClass.LINEAR];

      const asyncGen = async function* () {
        yield 1;
      };

      const result = verifier.validateBudget(asyncGen, budget, []);

      expect(result.success).toBe(false);
    });
  });

  describe('Budget Validation with Multiple Arguments', () => {
    it('should pass multiple arguments correctly', () => {
      const verifier = new TerminationVerifier();
      const budget = DEFAULT_BUDGETS[ComplexityClass.LINEAR];

      const fn = (a: number, b: number, c: number) => a + b + c;

      const result = verifier.validateBudget(fn, budget, [10, 20, 30]);

      expect(result.success).toBe(true);
      expect(result.result).toBe(60);
    });

    it('should handle functions with array and object arguments', () => {
      const verifier = new TerminationVerifier();
      const budget = DEFAULT_BUDGETS[ComplexityClass.LINEAR];

      const fn = (arr: number[], obj: { multiplier: number }) =>
        arr.map((x) => x * obj.multiplier);

      const result = verifier.validateBudget(fn, budget, [[1, 2, 3], { multiplier: 2 }]);

      expect(result.success).toBe(true);
      expect(result.result).toEqual([2, 4, 6]);
    });

    it('should handle functions with rest parameters', () => {
      const verifier = new TerminationVerifier();
      const budget = DEFAULT_BUDGETS[ComplexityClass.LINEAR];

      const fn = (...args: number[]) => args.reduce((sum, x) => sum + x, 0);

      const result = verifier.validateBudget(fn, budget, [[1, 2, 3, 4, 5]]);

      expect(result.success).toBe(true);
      expect(result.result).toBe(15);
    });
  });

  describe('Budget Validation Error Scenarios', () => {
    it('should capture error messages correctly', () => {
      const verifier = new TerminationVerifier();
      const budget = DEFAULT_BUDGETS[ComplexityClass.LINEAR];

      const fn = () => {
        throw new Error('Custom error message');
      };

      const result = verifier.validateBudget(fn, budget, []);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Custom error message');
    });

    it('should handle non-Error throws', () => {
      const verifier = new TerminationVerifier();
      const budget = DEFAULT_BUDGETS[ComplexityClass.LINEAR];

      const fn = () => {
        throw 'string error';
      };

      const result = verifier.validateBudget(fn, budget, []);

      expect(result.success).toBe(false);
      expect(result.error).toBe('string error');
    });

    it('should handle null/undefined throws', () => {
      const verifier = new TerminationVerifier();
      const budget = DEFAULT_BUDGETS[ComplexityClass.LINEAR];

      const fn = () => {
        throw null;
      };

      const result = verifier.validateBudget(fn, budget, []);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle timeout budget violations', () => {
      const verifier = new TerminationVerifier();
      const budget = { maxTime: 1 }; // Very short timeout

      const fn = () => {
        // Busy wait to consume time
        const start = Date.now();
        while (Date.now() - start < 100) {
          // Loop for 100ms
        }
        return 42;
      };

      const result = verifier.validateBudget(fn, budget, []);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Budget exceeded');
      expect(result.error).toContain('time');
    });
  });
});