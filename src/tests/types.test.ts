/**
 * Tests for IOC type system
 */

import { describe, it, expect } from 'vitest';
import { IntType, FloatType, BoolType, ListType, AnyType, inferType } from '../core/types.js';

describe('IntType', () => {
  it('should match integers', () => {
    const intType = new IntType();
    expect(intType.matches(42)).toBe(true);
    expect(intType.matches(-10)).toBe(true);
    expect(intType.matches(0)).toBe(true);
  });

  it('should not match non-integers', () => {
    const intType = new IntType();
    expect(intType.matches(3.14)).toBe(false);
    expect(intType.matches('42')).toBe(false);
    expect(intType.matches(true)).toBe(false);
  });

  it('should respect min/max constraints', () => {
    const intType = new IntType(0, 100);
    expect(intType.matches(50)).toBe(true);
    expect(intType.matches(-1)).toBe(false);
    expect(intType.matches(101)).toBe(false);
  });

  it('should generate correct LLVM type', () => {
    const int32 = new IntType();
    expect(int32.toLLVMType()).toBe('i32');

    const int64 = new IntType(undefined, undefined, 64);
    expect(int64.toLLVMType()).toBe('i64');
  });
});

describe('FloatType', () => {
  it('should match numbers', () => {
    const floatType = new FloatType();
    expect(floatType.matches(3.14)).toBe(true);
    expect(floatType.matches(42)).toBe(true);
    expect(floatType.matches(-1.5)).toBe(true);
  });

  it('should not match non-numbers', () => {
    const floatType = new FloatType();
    expect(floatType.matches('3.14')).toBe(false);
    expect(floatType.matches(true)).toBe(false);
  });

  it('should generate correct LLVM type', () => {
    const single = new FloatType(undefined, undefined, 'single');
    expect(single.toLLVMType()).toBe('float');

    const double = new FloatType(undefined, undefined, 'double');
    expect(double.toLLVMType()).toBe('double');
  });
});

describe('BoolType', () => {
  it('should match booleans', () => {
    const boolType = new BoolType();
    expect(boolType.matches(true)).toBe(true);
    expect(boolType.matches(false)).toBe(true);
  });

  it('should not match non-booleans', () => {
    const boolType = new BoolType();
    expect(boolType.matches(1)).toBe(false);
    expect(boolType.matches(0)).toBe(false);
    expect(boolType.matches('true')).toBe(false);
  });

  it('should generate correct LLVM type', () => {
    const boolType = new BoolType();
    expect(boolType.toLLVMType()).toBe('i1');
  });
});

describe('ListType', () => {
  it('should match arrays', () => {
    const listType = new ListType();
    expect(listType.matches([])).toBe(true);
    expect(listType.matches([1, 2, 3])).toBe(true);
  });

  it('should validate element types', () => {
    const intListType = new ListType(new IntType());
    expect(intListType.matches([1, 2, 3])).toBe(true);
    expect(intListType.matches([1, 2.5, 3])).toBe(false);
  });

  it('should respect length constraints', () => {
    const listType = new ListType(new AnyType(), 2, 5);
    expect(listType.matches([1])).toBe(false);
    expect(listType.matches([1, 2])).toBe(true);
    expect(listType.matches([1, 2, 3, 4, 5])).toBe(true);
    expect(listType.matches([1, 2, 3, 4, 5, 6])).toBe(false);
  });
});

describe('inferType', () => {
  it('should infer boolean type', () => {
    const type = inferType(true);
    expect(type).toBeInstanceOf(BoolType);
  });

  it('should infer integer type', () => {
    const type = inferType(42);
    expect(type).toBeInstanceOf(IntType);
  });

  it('should infer float type', () => {
    const type = inferType(3.14);
    expect(type).toBeInstanceOf(FloatType);
  });

  it('should infer list type', () => {
    const type = inferType([1, 2, 3]);
    expect(type).toBeInstanceOf(ListType);
  });

  it('should default to Any for unknown types', () => {
    const type = inferType({ foo: 'bar' });
    expect(type).toBeInstanceOf(AnyType);
  });
});

// Additional tests for arithmetic predicate complexity
describe('Arithmetic Predicate Complexity', () => {
  it('should return CONSTANT complexity for compare_arithmetic predicates', () => {
    const predicate: SafePredicate = {
      type: 'compare_arithmetic',
      arithmeticOp: 'mod',
      arithmeticValue: 2,
      comparisonOp: 'eq',
      comparisonValue: 0,
    };

    const complexity = getPredicateComplexity(predicate);
    expect(complexity).toBe(ComplexityClass.CONSTANT);
  });

  it('should handle arithmetic predicates in AND combinations', () => {
    const arithmeticPred: SafePredicate = {
      type: 'compare_arithmetic',
      arithmeticOp: 'multiply',
      arithmeticValue: 3,
      comparisonOp: 'gt',
      comparisonValue: 10,
    };

    const combinedPred: SafePredicate = {
      type: 'and',
      predicates: [arithmeticPred, Predicate.lt(100)],
    };

    const complexity = getPredicateComplexity(combinedPred);
    expect(complexity).toBe(ComplexityClass.CONSTANT);
  });

  it('should handle arithmetic predicates in OR combinations', () => {
    const arithmeticPred1: SafePredicate = {
      type: 'compare_arithmetic',
      arithmeticOp: 'add',
      arithmeticValue: 5,
      comparisonOp: 'eq',
      comparisonValue: 10,
    };

    const arithmeticPred2: SafePredicate = {
      type: 'compare_arithmetic',
      arithmeticOp: 'subtract',
      arithmeticValue: 5,
      comparisonOp: 'eq',
      comparisonValue: 0,
    };

    const combinedPred: SafePredicate = {
      type: 'or',
      predicates: [arithmeticPred1, arithmeticPred2],
    };

    const complexity = getPredicateComplexity(combinedPred);
    expect(complexity).toBe(ComplexityClass.CONSTANT);
  });

  it('should handle negated arithmetic predicates', () => {
    const arithmeticPred: SafePredicate = {
      type: 'compare_arithmetic',
      arithmeticOp: 'divide',
      arithmeticValue: 2,
      comparisonOp: 'ne',
      comparisonValue: 5,
    };

    const negatedPred: SafePredicate = {
      type: 'not',
      predicate: arithmeticPred,
    };

    const complexity = getPredicateComplexity(negatedPred);
    expect(complexity).toBe(ComplexityClass.CONSTANT);
  });
});

describe('Arithmetic Predicate Type Safety', () => {
  it('should accept all arithmetic operations', () => {
    const operations: Array<'multiply' | 'add' | 'subtract' | 'divide' | 'mod'> = [
      'multiply',
      'add',
      'subtract',
      'divide',
      'mod',
    ];

    operations.forEach((op) => {
      const predicate: SafePredicate = {
        type: 'compare_arithmetic',
        arithmeticOp: op,
        arithmeticValue: 2,
        comparisonOp: 'eq',
        comparisonValue: 0,
      };

      expect(predicate.type).toBe('compare_arithmetic');
      expect(predicate.arithmeticOp).toBe(op);
    });
  });

  it('should accept all comparison operators', () => {
    const comparisons: Array<'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'ne'> = [
      'gt',
      'lt',
      'gte',
      'lte',
      'eq',
      'ne',
    ];

    comparisons.forEach((comp) => {
      const predicate: SafePredicate = {
        type: 'compare_arithmetic',
        arithmeticOp: 'mod',
        arithmeticValue: 2,
        comparisonOp: comp,
        comparisonValue: 0,
      };

      expect(predicate.comparisonOp).toBe(comp);
    });
  });

  it('should accept various comparison values', () => {
    const values: Array<number | string | boolean> = [0, 1, -5, 'test', true, false];

    values.forEach((value) => {
      const predicate: SafePredicate = {
        type: 'compare_arithmetic',
        arithmeticOp: 'add',
        arithmeticValue: 10,
        comparisonOp: 'eq',
        comparisonValue: value,
      };

      expect(predicate.comparisonValue).toBe(value);
    });
  });
});