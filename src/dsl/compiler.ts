/**
 * Safe DSL Compiler
 *
 * Compiles safe predicates, transforms, and reductions to JavaScript
 * These can then be further compiled to WebAssembly for performance
 *
 * SECURITY: This compiler generates code via Function constructor.
 * All inputs are validated and sanitized to prevent code injection.
 */

import {
  SafePredicate,
  SafeTransform,
  ReductionOp,
  ComparisonOp,
  ComplexityClass,
  getPredicateComplexity,
  getTransformComplexity,
} from './safe-types.js';
import {
  validatePropertyPath,
  validateRegexPattern,
  validateStringArg,
  safeSerialize,
  compileInRestrictedContext,
} from './security.js';

/**
 * Compilation context tracks variables and generates unique names
 */
export class CompilationContext {
  private varCounter = 0;
  public variables: Map<string, any> = new Map();

  generateVar(prefix: string = 'v'): string {
    return `_${prefix}_${this.varCounter++}`;
  }

  addVariable(name: string, value: any): void {
    this.variables.set(name, value);
  }
}

/**
 * Convert a comparison operator and two operand expressions into a JavaScript expression that performs that comparison.
 *
 * @param op - The comparison operator (e.g., `eq`, `ne`, `gt`, `gte`, `lt`, `lte`, `in`, `contains`, `matches`)
 * @param left - JavaScript expression used as the left-hand operand
 * @param right - JavaScript expression used as the right-hand operand
 * @returns A string containing a JavaScript expression that yields `true` when the comparison holds and `false` otherwise
 * @throws Error if `op` is an unknown comparison operator
 */
function compileComparison(op: ComparisonOp, left: string, right: string): string {
  switch (op) {
    case 'eq':
      return `${left} === ${right}`;
    case 'ne':
      return `${left} !== ${right}`;
    case 'gt':
      return `${left} > ${right}`;
    case 'gte':
      return `${left} >= ${right}`;
    case 'lt':
      return `${left} < ${right}`;
    case 'lte':
      return `${left} <= ${right}`;
    case 'in':
      return `${right}.includes(${left})`;
    case 'contains':
      // For arrays or strings
      return `(Array.isArray(${left}) || typeof ${left} === 'string') && ${left}.includes(${right})`;
    case 'matches':
      return `new RegExp(${right}).test(${left})`;
    default:
      throw new Error(`Unknown comparison operator: ${op}`);
  }
}

/**
 * Compiles a SafePredicate into a JavaScript boolean expression string that references the given input identifier.
 *
 * @param inputVar - Identifier to use for the input value inside the generated expression (defaults to `'x'`).
 * @returns A JavaScript expression string that evaluates the predicate against the specified input identifier.
 * @throws Error if the predicate has an unknown predicate type or an unknown expectedType for a type check.
 */
export function compilePredicate(predicate: SafePredicate, inputVar: string = 'x'): string {
  switch (predicate.type) {
    case 'compare': {
      const value = safeSerialize(predicate.value);
      // Special handling for 'matches' operator
      if (predicate.op === 'matches' && typeof predicate.value === 'string') {
        validateRegexPattern(predicate.value);
      }
      return compileComparison(predicate.op, inputVar, value);
    }

    case 'compare_property': {
      const property = predicate.property;
      validatePropertyPath([property]); // Validate property name
      const value = safeSerialize(predicate.value);
      const propAccess = `${inputVar}?.${property}`;
      // Special handling for 'matches' operator
      if (predicate.op === 'matches' && typeof predicate.value === 'string') {
        validateRegexPattern(predicate.value);
      }
      return compileComparison(predicate.op, propAccess, value);
    }

    case 'type_check': {
      const { expectedType } = predicate;
      switch (expectedType) {
        case 'number':
          return `typeof ${inputVar} === 'number'`;
        case 'string':
          return `typeof ${inputVar} === 'string'`;
        case 'boolean':
          return `typeof ${inputVar} === 'boolean'`;
        case 'array':
          return `Array.isArray(${inputVar})`;
        case 'object':
          return `typeof ${inputVar} === 'object' && ${inputVar} !== null && !Array.isArray(${inputVar})`;
        case 'null':
          return `${inputVar} === null`;
        default:
          throw new Error(`Unknown type: ${expectedType}`);
      }
    }

    case 'and': {
      const compiled = predicate.predicates.map((p) => `(${compilePredicate(p, inputVar)})`);
      return compiled.join(' && ');
    }

    case 'or': {
      const compiled = predicate.predicates.map((p) => `(${compilePredicate(p, inputVar)})`);
      return compiled.join(' || ');
    }

    case 'not': {
      return `!(${compilePredicate(predicate.predicate, inputVar)})`;
    }

    case 'always': {
      return predicate.value ? 'true' : 'false';
    }

    default: {
      const _exhaustive: never = predicate;
      throw new Error(`Unknown predicate type: ${JSON.stringify(_exhaustive)}`);
    }
  }
}

/**
 * Compile a SafeTransform into a JavaScript expression string.
 *
 * @param transform - The transform specification to compile.
 * @param inputVar - The variable name to use for the input value in the generated expression (defaults to `'x'`).
 * @returns The generated JavaScript expression as a string that applies the given transform to `inputVar`.
 */
export function compileTransform(transform: SafeTransform, inputVar: string = 'x'): string {
  switch (transform.type) {
    case 'identity':
      return inputVar;

    case 'constant':
      return JSON.stringify(transform.value);

    case 'property': {
      validatePropertyPath(transform.path); // Validate all property names
      let result = inputVar;
      for (const key of transform.path) {
        result = `${result}?.${key}`;
      }
      return result;
    }

    case 'arithmetic': {
      const { op, operand } = transform;
      switch (op) {
        case 'add':
          return `(${inputVar} + ${JSON.stringify(operand)})`;
        case 'subtract':
          return `(${inputVar} - ${JSON.stringify(operand)})`;
        case 'multiply':
          return `(${inputVar} * ${JSON.stringify(operand)})`;
        case 'divide':
          return `(${inputVar} / ${JSON.stringify(operand)})`;
        case 'modulo':
          return `(${inputVar} % ${JSON.stringify(operand)})`;
        case 'power':
          return `Math.pow(${inputVar}, ${JSON.stringify(operand)})`;
        case 'negate':
          return `-(${inputVar})`;
        default:
          throw new Error(`Unknown arithmetic op: ${op}`);
      }
    }

    case 'string': {
      const { op, args = [] } = transform;
      // Validate all string arguments
      args.forEach(validateStringArg);

      switch (op) {
        case 'uppercase':
          return `${inputVar}.toUpperCase()`;
        case 'lowercase':
          return `${inputVar}.toLowerCase()`;
        case 'trim':
          return `${inputVar}.trim()`;
        case 'concat':
          return `${inputVar}.concat(${args.map((a) => safeSerialize(a)).join(', ')})`;
        case 'substring':
          return `${inputVar}.substring(${args.map((a) => safeSerialize(a)).join(', ')})`;
        case 'split':
          // Validate split pattern if it could be a regex
          if (typeof args[0] === 'string') {
            validateStringArg(args[0]);
          }
          return `${inputVar}.split(${safeSerialize(args[0])})`;
        case 'replace':
          // Validate replace pattern if it could be a regex
          if (typeof args[0] === 'string') {
            validateStringArg(args[0]);
          }
          if (typeof args[1] === 'string') {
            validateStringArg(args[1]);
          }
          return `${inputVar}.replace(${safeSerialize(args[0])}, ${safeSerialize(args[1])})`;
        default:
          throw new Error(`Unknown string op: ${op}`);
      }
    }

    case 'array': {
      const { op, args = [] } = transform;
      switch (op) {
        case 'length':
          return `${inputVar}.length`;
        case 'reverse':
          return `[...${inputVar}].reverse()`;
        case 'slice':
          return `${inputVar}.slice(${args.map((a) => JSON.stringify(a)).join(', ')})`;
        case 'concat':
          return `${inputVar}.concat(${args.map((a) => JSON.stringify(a)).join(', ')})`;
        case 'at':
          return `${inputVar}[${JSON.stringify(args[0])}]`;
        default:
          throw new Error(`Unknown array op: ${op}`);
      }
    }

    case 'conditional': {
      const condition = compilePredicate(transform.condition, inputVar);
      const ifTrue = compileTransform(transform.ifTrue, inputVar);
      const ifFalse = compileTransform(transform.ifFalse, inputVar);
      return `((${condition}) ? (${ifTrue}) : (${ifFalse}))`;
    }

    case 'compose': {
      // Chain transforms: f(g(h(x)))
      let result = inputVar;
      for (const t of transform.transforms) {
        result = compileTransform(t, result);
      }
      return result;
    }

    case 'construct': {
      const fields = Object.entries(transform.fields)
        .map(([key, t]) => `${JSON.stringify(key)}: ${compileTransform(t, inputVar)}`)
        .join(', ');
      return `({ ${fields} })`;
    }

    default: {
      const _exhaustive: never = transform;
      throw new Error(`Unknown transform type: ${JSON.stringify(_exhaustive)}`);
    }
  }
}

/**
 * Compile a ReductionOp into a JavaScript expression operating on an array.
 * Includes validation for empty arrays where appropriate.
 *
 * @param reduction - The reduction operation to compile.
 * @param arrayVar - The identifier to use for the input array in the generated expression (defaults to 'arr').
 * @returns A JavaScript expression as a string that performs the specified reduction on `arrayVar`.
 */
export function compileReduction(reduction: ReductionOp, arrayVar: string = 'arr'): string {
  switch (reduction.type) {
    case 'sum':
      return `${arrayVar}.reduce((acc, x) => acc + x, 0)`;

    case 'product':
      return `${arrayVar}.reduce((acc, x) => acc * x, 1)`;

    case 'min':
      // Empty array validation: throw clear error instead of returning Infinity
      // Use reduce instead of spread to avoid V8 call-argument limits
      return `(${arrayVar}.length === 0 ? (() => { throw new Error('Cannot compute min of empty array'); })() : ${arrayVar}.reduce((a, b) => a < b ? a : b))`;

    case 'max':
      // Empty array validation: throw clear error instead of returning -Infinity
      // Use reduce instead of spread to avoid V8 call-argument limits
      return `(${arrayVar}.length === 0 ? (() => { throw new Error('Cannot compute max of empty array'); })() : ${arrayVar}.reduce((a, b) => a > b ? a : b))`;

    case 'count':
      return `${arrayVar}.length`;

    case 'average':
      // Empty array validation: throw clear error instead of returning NaN
      return `(${arrayVar}.length === 0 ? (() => { throw new Error('Cannot compute average of empty array'); })() : ${arrayVar}.reduce((acc, x) => acc + x, 0) / ${arrayVar}.length)`;

    case 'any': {
      const predicate = compilePredicate(reduction.predicate);
      return `${arrayVar}.some(x => ${predicate})`;
    }

    case 'all': {
      const predicate = compilePredicate(reduction.predicate);
      return `${arrayVar}.every(x => ${predicate})`;
    }

    case 'join':
      return `${arrayVar}.join(${JSON.stringify(reduction.separator)})`;

    case 'first':
      // Empty array validation: throw clear error instead of returning undefined
      return `(${arrayVar}.length === 0 ? (() => { throw new Error('Cannot get first element of empty array'); })() : ${arrayVar}[0])`;

    case 'last':
      // Empty array validation: throw clear error instead of returning undefined
      return `(${arrayVar}.length === 0 ? (() => { throw new Error('Cannot get last element of empty array'); })() : ${arrayVar}[${arrayVar}.length - 1])`;

    default: {
      const _exhaustive: never = reduction;
      throw new Error(`Unknown reduction type: ${JSON.stringify(_exhaustive)}`);
    }
  }
}

/**
 * Produces a predicate function that evaluates inputs against the given SafePredicate.
 *
 * @param predicate - The SafePredicate to compile into an executable predicate.
 * @returns A function that returns `true` if its input satisfies `predicate`, `false` otherwise.
 */
export function compilePredicateFunction(predicate: SafePredicate): (x: any) => boolean {
  const code = compilePredicate(predicate, 'x');
  // Use restricted context compilation for additional security
  return compileInRestrictedContext(code, ['x']) as (x: any) => boolean;
}

/**
 * Create a JavaScript function that applies the given SafeTransform to an input value.
 *
 * @param transform - The SafeTransform to compile into an executable function
 * @returns A function that accepts `x` and returns the result of applying `transform` to `x`
 */
export function compileTransformFunction(transform: SafeTransform): (x: any) => any {
  const code = compileTransform(transform, 'x');
  // Use restricted context compilation for additional security
  return compileInRestrictedContext(code, ['x']) as (x: any) => any;
}

/**
 * Create a function that applies the specified reduction operation to a provided array.
 *
 * @param reduction - Reduction operation descriptor that will be compiled into the returned function
 * @returns A function which, when called with an array, returns the result of applying `reduction` to that array
 */
export function compileReductionFunction(reduction: ReductionOp): (arr: any[]) => any {
  const code = compileReduction(reduction, 'arr');
  // Use restricted context compilation for additional security
  return compileInRestrictedContext(code, ['arr']) as (arr: any[]) => any;
}

/**
 * Estimate an execution cost score for a SafePredicate.
 *
 * Maps the predicate's complexity class to a numeric cost used for planning or optimization.
 *
 * @param predicate - The predicate to evaluate for complexity
 * @returns A numeric cost: `1` for constant, `10` for logarithmic, `100` for linear, and `1000` for higher or unknown complexity classes
 */
export function estimatePredicateCost(predicate: SafePredicate): number {
  const complexity = getPredicateComplexity(predicate);
  switch (complexity) {
    case ComplexityClass.CONSTANT:
      return 1;
    case ComplexityClass.LOGARITHMIC:
      return 10;
    case ComplexityClass.LINEAR:
      return 100;
    default:
      return 1000;
  }
}

/**
 * Estimate the execution cost of a transform.
 *
 * @param transform - The transform whose complexity will be evaluated
 * @returns A numeric cost score: `1` for constant complexity, `10` for logarithmic, `100` for linear, and `1000` for higher or unknown complexity
 */
export function estimateTransformCost(transform: SafeTransform): number {
  const complexity = getTransformComplexity(transform);
  switch (complexity) {
    case ComplexityClass.CONSTANT:
      return 1;
    case ComplexityClass.LOGARITHMIC:
      return 10;
    case ComplexityClass.LINEAR:
      return 100;
    default:
      return 1000;
  }
}
