/**
 * Expanded tests for safe-types module
 */
import { describe, it, expect } from 'vitest';
import {
  ComplexityClass,
  validateSafeValue,
  getPredicateComplexity,
  getTransformComplexity,
  Predicate,
  Transform,
  Reduce,
} from '../dsl/safe-types';
import type { SafePredicate, SafeTransform } from '../dsl/safe-types';

describe('Safe Types - Expanded Tests', () => {
  describe('validateSafeValue', () => {
    it('should validate primitives', () => {
      expect(validateSafeValue(null)).toBe(true);
      expect(validateSafeValue(42)).toBe(true);
      expect(validateSafeValue('hello')).toBe(true);
      expect(validateSafeValue(true)).toBe(true);
    });

    it('should validate arrays', () => {
      expect(validateSafeValue([])).toBe(true);
      expect(validateSafeValue([1, 2, 3])).toBe(true);
      expect(validateSafeValue(['a', 'b'])).toBe(true);
      expect(validateSafeValue([1, 'mixed', true])).toBe(true);
    });

    it('should validate nested arrays', () => {
      expect(
        validateSafeValue([
          [1, 2],
          [3, 4],
        ])
      ).toBe(true);
      expect(validateSafeValue([[[1]]])).toBe(true);
    });

    it('should validate objects', () => {
      expect(validateSafeValue({})).toBe(true);
      expect(validateSafeValue({ key: 'value' })).toBe(true);
      expect(validateSafeValue({ a: 1, b: 2 })).toBe(true);
    });

    it('should validate nested objects', () => {
      expect(validateSafeValue({ user: { name: 'John' } })).toBe(true);
      expect(validateSafeValue({ a: { b: { c: 1 } } })).toBe(true);
    });

    it('should reject unsafe types', () => {
      expect(validateSafeValue(() => {})).toBe(false);
      expect(validateSafeValue(Symbol('test'))).toBe(false);
      expect(validateSafeValue(undefined)).toBe(false);
    });

    it('should reject arrays with unsafe elements', () => {
      expect(validateSafeValue([1, () => {}, 3])).toBe(false);
      expect(validateSafeValue([1, undefined, 3])).toBe(false);
    });

    it('should reject objects with unsafe values', () => {
      expect(validateSafeValue({ fn: () => {} })).toBe(false);
      expect(validateSafeValue({ val: undefined })).toBe(false);
    });
  });

  describe('getPredicateComplexity', () => {
    it('should return CONSTANT for basic comparisons', () => {
      const pred: SafePredicate = { type: 'compare', op: 'eq', value: 42 };
      expect(getPredicateComplexity(pred)).toBe(ComplexityClass.CONSTANT);
    });

    it('should return CONSTANT for property comparisons', () => {
      const pred: SafePredicate = {
        type: 'compare_property',
        op: 'gt',
        property: 'age',
        value: 18,
      };
      expect(getPredicateComplexity(pred)).toBe(ComplexityClass.CONSTANT);
    });

    it('should return CONSTANT for type checks', () => {
      const pred: SafePredicate = { type: 'type_check', expectedType: 'number' };
      expect(getPredicateComplexity(pred)).toBe(ComplexityClass.CONSTANT);
    });

    it('should return CONSTANT for always predicate', () => {
      const pred: SafePredicate = { type: 'always', value: true };
      expect(getPredicateComplexity(pred)).toBe(ComplexityClass.CONSTANT);
    });

    it('should propagate complexity through NOT', () => {
      const pred: SafePredicate = {
        type: 'not',
        predicate: { type: 'always', value: true },
      };
      expect(getPredicateComplexity(pred)).toBe(ComplexityClass.CONSTANT);
    });

    it('should take max complexity for AND', () => {
      const pred: SafePredicate = {
        type: 'and',
        predicates: [
          { type: 'compare', op: 'eq', value: 1 },
          { type: 'compare', op: 'gt', value: 2 },
        ],
      };
      expect(getPredicateComplexity(pred)).toBe(ComplexityClass.CONSTANT);
    });

    it('should take max complexity for OR', () => {
      const pred: SafePredicate = {
        type: 'or',
        predicates: [
          { type: 'compare', op: 'eq', value: 1 },
          { type: 'compare', op: 'gt', value: 2 },
        ],
      };
      expect(getPredicateComplexity(pred)).toBe(ComplexityClass.CONSTANT);
    });

    it('should handle empty AND as CONSTANT', () => {
      const pred: SafePredicate = { type: 'and', predicates: [] };
      expect(getPredicateComplexity(pred)).toBe(ComplexityClass.CONSTANT);
    });

    it('should handle empty OR as CONSTANT', () => {
      const pred: SafePredicate = { type: 'or', predicates: [] };
      expect(getPredicateComplexity(pred)).toBe(ComplexityClass.CONSTANT);
    });
  });

  describe('getTransformComplexity', () => {
    it('should return CONSTANT for identity', () => {
      const transform: SafeTransform = { type: 'identity' };
      expect(getTransformComplexity(transform)).toBe(ComplexityClass.CONSTANT);
    });

    it('should return CONSTANT for constant transform', () => {
      const transform: SafeTransform = { type: 'constant', value: 42 };
      expect(getTransformComplexity(transform)).toBe(ComplexityClass.CONSTANT);
    });

    it('should return CONSTANT for property access', () => {
      const transform: SafeTransform = { type: 'property', path: ['name'] };
      expect(getTransformComplexity(transform)).toBe(ComplexityClass.CONSTANT);
    });

    it('should return CONSTANT for arithmetic', () => {
      const transform: SafeTransform = { type: 'arithmetic', op: 'add', operand: 10 };
      expect(getTransformComplexity(transform)).toBe(ComplexityClass.CONSTANT);
    });

    it('should return LINEAR for string operations', () => {
      const transform: SafeTransform = { type: 'string', op: 'uppercase' };
      expect(getTransformComplexity(transform)).toBe(ComplexityClass.LINEAR);
    });

    it('should return CONSTANT for array length', () => {
      const transform: SafeTransform = { type: 'array', op: 'length' };
      expect(getTransformComplexity(transform)).toBe(ComplexityClass.CONSTANT);
    });

    it('should return LINEAR for other array operations', () => {
      const transform: SafeTransform = { type: 'array', op: 'reverse' };
      expect(getTransformComplexity(transform)).toBe(ComplexityClass.LINEAR);
    });

    it('should take max complexity for conditional', () => {
      const transform: SafeTransform = {
        type: 'conditional',
        condition: { type: 'always', value: true },
        ifTrue: { type: 'identity' },
        ifFalse: { type: 'constant', value: 0 },
      };
      expect(getTransformComplexity(transform)).toBe(ComplexityClass.CONSTANT);
    });

    it('should take max complexity for compose', () => {
      const transform: SafeTransform = {
        type: 'compose',
        transforms: [{ type: 'identity' }, { type: 'arithmetic', op: 'add', operand: 1 }],
      };
      expect(getTransformComplexity(transform)).toBe(ComplexityClass.CONSTANT);
    });

    it('should take max complexity for construct', () => {
      const transform: SafeTransform = {
        type: 'construct',
        fields: {
          a: { type: 'identity' },
          b: { type: 'constant', value: 42 },
        },
      };
      expect(getTransformComplexity(transform)).toBe(ComplexityClass.CONSTANT);
    });
  });

  describe('Predicate helper functions', () => {
    it('should create comparison predicates', () => {
      expect(Predicate.eq(42)).toEqual({ type: 'compare', op: 'eq', value: 42 });
      expect(Predicate.gt(10)).toEqual({ type: 'compare', op: 'gt', value: 10 });
      expect(Predicate.lt(5)).toEqual({ type: 'compare', op: 'lt', value: 5 });
    });

    it('should create property predicates', () => {
      expect(Predicate.property.eq('age', 18)).toEqual({
        type: 'compare_property',
        op: 'eq',
        property: 'age',
        value: 18,
      });
    });

    it('should create type check predicates', () => {
      expect(Predicate.isNumber()).toEqual({ type: 'type_check', expectedType: 'number' });
      expect(Predicate.isString()).toEqual({ type: 'type_check', expectedType: 'string' });
      expect(Predicate.isArray()).toEqual({ type: 'type_check', expectedType: 'array' });
    });

    it('should create logical predicates', () => {
      const p1 = Predicate.eq(1);
      const p2 = Predicate.gt(0);

      expect(Predicate.and(p1, p2)).toEqual({ type: 'and', predicates: [p1, p2] });
      expect(Predicate.or(p1, p2)).toEqual({ type: 'or', predicates: [p1, p2] });
      expect(Predicate.not(p1)).toEqual({ type: 'not', predicate: p1 });
    });

    it('should create always predicate', () => {
      expect(Predicate.always()).toEqual({ type: 'always', value: true });
      expect(Predicate.always(false)).toEqual({ type: 'always', value: false });
    });
  });

  describe('Transform helper functions', () => {
    it('should create basic transforms', () => {
      expect(Transform.identity()).toEqual({ type: 'identity' });
      expect(Transform.constant(42)).toEqual({ type: 'constant', value: 42 });
      expect(Transform.property('name')).toEqual({ type: 'property', path: ['name'] });
    });

    it('should create arithmetic transforms', () => {
      expect(Transform.add(10)).toEqual({ type: 'arithmetic', op: 'add', operand: 10 });
      expect(Transform.multiply(2)).toEqual({ type: 'arithmetic', op: 'multiply', operand: 2 });
      expect(Transform.negate()).toEqual({ type: 'arithmetic', op: 'negate' });
    });

    it('should create string transforms', () => {
      expect(Transform.uppercase()).toEqual({ type: 'string', op: 'uppercase' });
      expect(Transform.lowercase()).toEqual({ type: 'string', op: 'lowercase' });
      expect(Transform.trim()).toEqual({ type: 'string', op: 'trim' });
    });

    it('should create array transforms', () => {
      expect(Transform.length()).toEqual({ type: 'array', op: 'length' });
      expect(Transform.reverse()).toEqual({ type: 'array', op: 'reverse' });
    });

    it('should create conditional transform', () => {
      const cond = Predicate.gt(0);
      const ifTrue = Transform.constant(1);
      const ifFalse = Transform.constant(0);

      expect(Transform.ifThenElse(cond, ifTrue, ifFalse)).toEqual({
        type: 'conditional',
        condition: cond,
        ifTrue,
        ifFalse,
      });
    });

    it('should create compose transform', () => {
      const t1 = Transform.identity();
      const t2 = Transform.add(1);

      expect(Transform.compose(t1, t2)).toEqual({
        type: 'compose',
        transforms: [t1, t2],
      });
    });

    it('should create construct transform', () => {
      const fields = {
        name: Transform.property('name'),
        age: Transform.constant(25),
      };

      expect(Transform.construct(fields)).toEqual({
        type: 'construct',
        fields,
      });
    });
  });

  describe('Reduce helper functions', () => {
    it('should create aggregation reductions', () => {
      expect(Reduce.sum()).toEqual({ type: 'sum' });
      expect(Reduce.product()).toEqual({ type: 'product' });
      expect(Reduce.min()).toEqual({ type: 'min' });
      expect(Reduce.max()).toEqual({ type: 'max' });
      expect(Reduce.count()).toEqual({ type: 'count' });
      expect(Reduce.average()).toEqual({ type: 'average' });
    });

    it('should create selection reductions', () => {
      expect(Reduce.first()).toEqual({ type: 'first' });
      expect(Reduce.last()).toEqual({ type: 'last' });
    });

    it('should create predicate reductions', () => {
      const pred = Predicate.gt(0);

      expect(Reduce.any(pred)).toEqual({ type: 'any', predicate: pred });
      expect(Reduce.all(pred)).toEqual({ type: 'all', predicate: pred });
    });
  });

  describe('ComplexityClass enum', () => {
    it('should have all complexity classes', () => {
      expect(ComplexityClass.CONSTANT).toBe('O(1)');
      expect(ComplexityClass.LOGARITHMIC).toBe('O(log n)');
      expect(ComplexityClass.LINEAR).toBe('O(n)');
      expect(ComplexityClass.LINEARITHMIC).toBe('O(n log n)');
      expect(ComplexityClass.QUADRATIC).toBe('O(n²)');
      expect(ComplexityClass.CUBIC).toBe('O(n³)');
      expect(ComplexityClass.EXPONENTIAL).toBe('O(2^n)');
      expect(ComplexityClass.FACTORIAL).toBe('O(n!)');
    });
  });
});
