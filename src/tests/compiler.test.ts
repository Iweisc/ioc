/**
 * Compiler tests
 */

import { describe, it, expect } from 'vitest';
import {
  compilePredicateFunction,
  compileTransformFunction,
  compileReductionFunction,
} from '../dsl/compiler';

describe('Compiler', () => {
  describe('Predicate Compilation', () => {
    it('should compile comparison predicate - greater than', () => {
      const predicate = { type: 'compare' as const, op: 'gt' as const, value: 10 };
      const fn = compilePredicateFunction(predicate);

      expect(fn(15)).toBe(true);
      expect(fn(10)).toBe(false);
      expect(fn(5)).toBe(false);
    });

    it('should compile comparison predicate - less than', () => {
      const predicate = { type: 'compare' as const, op: 'lt' as const, value: 10 };
      const fn = compilePredicateFunction(predicate);

      expect(fn(5)).toBe(true);
      expect(fn(10)).toBe(false);
      expect(fn(15)).toBe(false);
    });

    it('should compile comparison predicate - equals', () => {
      const predicate = { type: 'compare' as const, op: 'eq' as const, value: 10 };
      const fn = compilePredicateFunction(predicate);

      expect(fn(10)).toBe(true);
      expect(fn(5)).toBe(false);
      expect(fn(15)).toBe(false);
    });

    it('should compile comparison predicate - not equals', () => {
      const predicate = { type: 'compare' as const, op: 'ne' as const, value: 10 };
      const fn = compilePredicateFunction(predicate);

      expect(fn(5)).toBe(true);
      expect(fn(15)).toBe(true);
      expect(fn(10)).toBe(false);
    });

    it('should compile property comparison predicate', () => {
      const predicate = {
        type: 'compare_property' as const,
        op: 'gte' as const,
        property: 'age',
        value: 18,
      };
      const fn = compilePredicateFunction(predicate);

      expect(fn({ age: 25 })).toBe(true);
      expect(fn({ age: 18 })).toBe(true);
      expect(fn({ age: 15 })).toBe(false);
    });

    it('should compile AND predicate', () => {
      const predicate = {
        type: 'and' as const,
        predicates: [
          { type: 'compare' as const, op: 'gt' as const, value: 5 },
          { type: 'compare' as const, op: 'lt' as const, value: 15 },
        ],
      };
      const fn = compilePredicateFunction(predicate);

      expect(fn(10)).toBe(true);
      expect(fn(3)).toBe(false);
      expect(fn(20)).toBe(false);
    });

    it('should compile OR predicate', () => {
      const predicate = {
        type: 'or' as const,
        predicates: [
          { type: 'compare' as const, op: 'lt' as const, value: 5 },
          { type: 'compare' as const, op: 'gt' as const, value: 15 },
        ],
      };
      const fn = compilePredicateFunction(predicate);

      expect(fn(3)).toBe(true);
      expect(fn(20)).toBe(true);
      expect(fn(10)).toBe(false);
    });

    it('should compile NOT predicate', () => {
      const predicate = {
        type: 'not' as const,
        predicate: { type: 'compare' as const, op: 'gt' as const, value: 10 },
      };
      const fn = compilePredicateFunction(predicate);

      expect(fn(5)).toBe(true);
      expect(fn(15)).toBe(false);
    });

    it('should compile type check predicate', () => {
      const predicate = { type: 'type_check' as const, expectedType: 'number' as const };
      const fn = compilePredicateFunction(predicate);

      expect(fn(42)).toBe(true);
      expect(fn('hello')).toBe(false);
      expect(fn(null)).toBe(false);
      expect(fn(true)).toBe(false);
    });

    it('should compile always predicate', () => {
      const predicateTrue = { type: 'always' as const, value: true };
      const fnTrue = compilePredicateFunction(predicateTrue);

      const predicateFalse = { type: 'always' as const, value: false };
      const fnFalse = compilePredicateFunction(predicateFalse);

      expect(fnTrue(123)).toBe(true);
      expect(fnFalse(123)).toBe(false);
    });
  });

  describe('Transform Compilation', () => {
    it('should compile arithmetic transform - multiply', () => {
      const transform = { type: 'arithmetic' as const, op: 'multiply' as const, operand: 2 };
      const fn = compileTransformFunction(transform);

      expect(fn(5)).toBe(10);
      expect(fn(10)).toBe(20);
    });

    it('should compile arithmetic transform - add', () => {
      const transform = { type: 'arithmetic' as const, op: 'add' as const, operand: 5 };
      const fn = compileTransformFunction(transform);

      expect(fn(3)).toBe(8);
      expect(fn(10)).toBe(15);
    });

    it('should compile arithmetic transform - subtract', () => {
      const transform = { type: 'arithmetic' as const, op: 'subtract' as const, operand: 5 };
      const fn = compileTransformFunction(transform);

      expect(fn(10)).toBe(5);
      expect(fn(20)).toBe(15);
    });

    it('should compile arithmetic transform - divide', () => {
      const transform = { type: 'arithmetic' as const, op: 'divide' as const, operand: 2 };
      const fn = compileTransformFunction(transform);

      expect(fn(10)).toBe(5);
      expect(fn(20)).toBe(10);
    });

    it('should compile arithmetic transform - modulo', () => {
      const transform = { type: 'arithmetic' as const, op: 'modulo' as const, operand: 3 };
      const fn = compileTransformFunction(transform);

      expect(fn(10)).toBe(1);
      expect(fn(12)).toBe(0);
    });

    it('should compile property transform', () => {
      const transform = { type: 'property' as const, path: ['name'] };
      const fn = compileTransformFunction(transform);

      expect(fn({ name: 'Alice', age: 25 })).toBe('Alice');
    });

    it('should compile nested property transform', () => {
      const transform = { type: 'property' as const, path: ['user', 'name'] };
      const fn = compileTransformFunction(transform);

      expect(fn({ user: { name: 'Alice', age: 25 } })).toBe('Alice');
    });

    it('should compile string transform - uppercase', () => {
      const transform = { type: 'string' as const, op: 'uppercase' as const };
      const fn = compileTransformFunction(transform);

      expect(fn('hello')).toBe('HELLO');
    });

    it('should compile string transform - lowercase', () => {
      const transform = { type: 'string' as const, op: 'lowercase' as const };
      const fn = compileTransformFunction(transform);

      expect(fn('HELLO')).toBe('hello');
    });

    it('should compile string transform - trim', () => {
      const transform = { type: 'string' as const, op: 'trim' as const };
      const fn = compileTransformFunction(transform);

      expect(fn('  hello  ')).toBe('hello');
    });

    it('should compile identity transform', () => {
      const transform = { type: 'identity' as const };
      const fn = compileTransformFunction(transform);

      expect(fn(42)).toBe(42);
      expect(fn('hello')).toBe('hello');
    });

    it('should compile constant transform', () => {
      const transform = { type: 'constant' as const, value: 42 };
      const fn = compileTransformFunction(transform);

      expect(fn(1)).toBe(42);
      expect(fn(100)).toBe(42);
    });
  });

  describe('Reduction Compilation', () => {
    it('should compile sum reduction', () => {
      const reduction = { type: 'sum' as const };
      const fn = compileReductionFunction(reduction);

      expect(fn([1, 2, 3, 4])).toBe(10);
      expect(fn([5, 10, 15])).toBe(30);
    });

    it('should compile product reduction', () => {
      const reduction = { type: 'product' as const };
      const fn = compileReductionFunction(reduction);

      expect(fn([2, 3, 4])).toBe(24);
      expect(fn([5, 2])).toBe(10);
    });

    it('should compile max reduction', () => {
      const reduction = { type: 'max' as const };
      const fn = compileReductionFunction(reduction);

      expect(fn([3, 7, 2, 9, 1])).toBe(9);
      expect(fn([5])).toBe(5);
    });

    it('should compile min reduction', () => {
      const reduction = { type: 'min' as const };
      const fn = compileReductionFunction(reduction);

      expect(fn([3, 7, 2, 9, 1])).toBe(1);
      expect(fn([5])).toBe(5);
    });

    it('should compile average reduction', () => {
      const reduction = { type: 'average' as const };
      const fn = compileReductionFunction(reduction);

      expect(fn([1, 2, 3, 4, 5])).toBe(3);
      expect(fn([10, 20, 30])).toBe(20);
    });

    it('should compile count reduction', () => {
      const reduction = { type: 'count' as const };
      const fn = compileReductionFunction(reduction);

      expect(fn([1, 2, 3, 4, 5])).toBe(5);
      expect(fn([])).toBe(0);
    });

    it('should compile first reduction', () => {
      const reduction = { type: 'first' as const };
      const fn = compileReductionFunction(reduction);

      expect(fn([1, 2, 3, 4, 5])).toBe(1);
      expect(fn(['a', 'b', 'c'])).toBe('a');
    });

    it('should compile last reduction', () => {
      const reduction = { type: 'last' as const };
      const fn = compileReductionFunction(reduction);

      expect(fn([1, 2, 3, 4, 5])).toBe(5);
      expect(fn(['a', 'b', 'c'])).toBe('c');
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty arrays in reductions', () => {
      const sum = compileReductionFunction({ type: 'sum' as const });
      const count = compileReductionFunction({ type: 'count' as const });

      expect(sum([])).toBe(0);
      expect(count([])).toBe(0);
    });

    it('should handle undefined properties', () => {
      const transform = { type: 'property' as const, path: ['nonexistent'] };
      const fn = compileTransformFunction(transform);

      expect(fn({ name: 'Alice' })).toBeUndefined();
    });

    it('should handle null values', () => {
      const predicate = { type: 'compare' as const, op: 'eq' as const, value: null };
      const fn = compilePredicateFunction(predicate);

      expect(fn(null)).toBe(true);
      expect(fn(0)).toBe(false);
    });

    it('should handle string comparisons', () => {
      const predicate = { type: 'compare' as const, op: 'eq' as const, value: 'hello' };
      const fn = compilePredicateFunction(predicate);

      expect(fn('hello')).toBe(true);
      expect(fn('world')).toBe(false);
    });

    it('should handle boolean values', () => {
      const predicate = { type: 'compare' as const, op: 'eq' as const, value: true };
      const fn = compilePredicateFunction(predicate);

      expect(fn(true)).toBe(true);
      expect(fn(false)).toBe(false);
    });
  });

  describe('Complex Expressions', () => {
    it('should handle nested AND/OR predicates', () => {
      const predicate = {
        type: 'and' as const,
        predicates: [
          { type: 'compare' as const, op: 'gt' as const, value: 0 },
          {
            type: 'or' as const,
            predicates: [
              { type: 'compare' as const, op: 'lt' as const, value: 10 },
              { type: 'compare' as const, op: 'gt' as const, value: 20 },
            ],
          },
        ],
      };
      const fn = compilePredicateFunction(predicate);

      expect(fn(5)).toBe(true);
      expect(fn(25)).toBe(true);
      expect(fn(15)).toBe(false);
      expect(fn(-5)).toBe(false);
    });

    it('should handle property paths with multiple levels', () => {
      const transform = { type: 'property' as const, path: ['a', 'b', 'c'] };
      const fn = compileTransformFunction(transform);

      expect(fn({ a: { b: { c: 42 } } })).toBe(42);
    });

    it('should handle mixed type arrays in type checks', () => {
      const predicate = { type: 'type_check' as const, expectedType: 'string' as const };
      const fn = compilePredicateFunction(predicate);

      const mixed = [1, 'hello', true, 'world', null];
      const filtered = mixed.filter(fn);

      expect(filtered).toEqual(['hello', 'world']);
    });
  });
});

  describe('Arithmetic Predicate Compilation', () => {
    it('should compile arithmetic predicate - modulo equals', () => {
      const predicate = {
        type: 'compare_arithmetic' as const,
        arithmeticOp: 'mod' as const,
        arithmeticValue: 2,
        comparisonOp: 'eq' as const,
        comparisonValue: 0,
      };
      const fn = compilePredicateFunction(predicate);

      expect(fn(4)).toBe(true); // 4 % 2 == 0
      expect(fn(6)).toBe(true); // 6 % 2 == 0
      expect(fn(5)).toBe(false); // 5 % 2 == 1
      expect(fn(7)).toBe(false); // 7 % 2 == 1
    });

    it('should compile arithmetic predicate - multiply greater than', () => {
      const predicate = {
        type: 'compare_arithmetic' as const,
        arithmeticOp: 'multiply' as const,
        arithmeticValue: 3,
        comparisonOp: 'gt' as const,
        comparisonValue: 10,
      };
      const fn = compilePredicateFunction(predicate);

      expect(fn(5)).toBe(true); // 5 * 3 = 15 > 10
      expect(fn(4)).toBe(true); // 4 * 3 = 12 > 10
      expect(fn(3)).toBe(false); // 3 * 3 = 9 not > 10
      expect(fn(2)).toBe(false); // 2 * 3 = 6 not > 10
    });

    it('should compile arithmetic predicate - add less than', () => {
      const predicate = {
        type: 'compare_arithmetic' as const,
        arithmeticOp: 'add' as const,
        arithmeticValue: 5,
        comparisonOp: 'lt' as const,
        comparisonValue: 20,
      };
      const fn = compilePredicateFunction(predicate);

      expect(fn(10)).toBe(true); // 10 + 5 = 15 < 20
      expect(fn(12)).toBe(true); // 12 + 5 = 17 < 20
      expect(fn(15)).toBe(false); // 15 + 5 = 20 not < 20
      expect(fn(20)).toBe(false); // 20 + 5 = 25 not < 20
    });

    it('should compile arithmetic predicate - subtract greater than or equal', () => {
      const predicate = {
        type: 'compare_arithmetic' as const,
        arithmeticOp: 'subtract' as const,
        arithmeticValue: 10,
        comparisonOp: 'gte' as const,
        comparisonValue: 0,
      };
      const fn = compilePredicateFunction(predicate);

      expect(fn(15)).toBe(true); // 15 - 10 = 5 >= 0
      expect(fn(10)).toBe(true); // 10 - 10 = 0 >= 0
      expect(fn(5)).toBe(false); // 5 - 10 = -5 not >= 0
    });

    it('should compile arithmetic predicate - divide less than or equal', () => {
      const predicate = {
        type: 'compare_arithmetic' as const,
        arithmeticOp: 'divide' as const,
        arithmeticValue: 2,
        comparisonOp: 'lte' as const,
        comparisonValue: 5,
      };
      const fn = compilePredicateFunction(predicate);

      expect(fn(8)).toBe(true); // 8 / 2 = 4 <= 5
      expect(fn(10)).toBe(true); // 10 / 2 = 5 <= 5
      expect(fn(12)).toBe(false); // 12 / 2 = 6 not <= 5
    });

    it('should compile arithmetic predicate - not equals', () => {
      const predicate = {
        type: 'compare_arithmetic' as const,
        arithmeticOp: 'mod' as const,
        arithmeticValue: 3,
        comparisonOp: 'ne' as const,
        comparisonValue: 0,
      };
      const fn = compilePredicateFunction(predicate);

      expect(fn(10)).toBe(true); // 10 % 3 = 1 != 0
      expect(fn(11)).toBe(true); // 11 % 3 = 2 != 0
      expect(fn(9)).toBe(false); // 9 % 3 = 0 not != 0
      expect(fn(12)).toBe(false); // 12 % 3 = 0 not != 0
    });

    it('should handle edge cases with zero arithmetic value', () => {
      const predicate = {
        type: 'compare_arithmetic' as const,
        arithmeticOp: 'add' as const,
        arithmeticValue: 0,
        comparisonOp: 'eq' as const,
        comparisonValue: 5,
      };
      const fn = compilePredicateFunction(predicate);

      expect(fn(5)).toBe(true); // 5 + 0 = 5 == 5
      expect(fn(0)).toBe(false); // 0 + 0 = 0 != 5
    });

    it('should handle negative arithmetic values', () => {
      const predicate = {
        type: 'compare_arithmetic' as const,
        arithmeticOp: 'multiply' as const,
        arithmeticValue: -2,
        comparisonOp: 'lt' as const,
        comparisonValue: 0,
      };
      const fn = compilePredicateFunction(predicate);

      expect(fn(5)).toBe(true); // 5 * -2 = -10 < 0
      expect(fn(-3)).toBe(false); // -3 * -2 = 6 not < 0
    });

    it('should handle all arithmetic operations in filter context', () => {
      const operations: Array<'multiply' | 'add' | 'subtract' | 'divide' | 'mod'> = [
        'multiply',
        'add',
        'subtract',
        'divide',
        'mod',
      ];

      operations.forEach((op) => {
        const predicate = {
          type: 'compare_arithmetic' as const,
          arithmeticOp: op,
          arithmeticValue: 2,
          comparisonOp: 'gt' as const,
          comparisonValue: 0,
        };
        const fn = compilePredicateFunction(predicate);

        // Should compile without errors
        expect(typeof fn).toBe('function');
      });
    });
  });
});