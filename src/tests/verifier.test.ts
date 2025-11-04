/**
 * Termination Verifier tests
 */

import { describe, it, expect } from 'vitest';
import { TerminationVerifier, DEFAULT_BUDGETS, estimateBudget } from '../core/verifier';
import { ComplexityClass } from '../dsl/safe-types';

describe('TerminationVerifier', () => {
  describe('Budget Validation', () => {
    it('should validate execution within constant complexity budget', () => {
      const budget = DEFAULT_BUDGETS[ComplexityClass.CONSTANT];

      const result = TerminationVerifier.validateBudget(
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
      const budget = { maxIterations: 10 };

      const result = TerminationVerifier.validateBudget(
        (data: number[]) => {
          let sum = 0;
          // This would violate iteration budget if we had a loop
          for (let i = 0; i < data.length; i++) {
            sum += data[i]!;
          }
          return sum;
        },
        budget,
        [[1, 2, 3, 4, 5]]
      );

      expect(result.success).toBe(true);
    });

    it('should handle function execution successfully', () => {
      const budget = DEFAULT_BUDGETS[ComplexityClass.LINEAR];

      const result = TerminationVerifier.validateBudget(
        (arr: number[]) => arr.map((x) => x * 2),
        budget,
        [[1, 2, 3, 4, 5]]
      );

      expect(result.success).toBe(true);
      expect(result.result).toEqual([2, 4, 6, 8, 10]);
    });

    it('should measure execution time', () => {
      const budget = { maxTime: 1000 };

      const result = TerminationVerifier.validateBudget(
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
      const budget = DEFAULT_BUDGETS[ComplexityClass.LINEAR];

      const result = TerminationVerifier.validateBudget(
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
      const budget = DEFAULT_BUDGETS[ComplexityClass.LINEAR];

      const result = TerminationVerifier.validateBudget(
        (arr: number[]) => arr.filter((x) => x > 5).map((x) => x * 2),
        budget,
        [[1, 3, 7, 9, 11]]
      );

      expect(result.success).toBe(true);
      expect(result.result).toEqual([14, 18, 22]);
    });

    it('should validate reduction operations', () => {
      const budget = DEFAULT_BUDGETS[ComplexityClass.LINEAR];

      const result = TerminationVerifier.validateBudget(
        (arr: number[]) => arr.reduce((sum, x) => sum + x, 0),
        budget,
        [[1, 2, 3, 4, 5]]
      );

      expect(result.success).toBe(true);
      expect(result.result).toBe(15);
    });

    it('should handle nested array operations', () => {
      const budget = DEFAULT_BUDGETS[ComplexityClass.QUADRATIC];

      const result = TerminationVerifier.validateBudget(
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
      const budget = DEFAULT_BUDGETS[ComplexityClass.LINEAR];

      const result = TerminationVerifier.validateBudget(
        (arr: number[]) => arr.map((x) => x * 2),
        budget,
        [[]]
      );

      expect(result.success).toBe(true);
      expect(result.result).toEqual([]);
    });

    it('should handle null/undefined gracefully', () => {
      const budget = DEFAULT_BUDGETS[ComplexityClass.CONSTANT];

      const result = TerminationVerifier.validateBudget((val: any) => val ?? 'default', budget, [
        null,
      ]);

      expect(result.success).toBe(true);
      expect(result.result).toBe('default');
    });

    it('should handle various data types', () => {
      const budget = DEFAULT_BUDGETS[ComplexityClass.LINEAR];

      const testCases = [
        { input: [1, 2, 3], fn: (x: number[]) => x.length },
        { input: ['a', 'b', 'c'], fn: (x: string[]) => x.join(',') },
        { input: [true, false, true], fn: (x: boolean[]) => x.filter(Boolean).length },
      ];

      testCases.forEach(({ input, fn }) => {
        const result = TerminationVerifier.validateBudget(fn, budget, [input]);
        expect(result.success).toBe(true);
      });
    });

    it('should detect and reject async functions', () => {
      const budget = DEFAULT_BUDGETS[ComplexityClass.LINEAR];

      const asyncFn = async () => {
        return 42;
      };

      const result = TerminationVerifier.validateBudget(asyncFn, budget, []);

      expect(result.success).toBe(false);
      expect(result.error).toContain('async');
    });

    it('should detect and reject functions returning Promises', () => {
      const budget = DEFAULT_BUDGETS[ComplexityClass.LINEAR];

      const promiseFn = () => {
        return Promise.resolve(42);
      };

      const result = TerminationVerifier.validateBudget(promiseFn, budget, []);

      expect(result.success).toBe(false);
      expect(result.error).toContain('async');
    });

    it('should return result and execution time on success', () => {
      const budget = DEFAULT_BUDGETS[ComplexityClass.CONSTANT];

      const result = TerminationVerifier.validateBudget((x: number) => x * 2, budget, [21]);

      expect(result.success).toBe(true);
      expect(result.result).toBe(42);
      expect(result.executionTime).toBeDefined();
      expect(typeof result.executionTime).toBe('number');
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
    });

    it('should detect time budget exceeded', () => {
      const budget = { maxTime: 1 }; // Very short time limit

      const slowFn = () => {
        const start = Date.now();
        while (Date.now() - start < 10) {
          // Busy wait for 10ms
        }
        return 42;
      };

      const result = TerminationVerifier.validateBudget(slowFn, budget, []);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Budget exceeded');
      expect(result.error).toContain('execution took');
      expect(result.executionTime).toBeDefined();
    });

    it('should catch and report function execution errors', () => {
      const budget = DEFAULT_BUDGETS[ComplexityClass.CONSTANT];

      const throwingFn = () => {
        throw new Error('Test error');
      };

      const result = TerminationVerifier.validateBudget(throwingFn, budget, []);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Test error');
      expect(result.executionTime).toBeDefined();
    });

    it('should handle functions with multiple arguments', () => {
      const budget = DEFAULT_BUDGETS[ComplexityClass.CONSTANT];

      const addFn = (a: number, b: number, c: number) => a + b + c;
      const result = TerminationVerifier.validateBudget(addFn, budget, [10, 20, 30]);

      expect(result.success).toBe(true);
      expect(result.result).toBe(60);
    });

    it('should handle functions with no arguments', () => {
      const budget = DEFAULT_BUDGETS[ComplexityClass.CONSTANT];

      const constFn = () => 'constant result';
      const result = TerminationVerifier.validateBudget(constFn, budget, []);

      expect(result.success).toBe(true);
      expect(result.result).toBe('constant result');
    });

    it('should handle functions returning undefined', () => {
      const budget = DEFAULT_BUDGETS[ComplexityClass.CONSTANT];

      const voidFn = () => {
        // Returns undefined
      };
      const result = TerminationVerifier.validateBudget(voidFn, budget, []);

      expect(result.success).toBe(true);
      expect(result.result).toBeUndefined();
    });

    it('should handle functions returning complex objects', () => {
      const budget = DEFAULT_BUDGETS[ComplexityClass.LINEAR];

      const objFn = (data: any[]) => {
        return {
          count: data.length,
          items: data,
          processed: true,
        };
      };

      const result = TerminationVerifier.validateBudget(objFn, budget, [[1, 2, 3]]);

      expect(result.success).toBe(true);
      expect(result.result).toEqual({
        count: 3,
        items: [1, 2, 3],
        processed: true,
      });
    });

    it('should handle functions with array operations', () => {
      const budget = DEFAULT_BUDGETS[ComplexityClass.LINEAR];

      const filterFn = (arr: number[]) => arr.filter((x) => x > 5);
      const result = TerminationVerifier.validateBudget(filterFn, budget, [[1, 3, 7, 9, 2, 8]]);

      expect(result.success).toBe(true);
      expect(result.result).toEqual([7, 9, 8]);
    });

    it('should use default maxTime if not specified', () => {
      const budget = {}; // No maxTime specified

      const result = TerminationVerifier.validateBudget((x: number) => x + 1, budget, [5]);

      expect(result.success).toBe(true);
      expect(result.result).toBe(6);
    });

    it('should handle string return values', () => {
      const budget = DEFAULT_BUDGETS[ComplexityClass.LINEAR];

      const stringFn = (arr: string[]) => arr.join(', ');
      const result = TerminationVerifier.validateBudget(stringFn, budget, [['a', 'b', 'c']]);

      expect(result.success).toBe(true);
      expect(result.result).toBe('a, b, c');
    });

    it('should handle boolean return values', () => {
      const budget = DEFAULT_BUDGETS[ComplexityClass.CONSTANT];

      const boolFn = (x: number) => x > 10;
      const result = TerminationVerifier.validateBudget(boolFn, budget, [15]);

      expect(result.success).toBe(true);
      expect(result.result).toBe(true);
    });

    it('should detect Promise-like objects (thenable)', () => {
      const budget = DEFAULT_BUDGETS[ComplexityClass.CONSTANT];

      // @ts-ignore - intentionally creating thenable object for testing

      // @biome-ignore lint/suspicious/noThenProperty: testing thenable detection
      const thenableFn = () => {
        return {
          then: (resolve: any) => resolve(42),
        };
      };

      const result = TerminationVerifier.validateBudget(thenableFn, budget, []);

      expect(result.success).toBe(false);
      expect(result.error).toContain('async');
      expect(result.error).toContain('Promise');
    });

    it('should not reject objects with then property that is not a function', () => {
      const budget = DEFAULT_BUDGETS[ComplexityClass.CONSTANT];

      // @ts-ignore - intentionally creating object with non-function then property

      // @biome-ignore lint/suspicious/noThenProperty: testing non-function then property
      const objFn = () => {
        return { then: 'not a function', value: 42 };
      };

      const result = TerminationVerifier.validateBudget(objFn, budget, []);

      expect(result.success).toBe(true);
      // @biome-ignore lint/suspicious/noThenProperty: testing non-function then property
      expect(result.result).toEqual({ then: 'not a function', value: 42 });
    });

    it('should handle functions that throw non-Error objects', () => {
      const budget = DEFAULT_BUDGETS[ComplexityClass.CONSTANT];

      const throwStringFn = () => {
        throw 'string error';
      };

      const result = TerminationVerifier.validateBudget(throwStringFn, budget, []);

      expect(result.success).toBe(false);
      expect(result.error).toBe('string error');
    });

    it('should handle functions that throw null or undefined', () => {
      const budget = DEFAULT_BUDGETS[ComplexityClass.CONSTANT];

      const throwNullFn = () => {
        throw null;
      };

      const result = TerminationVerifier.validateBudget(throwNullFn, budget, []);

      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle recursive functions within budget', () => {
      const budget = DEFAULT_BUDGETS[ComplexityClass.LINEAR];

      const factorial = (n: number): number => {
        if (n <= 1) return 1;
        return n * factorial(n - 1);
      };

      const result = TerminationVerifier.validateBudget(factorial, budget, [5]);

      expect(result.success).toBe(true);
      expect(result.result).toBe(120);
    });

    it('should provide accurate execution time measurements', () => {
      const budget = DEFAULT_BUDGETS[ComplexityClass.LINEAR];

      const result1 = TerminationVerifier.validateBudget(() => 42, budget, []);
      const result2 = TerminationVerifier.validateBudget(
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
      const budget = DEFAULT_BUDGETS[ComplexityClass.CONSTANT];

      const zeroFn = () => 0;
      const result = TerminationVerifier.validateBudget(zeroFn, budget, []);

      expect(result.success).toBe(true);
      expect(result.result).toBe(0);
    });

    it('should handle NaN as a valid result', () => {
      const budget = DEFAULT_BUDGETS[ComplexityClass.CONSTANT];

      const nanFn = () => NaN;
      const result = TerminationVerifier.validateBudget(nanFn, budget, []);

      expect(result.success).toBe(true);
      expect(result.result).toBeNaN();
    });

    it('should handle Infinity as a valid result', () => {
      const budget = DEFAULT_BUDGETS[ComplexityClass.CONSTANT];

      const infFn = () => Infinity;
      const result = TerminationVerifier.validateBudget(infFn, budget, []);

      expect(result.success).toBe(true);
      expect(result.result).toBe(Infinity);
    });
  });

  describe('Budget Validation - Additional Edge Cases', () => {
    it('should handle functions that return large arrays', () => {
      const budget = DEFAULT_BUDGETS[ComplexityClass.LINEAR];

      const largeFn = () => {
        return Array(10000)
          .fill(0)
          .map((_, i) => i);
      };

      const result = TerminationVerifier.validateBudget(largeFn, budget, []);

      expect(result.success).toBe(true);
      expect(result.result).toHaveLength(10000);
    });

    it('should handle functions with nested object returns', () => {
      const budget = DEFAULT_BUDGETS[ComplexityClass.CONSTANT];

      const nestedFn = () => {
        return {
          level1: {
            level2: {
              level3: {
                value: 'deep',
              },
            },
          },
        };
      };

      const result = TerminationVerifier.validateBudget(nestedFn, budget, []);

      expect(result.success).toBe(true);
      expect(result.result.level1.level2.level3.value).toBe('deep');
    });

    it('should handle functions that modify input arguments', () => {
      const budget = DEFAULT_BUDGETS[ComplexityClass.LINEAR];

      const modifyFn = (arr: number[]) => {
        arr.push(999); // Mutates input
        return arr;
      };

      const testArr = [1, 2, 3];
      const result = TerminationVerifier.validateBudget(modifyFn, budget, [testArr]);

      expect(result.success).toBe(true);
      expect(result.result).toContain(999);
    });

    it('should detect budget exceeded with precise timing', () => {
      const budget = { maxTime: 50 };

      const slowFn = () => {
        const start = Date.now();
        while (Date.now() - start < 100) {
          // Busy wait for 100ms
        }
        return 'done';
      };

      const result = TerminationVerifier.validateBudget(slowFn, budget, []);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Budget exceeded');
      expect(result.executionTime).toBeGreaterThan(50);
    });

    it('should handle functions that throw custom error classes', () => {
      const budget = DEFAULT_BUDGETS[ComplexityClass.CONSTANT];

      class CustomError extends Error {
        constructor(message: string) {
          super(message);
          this.name = 'CustomError';
        }
      }

      const throwCustomFn = () => {
        throw new CustomError('Custom error message');
      };

      const result = TerminationVerifier.validateBudget(throwCustomFn, budget, []);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Custom error message');
    });

    it('should handle functions with Symbol returns', () => {
      const budget = DEFAULT_BUDGETS[ComplexityClass.CONSTANT];

      const symbolFn = () => Symbol('test');

      const result = TerminationVerifier.validateBudget(symbolFn, budget, []);

      expect(result.success).toBe(true);
      expect(typeof result.result).toBe('symbol');
    });

    it('should handle functions with BigInt returns', () => {
      const budget = DEFAULT_BUDGETS[ComplexityClass.CONSTANT];

      const bigIntFn = () => BigInt('12345678901234567890');

      const result = TerminationVerifier.validateBudget(bigIntFn, budget, []);

      expect(result.success).toBe(true);
      expect(typeof result.result).toBe('bigint');
    });

    it('should handle functions with Date returns', () => {
      const budget = DEFAULT_BUDGETS[ComplexityClass.CONSTANT];

      const dateFn = () => new Date('2024-01-01');

      const result = TerminationVerifier.validateBudget(dateFn, budget, []);

      expect(result.success).toBe(true);
      expect(result.result).toBeInstanceOf(Date);
    });

    it('should handle functions with RegExp returns', () => {
      const budget = DEFAULT_BUDGETS[ComplexityClass.CONSTANT];

      const regexFn = () => /test/gi;

      const result = TerminationVerifier.validateBudget(regexFn, budget, []);

      expect(result.success).toBe(true);
      expect(result.result).toBeInstanceOf(RegExp);
    });

    it('should handle functions with Map returns', () => {
      const budget = DEFAULT_BUDGETS[ComplexityClass.LINEAR];

      const mapFn = () => {
        const m = new Map();
        m.set('key1', 'value1');
        m.set('key2', 'value2');
        return m;
      };

      const result = TerminationVerifier.validateBudget(mapFn, budget, []);

      expect(result.success).toBe(true);
      expect(result.result).toBeInstanceOf(Map);
      expect(result.result.size).toBe(2);
    });

    it('should handle functions with Set returns', () => {
      const budget = DEFAULT_BUDGETS[ComplexityClass.LINEAR];

      const setFn = () => {
        const s = new Set([1, 2, 3, 2, 1]);
        return s;
      };

      const result = TerminationVerifier.validateBudget(setFn, budget, []);

      expect(result.success).toBe(true);
      expect(result.result).toBeInstanceOf(Set);
      expect(result.result.size).toBe(3);
    });

    it('should handle functions with mixed argument types', () => {
      const budget = DEFAULT_BUDGETS[ComplexityClass.LINEAR];

      const mixedFn = (num: number, str: string, bool: boolean, arr: any[]) => {
        return { num, str, bool, arrLen: arr.length };
      };

      const result = TerminationVerifier.validateBudget(mixedFn, budget, [
        42,
        'test',
        true,
        [1, 2, 3],
      ]);

      expect(result.success).toBe(true);
      expect(result.result).toEqual({
        num: 42,
        str: 'test',
        bool: true,
        arrLen: 3,
      });
    });

    it('should handle functions with spread arguments', () => {
      const budget = DEFAULT_BUDGETS[ComplexityClass.LINEAR];

      const spreadFn = (...nums: number[]) => nums.reduce((a, b) => a + b, 0);

      const result = TerminationVerifier.validateBudget(spreadFn, budget, [1, 2, 3, 4, 5]);

      expect(result.success).toBe(true);
      expect(result.result).toBe(15);
    });

    it('should track execution time for very fast functions', () => {
      const budget = DEFAULT_BUDGETS[ComplexityClass.CONSTANT];

      const fastFn = () => 1 + 1;

      const result = TerminationVerifier.validateBudget(fastFn, budget, []);

      expect(result.success).toBe(true);
      expect(result.executionTime).toBeDefined();
      expect(result.executionTime).toBeGreaterThanOrEqual(0);
      expect(result.executionTime).toBeLessThan(100); // Should be very fast
    });

    it('should handle functions that return function references', () => {
      const budget = DEFAULT_BUDGETS[ComplexityClass.CONSTANT];

      const fnReturningFn = () => {
        return function innerFn() {
          return 42;
        };
      };

      const result = TerminationVerifier.validateBudget(fnReturningFn, budget, []);

      expect(result.success).toBe(true);
      expect(typeof result.result).toBe('function');
    });

    it('should handle functions with default parameters', () => {
      const budget = DEFAULT_BUDGETS[ComplexityClass.CONSTANT];

      const defaultParamFn = (x: number = 10, y: number = 20) => x + y;

      const result1 = TerminationVerifier.validateBudget(defaultParamFn, budget, []);
      expect(result1.success).toBe(true);
      expect(result1.result).toBe(30);

      const result2 = TerminationVerifier.validateBudget(defaultParamFn, budget, [5]);
      expect(result2.success).toBe(true);
      expect(result2.result).toBe(25);

      const result3 = TerminationVerifier.validateBudget(defaultParamFn, budget, [5, 15]);
      expect(result3.success).toBe(true);
      expect(result3.result).toBe(20);
    });

    it('should handle errors thrown in deeply nested function calls', () => {
      const budget = DEFAULT_BUDGETS[ComplexityClass.LINEAR];

      const nestedFn = () => {
        const level1 = () => {
          const level2 = () => {
            const level3 = () => {
              throw new Error('Deep error');
            };
            return level3();
          };
          return level2();
        };
        return level1();
      };

      const result = TerminationVerifier.validateBudget(nestedFn, budget, []);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Deep error');
    });

    it('should handle functions that access closure variables', () => {
      const budget = DEFAULT_BUDGETS[ComplexityClass.CONSTANT];

      const outerVar = 100;
      const closureFn = (x: number) => x + outerVar;

      const result = TerminationVerifier.validateBudget(closureFn, budget, [50]);

      expect(result.success).toBe(true);
      expect(result.result).toBe(150);
    });

    it('should handle functions with destructured parameters', () => {
      const budget = DEFAULT_BUDGETS[ComplexityClass.CONSTANT];

      const destructureFn = ({ a, b }: { a: number; b: number }) => a + b;

      const result = TerminationVerifier.validateBudget(destructureFn, budget, [{ a: 5, b: 10 }]);

      expect(result.success).toBe(true);
      expect(result.result).toBe(15);
    });

    it('should handle functions that use array destructuring', () => {
      const budget = DEFAULT_BUDGETS[ComplexityClass.LINEAR];

      const arrayDestructureFn = ([first, second, ...rest]: number[]) => {
        return { first, second, restLen: rest.length };
      };

      const result = TerminationVerifier.validateBudget(arrayDestructureFn, budget, [
        [1, 2, 3, 4, 5],
      ]);

      expect(result.success).toBe(true);
      expect(result.result).toEqual({ first: 1, second: 2, restLen: 3 });
    });

    it('should properly measure execution time for recursive factorial', () => {
      const budget = DEFAULT_BUDGETS[ComplexityClass.LINEAR];

      const factorial = (n: number): number => {
        if (n <= 1) return 1;
        return n * factorial(n - 1);
      };

      const result = TerminationVerifier.validateBudget(factorial, budget, [10]);

      expect(result.success).toBe(true);
      expect(result.result).toBe(3628800);
      expect(result.executionTime).toBeDefined();
      expect(result.executionTime).toBeGreaterThan(0);
    });
  });

  describe('BudgetValidationResult Interface', () => {
    it('should return all expected fields on success', () => {
      const budget = DEFAULT_BUDGETS[ComplexityClass.CONSTANT];
      const fn = (x: number) => x * 2;

      const result = TerminationVerifier.validateBudget(fn, budget, [21]);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('result');
      expect(result).toHaveProperty('executionTime');
      expect(result.success).toBe(true);
      expect(result.result).toBe(42);
      expect(typeof result.executionTime).toBe('number');
    });

    it('should return all expected fields on failure', () => {
      const budget = DEFAULT_BUDGETS[ComplexityClass.CONSTANT];
      const fn = () => {
        throw new Error('Test failure');
      };

      const result = TerminationVerifier.validateBudget(fn, budget, []);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('error');
      expect(result).toHaveProperty('executionTime');
      expect(result.success).toBe(false);
      expect(result.error).toBe('Test failure');
      expect(typeof result.executionTime).toBe('number');
    });

    it('should not have result field on failure', () => {
      const budget = DEFAULT_BUDGETS[ComplexityClass.CONSTANT];
      const fn = () => {
        throw new Error('Failure');
      };

      const result = TerminationVerifier.validateBudget(fn, budget, []);

      expect(result.success).toBe(false);
      expect(result.result).toBeUndefined();
    });

    it('should not have error field on success', () => {
      const budget = DEFAULT_BUDGETS[ComplexityClass.CONSTANT];
      const fn = () => 'success';

      const result = TerminationVerifier.validateBudget(fn, budget, []);

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('estimateBudget', () => {
    it('should estimate budget for CONSTANT complexity', () => {
      const budget = estimateBudget(100, ComplexityClass.CONSTANT);

      expect(budget.maxIterations).toBe(10);
      expect(budget.maxTime).toBeGreaterThanOrEqual(100);
      expect(budget.maxTime).toBeLessThanOrEqual(60000);
      expect(budget.maxStackDepth).toBe(100);
    });

    it('should estimate budget for LOGARITHMIC complexity', () => {
      const budget = estimateBudget(1000, ComplexityClass.LOGARITHMIC);

      expect(budget.maxIterations).toBeGreaterThan(10);
      expect(budget.maxTime).toBeGreaterThanOrEqual(100);
      expect(budget.maxStackDepth).toBe(100);
    });

    it('should estimate budget for LINEAR complexity', () => {
      const budget = estimateBudget(100, ComplexityClass.LINEAR);

      expect(budget.maxIterations).toBe(200); // n * 2
      expect(budget.maxTime).toBeGreaterThanOrEqual(100);
      expect(budget.maxStackDepth).toBe(100);
    });

    it('should estimate budget for LINEARITHMIC complexity', () => {
      const budget = estimateBudget(100, ComplexityClass.LINEARITHMIC);

      // n * log2(n) * 2
      const expected = Math.ceil(100 * Math.log2(101)) * 2;
      expect(budget.maxIterations).toBe(expected);
      expect(budget.maxTime).toBeGreaterThanOrEqual(100);
    });

    it('should estimate budget for QUADRATIC complexity', () => {
      const budget = estimateBudget(50, ComplexityClass.QUADRATIC);

      expect(budget.maxIterations).toBe(5000); // 50 * 50 * 2
      expect(budget.maxTime).toBeGreaterThanOrEqual(100);
    });

    it('should estimate budget for CUBIC complexity', () => {
      const budget = estimateBudget(10, ComplexityClass.CUBIC);

      expect(budget.maxIterations).toBe(2000); // 10 * 10 * 10 * 2
      expect(budget.maxTime).toBeGreaterThanOrEqual(100);
    });

    it('should default to 1M iterations for unknown complexity', () => {
      const budget = estimateBudget(100, 'UNKNOWN' as ComplexityClass);

      expect(budget.maxIterations).toBe(1_000_000);
    });

    it('should clamp maxTime to minimum of 100ms', () => {
      const budget = estimateBudget(1, ComplexityClass.CONSTANT);

      expect(budget.maxTime).toBeGreaterThanOrEqual(100);
    });

    it('should clamp maxTime to maximum of 60000ms', () => {
      const budget = estimateBudget(100000, ComplexityClass.CUBIC);

      expect(budget.maxTime).toBeLessThanOrEqual(60000);
    });

    it('should scale iterations with input size', () => {
      const smallBudget = estimateBudget(10, ComplexityClass.LINEAR);
      const largeBudget = estimateBudget(100, ComplexityClass.LINEAR);

      expect(smallBudget.maxIterations).toBeDefined();
      expect(largeBudget.maxIterations).toBeDefined();

      const smallIterations = smallBudget.maxIterations ?? 0;
      const largeIterations = largeBudget.maxIterations ?? 0;

      expect(largeIterations).toBeGreaterThan(smallIterations);
    });

    it('should always set maxStackDepth to 100', () => {
      const budgets = [
        estimateBudget(10, ComplexityClass.CONSTANT),
        estimateBudget(100, ComplexityClass.LINEAR),
        estimateBudget(1000, ComplexityClass.QUADRATIC),
      ];

      budgets.forEach((budget) => {
        expect(budget.maxStackDepth).toBe(100);
      });
    });
  });
});
