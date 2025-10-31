// Strategy implementations - different execution approaches for intents

import { IntentNode, IntentType } from '../core/graph';

export interface ExecutionContext {
  variables: Record<string, any>;
  nodeResults: Record<string, any>;
}

/**
 * Safely get a parameter from a node, ensuring we only access own properties
 * and not prototype chain. This prevents potential prototype pollution attacks.
 */
function getParam(node: IntentNode, key: string): any {
  if (!Object.prototype.hasOwnProperty.call(node.params, key)) {
    return undefined;
  }
  return node.params[key];
}

/**
 * Common code generation helpers shared across strategies
 */
abstract class BaseStrategy {
  /**
   * Generate code for INPUT intent
   */
  protected generateInputCode(node: IntentNode): string {
    const name = getParam(node, 'name');
    return `${node.id} = ${name}`;
  }

  /**
   * Generate code for CONSTANT intent
   */
  protected generateConstantCode(node: IntentNode): string {
    const value = getParam(node, 'value');
    return `${node.id} = ${JSON.stringify(value)}`;
  }

  /**
   * Generate code for FLATTEN intent (naive - only supports depth=1)
   */
  protected generateFlattenCodeNaive(node: IntentNode): string {
    const inputId = node.inputs[0];
    const depth = getParam(node, 'depth') || 1;

    if (depth !== 1) {
      // For depth > 1, generate nested loops
      const loops: string[] = [];
      const pushIndent = '  '.repeat(depth);

      // Build nested loops
      for (let i = 0; i < depth; i++) {
        const indent = '  '.repeat(i);
        const varName = i === 0 ? inputId : `_item${i}`;
        const nextVar = `_item${i + 1}`;
        loops.push(`${indent}for (const ${nextVar} of ${varName}) {`);
      }

      loops.push(`${pushIndent}${node.id}.push(_item${depth})`);

      // Close loops
      for (let i = depth - 1; i >= 0; i--) {
        const indent = '  '.repeat(i);
        loops.push(`${indent}}`);
      }

      return `${node.id} = []\n${loops.join('\n')}`;
    }

    // Simple single-level flatten
    return `${node.id} = []
for (const _sublist of ${inputId}) {
  for (const _item of _sublist) {
    ${node.id}.push(_item)
  }
}`;
  }

  /**
   * Generate code for FLATTEN intent using built-in (optimized)
   */
  protected generateFlattenCodeOptimized(node: IntentNode): string {
    const inputId = node.inputs[0];
    const depth = getParam(node, 'depth') || 1;
    return `${node.id} = ${inputId}.flat(${depth})`;
  }

  /**
   * Generate code for DISTINCT intent (naive)
   */
  protected generateDistinctCodeNaive(node: IntentNode, context: ExecutionContext): string {
    const inputId = node.inputs[0];
    const keyFn = getParam(node, 'keyFn');

    if (keyFn) {
      const keyName = `key_${node.id}`;
      context.variables[keyName] = keyFn;
      return `${node.id} = []
const _seen = new Set()
for (const _item of ${inputId}) {
  const _key = ${keyName}(_item)
  if (!_seen.has(_key)) {
    _seen.add(_key)
    ${node.id}.push(_item)
  }
}`;
    }

    return `${node.id} = []
const _seen = new Set()
for (const _item of ${inputId}) {
  if (!_seen.has(_item)) {
    _seen.add(_item)
    ${node.id}.push(_item)
  }
}`;
  }

  /**
   * Generate code for DISTINCT intent (optimized)
   */
  protected generateDistinctCodeOptimized(node: IntentNode, context: ExecutionContext): string {
    const inputId = node.inputs[0];
    const keyFn = getParam(node, 'keyFn');

    if (keyFn) {
      // When keyFn is provided, we need to track by key but return original items
      const keyName = `key_${node.id}`;
      context.variables[keyName] = keyFn;
      return `${node.id} = []
const _seen = new Set()
for (const _item of ${inputId}) {
  const _key = ${keyName}(_item)
  if (!_seen.has(_key)) {
    _seen.add(_key)
    ${node.id}.push(_item)
  }
}`;
    }

    // Simple case: no keyFn, just deduplicate primitives
    return `${node.id} = [...new Set(${inputId})]`;
  }

  /**
   * Generate code for ASSERT intent
   */
  protected generateAssertCode(node: IntentNode, context: ExecutionContext): string {
    const inputId = node.inputs[0];
    const predName = `pred_${node.id}`;
    context.variables[predName] = getParam(node, 'predicate');
    const message = getParam(node, 'message') || 'Assertion failed';

    return `if (!${predName}(${inputId})) {
  throw new Error(${JSON.stringify(message)})
}
${node.id} = ${inputId}`;
  }
}

export abstract class Strategy extends BaseStrategy {
  /**
   * Check if this strategy can handle the given intent type
   */
  abstract canHandle(intentType: IntentType): boolean;

  /**
   * Generate code for executing a node with this strategy
   */
  abstract generateCode(node: IntentNode, context: ExecutionContext): string;

  /**
   * Get cost estimate for this strategy (lower is better)
   */
  abstract getCostEstimate(node: IntentNode, inputSizes: number[]): number;
}

export class NaiveStrategy extends Strategy {
  /**
   * Simple loops - readable but not optimized
   */
  canHandle(intentType: IntentType): boolean {
    return [
      IntentType.FILTER,
      IntentType.MAP,
      IntentType.REDUCE,
      IntentType.INPUT,
      IntentType.OUTPUT,
      IntentType.CONSTANT,
      IntentType.SORT,
      IntentType.GROUP_BY,
      IntentType.JOIN,
      IntentType.FLATTEN,
      IntentType.DISTINCT,
      IntentType.ASSERT,
    ].includes(intentType);
  }

  generateCode(node: IntentNode, context: ExecutionContext): string {
    switch (node.intentType) {
      case IntentType.INPUT: {
        const name = getParam(node, 'name');
        return `${node.id} = ${name}`;
      }

      case IntentType.CONSTANT: {
        const value = getParam(node, 'value');
        return `${node.id} = ${JSON.stringify(value)}`;
      }

      case IntentType.FILTER: {
        const inputId = node.inputs[0];
        const predName = `pred_${node.id}`;
        context.variables[predName] = getParam(node, 'predicate');

        return `${node.id} = []
for (_item of ${inputId}) {
  if (${predName}(_item)) {
    ${node.id}.push(_item)
  }
}`;
      }

      case IntentType.MAP: {
        const inputId = node.inputs[0];
        const transformName = `transform_${node.id}`;
        context.variables[transformName] = getParam(node, 'transform');

        return `${node.id} = []
for (_item of ${inputId}) {
  ${node.id}.push(${transformName}(_item))
}`;
      }

      case IntentType.REDUCE: {
        const inputId = node.inputs[0];
        const opName = `op_${node.id}`;
        context.variables[opName] = getParam(node, 'operation');
        const initial = getParam(node, 'initial');

        if (initial !== undefined) {
          return `${node.id} = ${JSON.stringify(initial)}
for (_item of ${inputId}) {
  ${node.id} = ${opName}(${node.id}, _item)
}`;
        } else {
          return `_items = ${inputId}[Symbol.iterator]()
${node.id} = _items.next().value
for (_item of _items) {
  ${node.id} = ${opName}(${node.id}, _item)
}`;
        }
      }

      case IntentType.SORT: {
        const inputId = node.inputs[0];
        const keyFunc = getParam(node, 'key');
        const reverse = getParam(node, 'reverse') || false;

        if (keyFunc) {
          const keyName = `key_${node.id}`;
          context.variables[keyName] = keyFunc;
          return reverse
            ? `${node.id} = [...${inputId}].sort((a, b) => ${keyName}(b) < ${keyName}(a) ? -1 : ${keyName}(b) > ${keyName}(a) ? 1 : 0)`
            : `${node.id} = [...${inputId}].sort((a, b) => ${keyName}(a) < ${keyName}(b) ? -1 : ${keyName}(a) > ${keyName}(b) ? 1 : 0)`;
        } else {
          return reverse
            ? `${node.id} = [...${inputId}].sort().reverse()`
            : `${node.id} = [...${inputId}].sort()`;
        }
      }

      case IntentType.GROUP_BY: {
        const inputId = node.inputs[0];
        const keyName = `key_${node.id}`;
        context.variables[keyName] = getParam(node, 'key');

        return `${node.id} = {}
for (_item of ${inputId}) {
  const _key = ${keyName}(_item)
  if (!${node.id}[_key]) {
    ${node.id}[_key] = []
  }
  ${node.id}[_key].push(_item)
}`;
      }

      case IntentType.JOIN: {
        const [leftId, rightId] = node.inputs;
        const leftKeyName = `leftKey_${node.id}`;
        const rightKeyName = `rightKey_${node.id}`;
        context.variables[leftKeyName] = getParam(node, 'leftKey');
        context.variables[rightKeyName] = getParam(node, 'rightKey');

        return `${node.id} = []
for (_left of ${leftId}) {
  for (_right of ${rightId}) {
    if (${leftKeyName}(_left) === ${rightKeyName}(_right)) {
      ${node.id}.push([_left, _right])
    }
  }
}`;
      }

      case IntentType.FLATTEN:
        return this.generateFlattenCodeNaive(node);

      case IntentType.DISTINCT:
        return this.generateDistinctCodeNaive(node, context);

      case IntentType.ASSERT:
        return this.generateAssertCode(node, context);

      default:
        throw new Error(`Naive strategy doesn't support ${node.intentType}`);
    }
  }

  getCostEstimate(node: IntentNode, inputSizes: number[]): number {
    if (inputSizes.length === 0) return 1.0;

    const baseCost = inputSizes[0] || 1.0;

    // Filter and map scale linearly
    if ([IntentType.FILTER, IntentType.MAP].includes(node.intentType)) {
      return baseCost * 1.0;
    }

    // Reduce is inherently sequential
    if (node.intentType === IntentType.REDUCE) {
      return baseCost * 1.5;
    }

    return 1.0;
  }
}

export class OptimizedStrategy extends Strategy {
  /**
   * Uses built-ins and functional methods for better performance
   */
  canHandle(intentType: IntentType): boolean {
    return [
      IntentType.FILTER,
      IntentType.MAP,
      IntentType.REDUCE,
      IntentType.INPUT,
      IntentType.OUTPUT,
      IntentType.CONSTANT,
      IntentType.SORT,
      IntentType.GROUP_BY,
      IntentType.JOIN,
      IntentType.FLATTEN,
      IntentType.DISTINCT,
      IntentType.ASSERT,
    ].includes(intentType);
  }

  generateCode(node: IntentNode, context: ExecutionContext): string {
    switch (node.intentType) {
      case IntentType.INPUT:
        return this.generateInputCode(node);

      case IntentType.CONSTANT:
        return this.generateConstantCode(node);

      case IntentType.FILTER: {
        const inputId = node.inputs[0];
        const predName = `pred_${node.id}`;
        context.variables[predName] = getParam(node, 'predicate');

        return `${node.id} = ${inputId}.filter(${predName})`;
      }

      case IntentType.MAP: {
        const inputId = node.inputs[0];
        const transformName = `transform_${node.id}`;
        context.variables[transformName] = getParam(node, 'transform');

        return `${node.id} = ${inputId}.map(${transformName})`;
      }

      case IntentType.REDUCE: {
        const inputId = node.inputs[0];
        const opName = `op_${node.id}`;
        context.variables[opName] = getParam(node, 'operation');
        const initial = getParam(node, 'initial');

        if (initial !== undefined) {
          return `${node.id} = ${inputId}.reduce(${opName}, ${JSON.stringify(initial)})`;
        } else {
          return `${node.id} = ${inputId}.reduce(${opName})`;
        }
      }

      case IntentType.SORT: {
        const inputId = node.inputs[0];
        const keyFunc = getParam(node, 'key');
        const reverse = getParam(node, 'reverse') || false;

        if (keyFunc) {
          const keyName = `key_${node.id}`;
          context.variables[keyName] = keyFunc;
          return reverse
            ? `${node.id} = [...${inputId}].sort((a, b) => ${keyName}(b) < ${keyName}(a) ? -1 : ${keyName}(b) > ${keyName}(a) ? 1 : 0)`
            : `${node.id} = [...${inputId}].sort((a, b) => ${keyName}(a) < ${keyName}(b) ? -1 : ${keyName}(a) > ${keyName}(b) ? 1 : 0)`;
        } else {
          return reverse
            ? `${node.id} = [...${inputId}].sort().reverse()`
            : `${node.id} = [...${inputId}].sort()`;
        }
      }

      case IntentType.GROUP_BY: {
        const inputId = node.inputs[0];
        const keyName = `key_${node.id}`;
        context.variables[keyName] = getParam(node, 'key');

        // Use reduce for a more functional approach
        return `${node.id} = ${inputId}.reduce((acc, _item) => {
  const _key = ${keyName}(_item)
  if (!acc[_key]) acc[_key] = []
  acc[_key].push(_item)
  return acc
}, {})`;
      }

      case IntentType.JOIN: {
        const [leftId, rightId] = node.inputs;
        const leftKeyName = `leftKey_${node.id}`;
        const rightKeyName = `rightKey_${node.id}`;
        context.variables[leftKeyName] = getParam(node, 'leftKey');
        context.variables[rightKeyName] = getParam(node, 'rightKey');

        return `${node.id} = ${leftId}.flatMap(_left => ${rightId}.filter(_right => ${leftKeyName}(_left) === ${rightKeyName}(_right)).map(_right => [_left, _right]))`;
      }

      case IntentType.FLATTEN:
        return this.generateFlattenCodeOptimized(node);

      case IntentType.DISTINCT:
        return this.generateDistinctCodeOptimized(node, context);

      case IntentType.ASSERT:
        return this.generateAssertCode(node, context);

      default:
        throw new Error(`Optimized strategy doesn't support ${node.intentType}`);
    }
  }

  getCostEstimate(node: IntentNode, inputSizes: number[]): number {
    if (inputSizes.length === 0) return 0.8;

    const baseCost = inputSizes[0] || 1.0;

    // Native methods are typically faster
    if ([IntentType.FILTER, IntentType.MAP].includes(node.intentType)) {
      return baseCost * 0.5;
    }

    // Native reduce is optimized
    if (node.intentType === IntentType.REDUCE) {
      return baseCost * 0.8;
    }

    return 0.8;
  }
}

export class VectorizedStrategy extends Strategy {
  /**
   * Future: SIMD/WebAssembly for numerical operations
   */
  canHandle(_intentType: IntentType): boolean {
    return false; // Placeholder for future implementation
  }

  generateCode(_node: IntentNode, _context: ExecutionContext): string {
    throw new Error('Vectorized strategy not yet implemented');
  }

  getCostEstimate(_node: IntentNode, inputSizes: number[]): number {
    const firstSize = inputSizes[0];
    return inputSizes.length > 0 && firstSize !== undefined && firstSize > 1000 ? 0.1 : Infinity;
  }
}
