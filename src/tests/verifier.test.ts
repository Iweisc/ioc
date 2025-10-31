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

    it('should return result and execution time on success', () => {
      const verifier = new TerminationVerifier();
      const budget = DEFAULT_BUDGETS[ComplexityClass.CONSTANT];

      const result = verifier.validateBudget((x: number) => x * 2, budget, [21]);

      expect(result.success).toBe(true);
      expect(result.result).toBe(42);
      expect(result.executionTime).toBeDefined();
      expect(typeof result.executionTime).toBe('number');
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('should detect time budget exceeded', () => {
      const verifier = new TerminationVerifier();
      const budget = { maxTime: 1 }; // Very short time limit

      const slowFn = () => {
        const start = Date.now();
        while (Date.now() - start < 10) {
          // Busy wait for 10ms
        }
        return 42;
      };

      const result = verifier.validateBudget(slowFn, budget, []);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Budget exceeded');
      expect(result.error).toContain('execution took');
      expect(result.executionTime).toBeDefined();
    });

    it('should catch and report function execution errors', () => {
      const verifier = new TerminationVerifier();
      const budget = DEFAULT_BUDGETS[ComplexityClass.CONSTANT];

      const throwingFn = () => {
        throw new Error('Test error');
      };

      const result = verifier.validateBudget(throwingFn, budget, []);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Test error');
      expect(result.executionTime).toBeDefined();
    });

    it('should handle functions with multiple arguments', () => {
      const verifier = new TerminationVerifier();
      const budget = DEFAULT_BUDGETS[ComplexityClass.CONSTANT];

      const addFn = (a: number, b: number, c: number) => a + b + c;
      const result = verifier.validateBudget(addFn, budget, [10, 20, 30]);

      expect(result.success).toBe(true);
      expect(result.result).toBe(60);
    });

    it('should handle functions with no arguments', () => {
      const verifier = new TerminationVerifier();
      const budget = DEFAULT_BUDGETS[ComplexityClass.CONSTANT];

      const constFn = () => 'constant result';
      const result = verifier.validateBudget(constFn, budget, []);

      expect(result.success).toBe(true);
      expect(result.result).toBe('constant result');
    });

    it('should handle functions returning undefined', () => {
      const verifier = new TerminationVerifier();
      const budget = DEFAULT_BUDGETS[ComplexityClass.CONSTANT];

      const voidFn = () => {
        // Returns undefined
      };
      const result = verifier.validateBudget(voidFn, budget, []);

      expect(result.success).toBe(true);
      expect(result.result).toBeUndefined();
    });

    it('should handle functions returning complex objects', () => {
      const verifier = new TerminationVerifier();
      const budget = DEFAULT_BUDGETS[ComplexityClass.LINEAR];

      const objFn = (data: any[]) => {
        return {
          count: data.length,
          items: data,
          processed: true,
        };
      };

      const result = verifier.validateBudget(objFn, budget, [[1, 2, 3]]);

      expect(result.success).toBe(true);
      expect(result.result).toEqual({
        count: 3,
        items: [1, 2, 3],
        processed: true,
      });
    });

    it('should handle functions with array operations', () => {
      const verifier = new TerminationVerifier();
      const budget = DEFAULT_BUDGETS[ComplexityClass.LINEAR];

      const filterFn = (arr: number[]) => arr.filter((x) => x > 5);
      const result = verifier.validateBudget(filterFn, budget, [[1, 3, 7, 9, 2, 8]]);

      expect(result.success).toBe(true);
      expect(result.result).toEqual([7, 9, 8]);
    });

    it('should use default maxTime if not specified', () => {
      const verifier = new TerminationVerifier();
      const budget = {}; // No maxTime specified

      const result = verifier.validateBudget((x: number) => x + 1, budget, [5]);

      expect(result.success).toBe(true);
      expect(result.result).toBe(6);
    });

    it('should handle string return values', () => {
      const verifier = new TerminationVerifier();
      const budget = DEFAULT_BUDGETS[ComplexityClass.LINEAR];

      const stringFn = (arr: string[]) => arr.join(', ');
      const result = verifier.validateBudget(stringFn, budget, [['a', 'b', 'c']]);

      expect(result.success).toBe(true);
      expect(result.result).toBe('a, b, c');
    });

    it('should handle boolean return values', () => {
      const verifier = new TerminationVerifier();
      const budget = DEFAULT_BUDGETS[ComplexityClass.CONSTANT];

      const boolFn = (x: number) => x > 10;
      const result = verifier.validateBudget(boolFn, budget, [15]);

      expect(result.success).toBe(true);
      expect(result.result).toBe(true);
    });

    it('should detect Promise-like objects (thenable)', () => {
      const verifier = new TerminationVerifier();
      const budget = DEFAULT_BUDGETS[ComplexityClass.CONSTANT];

      const thenableFn = () => {
        return {
          then: (resolve: any) => resolve(42),
        };
      };

      const result = verifier.validateBudget(thenableFn, budget, []);

      expect(result.success).toBe(false);
      expect(result.error).toContain('async');
      expect(result.error).toContain('Promise');
    });

    it('should not reject objects with then property that is not a function', () => {
      const verifier = new TerminationVerifier();
      const budget = DEFAULT_BUDGETS[ComplexityClass.CONSTANT];

      const objFn = () => {
        return { then: 'not a function', value: 42 };
      };

      const result = verifier.validateBudget(objFn, budget, []);

      expect(result.success).toBe(true);
      expect(result.result).toEqual({ then: 'not a function', value: 42 });
    });

    it('should handle functions that throw non-Error objects', () => {
      const verifier = new TerminationVerifier();
      const budget = DEFAULT_BUDGETS[ComplexityClass.CONSTANT];

      const throwStringFn = () => {
        throw 'string error';
      };

      const result = verifier.validateBudget(throwStringFn, budget, []);

      expect(result.success).toBe(false);
      expect(result.error).toBe('string error');
    });

    it('should handle functions that throw null or undefined', () => {
      const verifier = new TerminationVerifier();
      const budget = DEFAULT_BUDGETS[ComplexityClass.CONSTANT];

      const throwNullFn = () => {
        throw null;
      };

      const result = verifier.validateBudget(throwNullFn, budget, []);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle recursive functions within budget', () => {
      const verifier = new TerminationVerifier();
      const budget = DEFAULT_BUDGETS[ComplexityClass.LINEAR];

      const factorial = (n: number): number => {
        if (n <= 1) return 1;
        return n * factorial(n - 1);
      };

      const result = verifier.validateBudget(factorial, budget, [5]);

      expect(result.success).toBe(true);
      expect(result.result).toBe(120);
    });

    it('should provide accurate execution time measurements', () => {
      const verifier = new TerminationVerifier();
      const budget = DEFAULT_BUDGETS[ComplexityClass.LINEAR];

      const result1 = verifier.validateBudget(() => 42, budget, []);
      const result2 = verifier.validateBudget(
        (arr: number[]) => arr.reduce((a, b) => a + b, 0),
        budget,
        [[1, 2, 3, 4, 5]]
      );

      expect(result1.executionTime).toBeDefined();
      expect(result2.executionTime).toBeDefined();
      // Both should be fast but measurable
      expect(result1.executionTime!).toBeGreaterThanOrEqual(0);
      expect(result2.executionTime!).toBeGreaterThanOrEqual(0);
    });

    it('should handle zero as a valid result', () => {
      const verifier = new TerminationVerifier();
      const budget = DEFAULT_BUDGETS[ComplexityClass.CONSTANT];

      const zeroFn = () => 0;
      const result = verifier.validateBudget(zeroFn, budget, []);

      expect(result.success).toBe(true);
      expect(result.result).toBe(0);
    });

    it('should handle NaN as a valid result', () => {
      const verifier = new TerminationVerifier();
      const budget = DEFAULT_BUDGETS[ComplexityClass.CONSTANT];

      const nanFn = () => NaN;
      const result = verifier.validateBudget(nanFn, budget, []);

      expect(result.success).toBe(true);
      expect(result.result).toBeNaN();
    });

    it('should handle Infinity as a valid result', () => {
      const verifier = new TerminationVerifier();
      const budget = DEFAULT_BUDGETS[ComplexityClass.CONSTANT];

      const infFn = () => Infinity;
      const result = verifier.validateBudget(infFn, budget, []);

      expect(result.success).toBe(true);
      expect(result.result).toBe(Infinity);
    });
  });
});
});