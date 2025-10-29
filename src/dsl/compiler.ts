/**
 * Safe DSL Compiler
 *
 * Compiles safe predicates, transforms, and reductions to JavaScript
 * These can then be further compiled to WebAssembly for performance
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
 * Compile a comparison operation
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
 * Compile a safe predicate to JavaScript expression
 */
export function compilePredicate(predicate: SafePredicate, inputVar: string = 'x'): string {
  switch (predicate.type) {
    case 'compare': {
      const value = JSON.stringify(predicate.value);
      return compileComparison(predicate.op, inputVar, value);
    }

    case 'compare_property': {
      const property = predicate.property;
      const value = JSON.stringify(predicate.value);
      const propAccess = `${inputVar}?.${property}`;
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
 * Compile a safe transform to JavaScript expression
 */
export function compileTransform(transform: SafeTransform, inputVar: string = 'x'): string {
  switch (transform.type) {
    case 'identity':
      return inputVar;

    case 'constant':
      return JSON.stringify(transform.value);

    case 'property': {
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
      switch (op) {
        case 'uppercase':
          return `${inputVar}.toUpperCase()`;
        case 'lowercase':
          return `${inputVar}.toLowerCase()`;
        case 'trim':
          return `${inputVar}.trim()`;
        case 'concat':
          return `${inputVar}.concat(${args.map((a) => JSON.stringify(a)).join(', ')})`;
        case 'substring':
          return `${inputVar}.substring(${args.map((a) => JSON.stringify(a)).join(', ')})`;
        case 'split':
          return `${inputVar}.split(${JSON.stringify(args[0])})`;
        case 'replace':
          return `${inputVar}.replace(${JSON.stringify(args[0])}, ${JSON.stringify(args[1])})`;
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
 * Compile a reduction operation to JavaScript code
 */
export function compileReduction(reduction: ReductionOp, arrayVar: string = 'arr'): string {
  switch (reduction.type) {
    case 'sum':
      return `${arrayVar}.reduce((acc, x) => acc + x, 0)`;

    case 'product':
      return `${arrayVar}.reduce((acc, x) => acc * x, 1)`;

    case 'min':
      return `Math.min(...${arrayVar})`;

    case 'max':
      return `Math.max(...${arrayVar})`;

    case 'count':
      return `${arrayVar}.length`;

    case 'average':
      return `${arrayVar}.reduce((acc, x) => acc + x, 0) / ${arrayVar}.length`;

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
      return `${arrayVar}[0]`;

    case 'last':
      return `${arrayVar}[${arrayVar}.length - 1]`;

    default: {
      const _exhaustive: never = reduction;
      throw new Error(`Unknown reduction type: ${JSON.stringify(_exhaustive)}`);
    }
  }
}

/**
 * Compile predicate to executable function
 */
export function compilePredicateFunction(predicate: SafePredicate): (x: any) => boolean {
  const code = compilePredicate(predicate, 'x');
  // eslint-disable-next-line no-new-func
  return new Function('x', `return ${code}`) as (x: any) => boolean;
}

/**
 * Compile transform to executable function
 */
export function compileTransformFunction(transform: SafeTransform): (x: any) => any {
  const code = compileTransform(transform, 'x');
  // eslint-disable-next-line no-new-func
  return new Function('x', `return ${code}`) as (x: any) => any;
}

/**
 * Compile reduction to executable function
 */
export function compileReductionFunction(reduction: ReductionOp): (arr: any[]) => any {
  const code = compileReduction(reduction, 'arr');
  // eslint-disable-next-line no-new-func
  return new Function('arr', `return ${code}`) as (arr: any[]) => any;
}

/**
 * Get estimated cost for executing a predicate
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
 * Get estimated cost for executing a transform
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
