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
