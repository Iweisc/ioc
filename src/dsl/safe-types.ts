/**
 * Safe DSL Type System for IOC
 *
 * This module defines a restricted, serializable language for expressing
 * computation intents without arbitrary code execution.
 *
 * Key guarantees:
 * - All operations are structurally terminating
 * - Everything is serializable to JSON
 * - No side effects or I/O
 * - Complexity bounds are statically known
 */

/**
 * Safe value types that can appear in the DSL
 */
export type SafeValue =
  | number
  | string
  | boolean
  | null
  | SafeValue[]
  | { [key: string]: SafeValue };

/**
 * Safe comparison operators
 */
export type ComparisonOp =
  | 'eq' // equals
  | 'ne' // not equals
  | 'gt' // greater than
  | 'gte' // greater than or equal
  | 'lt' // less than
  | 'lte' // less than or equal
  | 'in' // value in array
  | 'contains' // array/string contains value
  | 'matches'; // string matches regex pattern

/**
 * Safe predicates - boolean expressions that are provably terminating
 */
export type SafePredicate =
  | { type: 'compare'; op: ComparisonOp; value: SafeValue }
  | { type: 'compare_property'; op: ComparisonOp; property: string; value: SafeValue }
  | {
      type: 'type_check';
      expectedType: 'number' | 'string' | 'boolean' | 'array' | 'object' | 'null';
    }
  | { type: 'and'; predicates: SafePredicate[] }
  | { type: 'or'; predicates: SafePredicate[] }
  | { type: 'not'; predicate: SafePredicate }
  | { type: 'always'; value: boolean };

/**
 * Safe arithmetic operations
 */
export type ArithmeticOp =
  | 'add'
  | 'subtract'
  | 'multiply'
  | 'divide'
  | 'modulo'
  | 'power'
  | 'negate';

/**
 * Safe string operations
 */
export type StringOp =
  | 'concat'
  | 'substring'
  | 'uppercase'
  | 'lowercase'
  | 'trim'
  | 'split'
  | 'join'
  | 'replace';

/**
 * Safe array operations
 */
export type ArrayOp = 'length' | 'reverse' | 'slice' | 'concat' | 'at';

/**
 * Safe transforms - pure functions with known complexity
 */
export type SafeTransform =
  | { type: 'identity' }
  | { type: 'constant'; value: SafeValue }
  | { type: 'property'; path: string[] }
  | { type: 'arithmetic'; op: ArithmeticOp; operand?: SafeValue }
  | { type: 'string'; op: StringOp; args?: SafeValue[] }
  | { type: 'array'; op: ArrayOp; args?: SafeValue[] }
  | { type: 'conditional'; condition: SafePredicate; ifTrue: SafeTransform; ifFalse: SafeTransform }
  | { type: 'compose'; transforms: SafeTransform[] }
  | { type: 'construct'; fields: { [key: string]: SafeTransform } };

/**
 * Safe reduction operations
 */
export type ReductionOp =
  | { type: 'sum' }
  | { type: 'product' }
  | { type: 'min' }
  | { type: 'max' }
  | { type: 'count' }
  | { type: 'average' }
  | { type: 'any'; predicate: SafePredicate }
  | { type: 'all'; predicate: SafePredicate }
  | { type: 'join'; separator: string }
  | { type: 'first' }
  | { type: 'last' };

/**
 * Complexity bounds for operations
 */
export enum ComplexityClass {
  CONSTANT = 'O(1)',
  LOGARITHMIC = 'O(log n)',
  LINEAR = 'O(n)',
  LINEARITHMIC = 'O(n log n)',
  QUADRATIC = 'O(n²)',
  CUBIC = 'O(n³)',
  EXPONENTIAL = 'O(2^n)',
  FACTORIAL = 'O(n!)',
}

/**
 * Estimate the worst-case complexity class for a SafePredicate.
 *
 * @param predicate - The predicate to analyze.
 * @returns The ComplexityClass representing the highest (worst-case) complexity among the predicate and its sub-predicates.
 */
export function getPredicateComplexity(predicate: SafePredicate): ComplexityClass {
  switch (predicate.type) {
    case 'compare':
    case 'compare_property':
    case 'type_check':
    case 'always':
      return ComplexityClass.CONSTANT;

    case 'not':
      return getPredicateComplexity(predicate.predicate);

    case 'and':
    case 'or':
      // Max complexity of all sub-predicates
      const complexities = predicate.predicates.map(getPredicateComplexity);
      return complexities.reduce(
        (max, c) =>
          Object.values(ComplexityClass).indexOf(c) > Object.values(ComplexityClass).indexOf(max)
            ? c
            : max,
        ComplexityClass.CONSTANT
      );

    default:
      return ComplexityClass.CONSTANT;
  }
}

/**
 * Estimate the worst-case ComplexityClass for a SafeTransform.
 *
 * Maps transform variants to conservative complexity estimates:
 * - `identity`, `constant`, `property`, `arithmetic` => CONSTANT
 * - `string` => LINEAR
 * - `array` => CONSTANT for `length`, LINEAR otherwise
 * - `conditional` => maximum of the condition's predicate complexity and both branch transforms
 * - `compose` => maximum complexity among composed transforms
 * - `construct` => maximum complexity among field transforms
 * - default => CONSTANT
 *
 * @param transform - The SafeTransform to analyze
 * @returns The worst-case ComplexityClass for `transform`
export function getTransformComplexity(transform: SafeTransform): ComplexityClass {
  switch (transform.type) {
    case 'identity':
    case 'constant':
    case 'property':
    case 'arithmetic':
      return ComplexityClass.CONSTANT;

    case 'string':
      // Most string ops are O(n) where n is string length
      return ComplexityClass.LINEAR;

    case 'array':
      if (transform.op === 'length') return ComplexityClass.CONSTANT;
      return ComplexityClass.LINEAR;

    case 'conditional':
      const condComplexity = getPredicateComplexity(transform.condition);
      const trueComplexity = getTransformComplexity(transform.ifTrue);
      const falseComplexity = getTransformComplexity(transform.ifFalse);

      // Max of all branches
      return [condComplexity, trueComplexity, falseComplexity].reduce(
        (max, c) =>
          Object.values(ComplexityClass).indexOf(c) > Object.values(ComplexityClass).indexOf(max)
            ? c
            : max,
        ComplexityClass.CONSTANT
      );

    case 'compose':
      // Sum of all transforms (conservative)
      const composeComplexities = transform.transforms.map(getTransformComplexity);
      return composeComplexities.reduce(
        (max, c) =>
          Object.values(ComplexityClass).indexOf(c) > Object.values(ComplexityClass).indexOf(max)
            ? c
            : max,
        ComplexityClass.CONSTANT
      );

    case 'construct':
      // Max of all field transforms
      const fieldComplexities = Object.values(transform.fields).map(getTransformComplexity);
      return fieldComplexities.reduce(
        (max, c) =>
          Object.values(ComplexityClass).indexOf(c) > Object.values(ComplexityClass).indexOf(max)
            ? c
            : max,
        ComplexityClass.CONSTANT
      );

    default:
      return ComplexityClass.CONSTANT;
  }
}

/**
 * Checks whether a value conforms to the SafeValue structure.
 *
 * @returns `true` if the value is `null`, a number, string, or boolean, an array whose elements are all SafeValue, or a plain object whose property values are all SafeValue; `false` otherwise.
 */
export function validateSafeValue(value: unknown): value is SafeValue {
  if (value === null) return true;

  const type = typeof value;
  if (type === 'number' || type === 'string' || type === 'boolean') {
    return true;
  }

  if (type === 'function' || type === 'symbol' || type === 'undefined') {
    return false;
  }

  if (Array.isArray(value)) {
    return value.every(validateSafeValue);
  }

  if (type === 'object') {
    return Object.values(value as object).every(validateSafeValue);
  }

  return false;
}

/**
 * Helper functions to build safe predicates
 */
export const Predicate = {
  eq: (value: SafeValue): SafePredicate => ({ type: 'compare', op: 'eq', value }),
  ne: (value: SafeValue): SafePredicate => ({ type: 'compare', op: 'ne', value }),
  gt: (value: SafeValue): SafePredicate => ({ type: 'compare', op: 'gt', value }),
  gte: (value: SafeValue): SafePredicate => ({ type: 'compare', op: 'gte', value }),
  lt: (value: SafeValue): SafePredicate => ({ type: 'compare', op: 'lt', value }),
  lte: (value: SafeValue): SafePredicate => ({ type: 'compare', op: 'lte', value }),
  in: (value: SafeValue): SafePredicate => ({ type: 'compare', op: 'in', value }),
  contains: (value: SafeValue): SafePredicate => ({ type: 'compare', op: 'contains', value }),
  matches: (pattern: string): SafePredicate => ({ type: 'compare', op: 'matches', value: pattern }),

  property: {
    eq: (property: string, value: SafeValue): SafePredicate => ({
      type: 'compare_property',
      op: 'eq',
      property,
      value,
    }),
    gt: (property: string, value: SafeValue): SafePredicate => ({
      type: 'compare_property',
      op: 'gt',
      property,
      value,
    }),
    lt: (property: string, value: SafeValue): SafePredicate => ({
      type: 'compare_property',
      op: 'lt',
      property,
      value,
    }),
  },

  isNumber: (): SafePredicate => ({ type: 'type_check', expectedType: 'number' }),
  isString: (): SafePredicate => ({ type: 'type_check', expectedType: 'string' }),
  isArray: (): SafePredicate => ({ type: 'type_check', expectedType: 'array' }),

  and: (...predicates: SafePredicate[]): SafePredicate => ({ type: 'and', predicates }),
  or: (...predicates: SafePredicate[]): SafePredicate => ({ type: 'or', predicates }),
  not: (predicate: SafePredicate): SafePredicate => ({ type: 'not', predicate }),

  always: (value: boolean = true): SafePredicate => ({ type: 'always', value }),
};

/**
 * Helper functions to build safe transforms
 */
export const Transform = {
  identity: (): SafeTransform => ({ type: 'identity' }),
  constant: (value: SafeValue): SafeTransform => ({ type: 'constant', value }),
  property: (...path: string[]): SafeTransform => ({ type: 'property', path }),

  add: (value: number): SafeTransform => ({ type: 'arithmetic', op: 'add', operand: value }),
  subtract: (value: number): SafeTransform => ({
    type: 'arithmetic',
    op: 'subtract',
    operand: value,
  }),
  multiply: (value: number): SafeTransform => ({
    type: 'arithmetic',
    op: 'multiply',
    operand: value,
  }),
  divide: (value: number): SafeTransform => ({ type: 'arithmetic', op: 'divide', operand: value }),
  negate: (): SafeTransform => ({ type: 'arithmetic', op: 'negate' }),

  uppercase: (): SafeTransform => ({ type: 'string', op: 'uppercase' }),
  lowercase: (): SafeTransform => ({ type: 'string', op: 'lowercase' }),
  trim: (): SafeTransform => ({ type: 'string', op: 'trim' }),

  length: (): SafeTransform => ({ type: 'array', op: 'length' }),
  reverse: (): SafeTransform => ({ type: 'array', op: 'reverse' }),

  ifThenElse: (
    condition: SafePredicate,
    ifTrue: SafeTransform,
    ifFalse: SafeTransform
  ): SafeTransform => ({
    type: 'conditional',
    condition,
    ifTrue,
    ifFalse,
  }),

  compose: (...transforms: SafeTransform[]): SafeTransform => ({ type: 'compose', transforms }),

  construct: (fields: { [key: string]: SafeTransform }): SafeTransform => ({
    type: 'construct',
    fields,
  }),
};

/**
 * Helper functions to build safe reductions
 */
export const Reduce = {
  sum: (): ReductionOp => ({ type: 'sum' }),
  product: (): ReductionOp => ({ type: 'product' }),
  min: (): ReductionOp => ({ type: 'min' }),
  max: (): ReductionOp => ({ type: 'max' }),
  count: (): ReductionOp => ({ type: 'count' }),
  average: (): ReductionOp => ({ type: 'average' }),
  any: (predicate: SafePredicate): ReductionOp => ({ type: 'any', predicate }),
  all: (predicate: SafePredicate): ReductionOp => ({ type: 'all', predicate }),
  first: (): ReductionOp => ({ type: 'first' }),
  last: (): ReductionOp => ({ type: 'last' }),
};