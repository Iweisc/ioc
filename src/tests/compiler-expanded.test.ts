/**
 * Expanded tests for compiler module
 */
import { describe, it, expect } from 'vitest';
import {
  compilePredicate,
  compileTransform,
  compileReduction,
  compilePredicateFunction,
  compileTransformFunction,
  compileReductionFunction,
} from '../dsl/compiler';
import { Predicate, Transform, Reduce } from '../dsl/safe-types';
import type { SafePredicate, SafeTransform, ReductionOp } from '../dsl/safe-types';

describe('Compiler - Expanded Tests', () => {
  describe('compilePredicate', () => {
    it('should compile always predicate', () => {
      const pred: SafePredicate = Predicate.always(true);
      const code = compilePredicate(pred);

      expect(code).toContain('true');
    });

    it('should compile always false predicate', () => {
      const pred: SafePredicate = Predicate.always(false);
      const code = compilePredicate(pred);

      expect(code).toContain('false');
    });

    it('should compile comparison predicates', () => {
      expect(compilePredicate(Predicate.eq(42))).toContain('42');
      expect(compilePredicate(Predicate.gt(10))).toContain('10');
      expect(compilePredicate(Predicate.lt(5))).toContain('5');
      expect(compilePredicate(Predicate.gte(0))).toContain('0');
      expect(compilePredicate(Predicate.lte(100))).toContain('100');
      expect(compilePredicate(Predicate.ne(0))).toContain('0');
    });

    it('should compile type check predicates', () => {
      expect(compilePredicate(Predicate.isNumber())).toContain('number');
      expect(compilePredicate(Predicate.isString())).toContain('string');
      expect(compilePredicate(Predicate.isArray())).toContain('Array.isArray');
    });

    it('should compile property predicates', () => {
      const pred = Predicate.property.eq('age', 18);
      const code = compilePredicate(pred);

      expect(code).toContain('age');
      expect(code).toContain('18');
    });

    it('should compile NOT predicate', () => {
      const pred: SafePredicate = Predicate.not(Predicate.eq(5));
      const code = compilePredicate(pred);

      expect(code).toContain('!');
    });

    it('should compile AND predicates', () => {
      const pred: SafePredicate = Predicate.and(Predicate.gt(0), Predicate.lt(10));
      const code = compilePredicate(pred);

      expect(code).toContain('&&');
    });

    it('should compile OR predicates', () => {
      const pred: SafePredicate = Predicate.or(Predicate.eq(5), Predicate.eq(10));
      const code = compilePredicate(pred);

      expect(code).toContain('||');
    });

    it('should compile nested logical predicates', () => {
      const pred: SafePredicate = Predicate.and(
        Predicate.or(Predicate.eq(1), Predicate.eq(2)),
        Predicate.gt(0)
      );
      const code = compilePredicate(pred);

      expect(code).toContain('&&');
      expect(code).toContain('||');
    });

    it('should compile IN predicate', () => {
      const pred: SafePredicate = Predicate.in([1, 2, 3]);
      const code = compilePredicate(pred);

      expect(code).toContain('includes');
    });

    it('should compile CONTAINS predicate', () => {
      const pred: SafePredicate = Predicate.contains(5);
      const code = compilePredicate(pred);

      expect(code).toContain('includes');
    });
  });

  describe('compileTransform', () => {
    it('should compile identity transform', () => {
      const code = compileTransform(Transform.identity());
      expect(code).toBeDefined();
      expect(typeof code).toBe('string');
    });

    it('should compile constant transform', () => {
      const code = compileTransform(Transform.constant(42));
      expect(code).toContain('42');
    });

    it('should compile property transform', () => {
      const code = compileTransform(Transform.property('name'));
      expect(code).toContain('name');
    });

    it('should compile nested property transform', () => {
      const transform: SafeTransform = { type: 'property', path: ['user', 'name'] };
      const code = compileTransform(transform);

      expect(code).toContain('user');
      expect(code).toContain('name');
    });

    it('should compile arithmetic transforms', () => {
      expect(compileTransform(Transform.add(10))).toContain('+');
      expect(compileTransform(Transform.multiply(2))).toContain('*');
      expect(compileTransform(Transform.negate())).toContain('-');
    });

    it('should compile string transforms', () => {
      expect(compileTransform(Transform.uppercase())).toContain('toUpperCase');
      expect(compileTransform(Transform.lowercase())).toContain('toLowerCase');
      expect(compileTransform(Transform.trim())).toContain('trim');
    });

    it('should compile array transforms', () => {
      expect(compileTransform(Transform.length())).toContain('length');
      expect(compileTransform(Transform.reverse())).toContain('reverse');
    });

    it('should compile conditional transform', () => {
      const transform: SafeTransform = Transform.ifThenElse(
        Predicate.gt(0),
        Transform.constant(1),
        Transform.constant(0)
      );
      const code = compileTransform(transform);

      expect(code).toContain('?');
      expect(code).toContain(':');
    });

    it('should compile compose transform', () => {
      const transform: SafeTransform = Transform.compose(Transform.add(10), Transform.multiply(2));
      const code = compileTransform(transform);

      expect(code).toBeDefined();
    });

    it('should compile construct transform', () => {
      const transform: SafeTransform = Transform.construct({
        name: Transform.property('name'),
        age: Transform.constant(25),
      });
      const code = compileTransform(transform);

      expect(code).toContain('name');
      expect(code).toContain('25');
    });
  });

  describe('compileReduction', () => {
    it('should compile sum reduction', () => {
      const code = compileReduction(Reduce.sum());
      expect(code).toContain('reduce');
    });

    it('should compile product reduction', () => {
      const code = compileReduction(Reduce.product());
      expect(code).toContain('reduce');
    });

    it('should compile min reduction', () => {
      const code = compileReduction(Reduce.min());
      expect(code).toBeDefined();
      expect(typeof code).toBe('string');
    });

    it('should compile max reduction', () => {
      const code = compileReduction(Reduce.max());
      expect(code).toBeDefined();
      expect(typeof code).toBe('string');
    });

    it('should compile count reduction', () => {
      const code = compileReduction(Reduce.count());
      expect(code).toContain('length');
    });

    it('should compile average reduction', () => {
      const code = compileReduction(Reduce.average());
      expect(code).toContain('reduce');
      expect(code).toContain('length');
    });

    it('should compile first reduction', () => {
      const code = compileReduction(Reduce.first());
      expect(code).toContain('[0]');
    });

    it('should compile last reduction', () => {
      const code = compileReduction(Reduce.last());
      expect(code).toContain('length');
      expect(code).toContain('- 1');
    });

    it('should compile any reduction', () => {
      const reduction: ReductionOp = Reduce.any(Predicate.gt(0));
      const code = compileReduction(reduction);

      expect(code).toContain('some');
    });

    it('should compile all reduction', () => {
      const reduction: ReductionOp = Reduce.all(Predicate.gt(0));
      const code = compileReduction(reduction);

      expect(code).toContain('every');
    });
  });

  describe('compilePredicateFunction', () => {
    it('should compile and execute simple predicate', () => {
      const fn = compilePredicateFunction(Predicate.gt(5));

      expect(fn(10)).toBe(true);
      expect(fn(3)).toBe(false);
    });

    it('should compile and execute comparison predicates', () => {
      expect(compilePredicateFunction(Predicate.eq(5))(5)).toBe(true);
      expect(compilePredicateFunction(Predicate.ne(5))(3)).toBe(true);
      expect(compilePredicateFunction(Predicate.gte(5))(5)).toBe(true);
      expect(compilePredicateFunction(Predicate.lte(5))(5)).toBe(true);
    });

    it('should compile and execute type checks', () => {
      expect(compilePredicateFunction(Predicate.isNumber())(42)).toBe(true);
      expect(compilePredicateFunction(Predicate.isString())('hello')).toBe(true);
      expect(compilePredicateFunction(Predicate.isArray())([1, 2, 3])).toBe(true);
    });

    it('should compile and execute property predicates', () => {
      const fn = compilePredicateFunction(Predicate.property.gt('age', 18));

      expect(fn({ age: 25 })).toBe(true);
      expect(fn({ age: 15 })).toBe(false);
    });

    it('should compile and execute logical predicates', () => {
      const andFn = compilePredicateFunction(Predicate.and(Predicate.gt(0), Predicate.lt(10)));

      expect(andFn(5)).toBe(true);
      expect(andFn(15)).toBe(false);

      const orFn = compilePredicateFunction(Predicate.or(Predicate.eq(5), Predicate.eq(10)));

      expect(orFn(5)).toBe(true);
      expect(orFn(7)).toBe(false);

      const notFn = compilePredicateFunction(Predicate.not(Predicate.eq(5)));
      expect(notFn(3)).toBe(true);
      expect(notFn(5)).toBe(false);
    });
  });

  describe('compileTransformFunction', () => {
    it('should compile and execute identity', () => {
      const fn = compileTransformFunction(Transform.identity());
      expect(fn(42)).toBe(42);
    });

    it('should compile and execute constant', () => {
      const fn = compileTransformFunction(Transform.constant(99));
      expect(fn(1)).toBe(99);
      expect(fn(2)).toBe(99);
    });

    it('should compile and execute property access', () => {
      const fn = compileTransformFunction(Transform.property('name'));
      expect(fn({ name: 'John' })).toBe('John');
    });

    it('should compile and execute arithmetic', () => {
      expect(compileTransformFunction(Transform.add(10))(5)).toBe(15);
      expect(compileTransformFunction(Transform.multiply(2))(5)).toBe(10);
      expect(compileTransformFunction(Transform.negate())(5)).toBe(-5);
    });

    it('should compile and execute string operations', () => {
      expect(compileTransformFunction(Transform.uppercase())('hello')).toBe('HELLO');
      expect(compileTransformFunction(Transform.lowercase())('HELLO')).toBe('hello');
      expect(compileTransformFunction(Transform.trim())('  test  ')).toBe('test');
    });

    it('should compile and execute array operations', () => {
      expect(compileTransformFunction(Transform.length())([1, 2, 3])).toBe(3);
      expect(compileTransformFunction(Transform.reverse())([1, 2, 3])).toEqual([3, 2, 1]);
    });

    it('should compile and execute conditional transform', () => {
      const fn = compileTransformFunction(
        Transform.ifThenElse(Predicate.gt(0), Transform.constant(1), Transform.constant(-1))
      );

      expect(fn(5)).toBe(1);
      expect(fn(-5)).toBe(-1);
    });
  });

  describe('compileReductionFunction', () => {
    it('should compile and execute sum', () => {
      const fn = compileReductionFunction(Reduce.sum());
      expect(fn([1, 2, 3, 4])).toBe(10);
    });

    it('should compile and execute product', () => {
      const fn = compileReductionFunction(Reduce.product());
      expect(fn([2, 3, 4])).toBe(24);
    });

    it('should compile and execute min/max', () => {
      expect(compileReductionFunction(Reduce.min())([5, 2, 8, 1])).toBe(1);
      expect(compileReductionFunction(Reduce.max())([5, 2, 8, 1])).toBe(8);
    });

    it('should compile and execute count', () => {
      const fn = compileReductionFunction(Reduce.count());
      expect(fn([1, 2, 3])).toBe(3);
    });

    it('should compile and execute average', () => {
      const fn = compileReductionFunction(Reduce.average());
      expect(fn([1, 2, 3, 4])).toBe(2.5);
    });

    it('should compile and execute first/last', () => {
      expect(compileReductionFunction(Reduce.first())([1, 2, 3])).toBe(1);
      expect(compileReductionFunction(Reduce.last())([1, 2, 3])).toBe(3);
    });

    it('should compile and execute any/all', () => {
      const anyFn = compileReductionFunction(Reduce.any(Predicate.gt(5)));
      expect(anyFn([1, 2, 6])).toBe(true);
      expect(anyFn([1, 2, 3])).toBe(false);

      const allFn = compileReductionFunction(Reduce.all(Predicate.gt(0)));
      expect(allFn([1, 2, 3])).toBe(true);
      expect(allFn([1, -1, 3])).toBe(false);
    });
  });
});
