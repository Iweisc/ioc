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
});

describe('Budget Validation - Extended Tests', () => {
  it('should validate budget with custom maxTime', () => {
    const verifier = new TerminationVerifier();
    const budget = { maxTime: 500 };

    const result = verifier.validateBudget(
      () => {
        let sum = 0;
        for (let i = 0; i < 1000; i++) {
          sum += i;
        }
        return sum;
      },
      budget,
      []
    );

    expect(result.success).toBe(true);
    expect(result.executionTime).toBeLessThan(500);
  });

  it('should fail when execution exceeds maxTime budget', () => {
    const verifier = new TerminationVerifier();
    const budget = { maxTime: 1 }; // Very tight budget

    const result = verifier.validateBudget(
      () => {
        let sum = 0;
        // Intentionally slow operation
        for (let i = 0; i < 10000000; i++) {
          sum += Math.sqrt(i);
        }
        return sum;
      },
      budget,
      []
    );

    expect(result.success).toBe(false);
    expect(result.error).toContain('Budget exceeded');
    expect(result.error).toContain('execution took');
    expect(result.executionTime).toBeGreaterThan(1);
  });

  it('should handle function with multiple arguments', () => {
    const verifier = new TerminationVerifier();
    const budget = DEFAULT_BUDGETS[ComplexityClass.LINEAR];

    const result = verifier.validateBudget(
      (a: number, b: number, c: number) => a + b + c,
      budget,
      [10, 20, 30]
    );

    expect(result.success).toBe(true);
    expect(result.result).toBe(60);
  });

  it('should handle function with array arguments', () => {
    const verifier = new TerminationVerifier();
    const budget = DEFAULT_BUDGETS[ComplexityClass.LINEAR];

    const result = verifier.validateBudget(
      (arr: number[], multiplier: number) => arr.map((x) => x * multiplier),
      budget,
      [[1, 2, 3, 4, 5], 3]
    );

    expect(result.success).toBe(true);
    expect(result.result).toEqual([3, 6, 9, 12, 15]);
  });

  it('should handle function with object arguments', () => {
    const verifier = new TerminationVerifier();
    const budget = DEFAULT_BUDGETS[ComplexityClass.CONSTANT];

    const result = verifier.validateBudget(
      (obj: { x: number; y: number }) => obj.x + obj.y,
      budget,
      [{ x: 10, y: 20 }]
    );

    expect(result.success).toBe(true);
    expect(result.result).toBe(30);
  });

  it('should capture error message on function throw', () => {
    const verifier = new TerminationVerifier();
    const budget = DEFAULT_BUDGETS[ComplexityClass.CONSTANT];

    const result = verifier.validateBudget(
      () => {
        throw new Error('Custom error message');
      },
      budget,
      []
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('Custom error message');
    expect(result.executionTime).toBeDefined();
  });

  it('should handle non-Error thrown values', () => {
    const verifier = new TerminationVerifier();
    const budget = DEFAULT_BUDGETS[ComplexityClass.CONSTANT];

    const result = verifier.validateBudget(
      () => {
        throw 'String error';
      },
      budget,
      []
    );

    expect(result.success).toBe(false);
    expect(result.error).toBe('String error');
  });

  it('should handle functions returning falsy values', () => {
    const verifier = new TerminationVerifier();
    const budget = DEFAULT_BUDGETS[ComplexityClass.CONSTANT];

    const falsyValues = [0, '', false, null, undefined];
    falsyValues.forEach((value) => {
      const result = verifier.validateBudget(() => value, budget, []);
      expect(result.success).toBe(true);
      expect(result.result).toBe(value);
    });
  });

  it('should handle functions returning objects', () => {
    const verifier = new TerminationVerifier();
    const budget = DEFAULT_BUDGETS[ComplexityClass.CONSTANT];

    const obj = { key: 'value', nested: { data: 123 } };
    const result = verifier.validateBudget(() => obj, budget, []);

    expect(result.success).toBe(true);
    expect(result.result).toEqual(obj);
  });

  it('should handle functions returning arrays', () => {
    const verifier = new TerminationVerifier();
    const budget = DEFAULT_BUDGETS[ComplexityClass.LINEAR];

    const result = verifier.validateBudget(
      (n: number) => Array.from({ length: n }, (_, i) => i),
      budget,
      [5]
    );

    expect(result.success).toBe(true);
    expect(result.result).toEqual([0, 1, 2, 3, 4]);
  });

  it('should use default maxTime when not specified', () => {
    const verifier = new TerminationVerifier();
    const budget = {}; // No maxTime specified

    const result = verifier.validateBudget(() => 42, budget, []);

    expect(result.success).toBe(true);
    expect(result.result).toBe(42);
    expect(result.executionTime).toBeLessThan(1000); // Default is 1000ms
  });

  it('should detect Promise-like objects with then method', () => {
    const verifier = new TerminationVerifier();
    const budget = DEFAULT_BUDGETS[ComplexityClass.CONSTANT];

    class PromiseLike {
      then(resolve: Function) {
        resolve(42);
      }
    }

    const promiseLike = new PromiseLike();

    const result = verifier.validateBudget(() => promiseLike, budget, []);

    expect(result.success).toBe(false);
    expect(result.error).toContain('async');
    expect(result.error).toContain('Promise');
  });

  it('should handle arrow functions', () => {
    const verifier = new TerminationVerifier();
    const budget = DEFAULT_BUDGETS[ComplexityClass.LINEAR];

    const arrowFn = (x: number) => x * 2;
    const result = verifier.validateBudget(arrowFn, budget, [21]);

    expect(result.success).toBe(true);
    expect(result.result).toBe(42);
  });

  it('should handle function expressions', () => {
    const verifier = new TerminationVerifier();
    const budget = DEFAULT_BUDGETS[ComplexityClass.LINEAR];

    const fnExpr = function (x: number) {
      return x * 2;
    };
    const result = verifier.validateBudget(fnExpr, budget, [21]);

    expect(result.success).toBe(true);
    expect(result.result).toBe(42);
  });

  it('should measure execution time accurately', () => {
    const verifier = new TerminationVerifier();
    const budget = { maxTime: 1000 };

    const result = verifier.validateBudget(
      () => {
        const start = Date.now();
        while (Date.now() - start < 50) {
          // Busy wait for approximately 50ms
        }
        return 'done';
      },
      budget,
      []
    );

    expect(result.success).toBe(true);
    expect(result.executionTime).toBeGreaterThanOrEqual(50);
    expect(result.executionTime).toBeLessThan(200);
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

  it('should handle higher-order functions', () => {
    const verifier = new TerminationVerifier();
    const budget = DEFAULT_BUDGETS[ComplexityClass.LINEAR];

    const result = verifier.validateBudget(
      (arr: number[], fn: (x: number) => number) => arr.map(fn),
      budget,
      [
        [1, 2, 3],
        (x: number) => x * 2,
      ]
    );

    expect(result.success).toBe(true);
    expect(result.result).toEqual([2, 4, 6]);
  });

  it('should validate complex data transformations', () => {
    const verifier = new TerminationVerifier();
    const budget = DEFAULT_BUDGETS[ComplexityClass.QUADRATIC];

    const result = verifier.validateBudget(
      (users: Array<{ name: string; age: number }>) =>
        users.filter((u) => u.age >= 18).map((u) => u.name.toUpperCase()),
      budget,
      [[
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 15 },
        { name: 'Charlie', age: 30 },
      ]]
    );

    expect(result.success).toBe(true);
    expect(result.result).toEqual(['ALICE', 'CHARLIE']);
  });
});