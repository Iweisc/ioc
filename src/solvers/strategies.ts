// Strategy implementations - different execution approaches for intents

import { IntentNode, IntentType } from '../core/graph';

export interface ExecutionContext {
  variables: Record<string, any>;
  nodeResults: Record<string, any>;
}

export abstract class Strategy {
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
        const name = node.params['name'];
        return `${node.id} = ${name}`;
      }

      case IntentType.CONSTANT: {
        const value = node.params['value'];
        return `${node.id} = ${JSON.stringify(value)}`;
      }

      case IntentType.FILTER: {
        const inputId = node.inputs[0];
        const predName = `pred_${node.id}`;
        context.variables[predName] = node.params['predicate'];

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
        context.variables[transformName] = node.params['transform'];

        return `${node.id} = []
for (_item of ${inputId}) {
  ${node.id}.push(${transformName}(_item))
}`;
      }

      case IntentType.REDUCE: {
        const inputId = node.inputs[0];
        const opName = `op_${node.id}`;
        context.variables[opName] = node.params['operation'];
        const initial = node.params['initial'];

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
        const keyFunc = node.params['key'];
        const reverse = node.params['reverse'] || false;

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
        context.variables[keyName] = node.params['key'];

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
        const onName = `on_${node.id}`;
        context.variables[onName] = node.params['on'];

        return `${node.id} = []
for (_left of ${leftId}) {
  for (_right of ${rightId}) {
    if (${onName}(_left, _right)) {
      ${node.id}.push([_left, _right])
    }
  }
}`;
      }

      case IntentType.FLATTEN: {
        const inputId = node.inputs[0];
        return `${node.id} = []
for (_sublist of ${inputId}) {
  for (_item of _sublist) {
    ${node.id}.push(_item)
  }
}`;
      }

      case IntentType.DISTINCT: {
        const inputId = node.inputs[0];
        return `${node.id} = []
const _seen = new Set()
for (_item of ${inputId}) {
  if (!_seen.has(_item)) {
    _seen.add(_item)
    ${node.id}.push(_item)
  }
}`;
      }

      case IntentType.ASSERT: {
        const inputId = node.inputs[0];
        const predName = `pred_${node.id}`;
        context.variables[predName] = node.params['predicate'];
        const message = node.params['message'] || 'Assertion failed';

        return `if (!${predName}(${inputId})) {
  throw new Error(${JSON.stringify(message)})
}
${node.id} = ${inputId}`;
      }

      default:
        throw new Error(
          `Naive strategy doesn't support ${node.intentType}`
        );
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
      case IntentType.INPUT: {
        const name = node.params['name'];
        return `${node.id} = ${name}`;
      }

      case IntentType.CONSTANT: {
        const value = node.params['value'];
        return `${node.id} = ${JSON.stringify(value)}`;
      }

      case IntentType.FILTER: {
        const inputId = node.inputs[0];
        const predName = `pred_${node.id}`;
        context.variables[predName] = node.params['predicate'];

        return `${node.id} = ${inputId}.filter(${predName})`;
      }

      case IntentType.MAP: {
        const inputId = node.inputs[0];
        const transformName = `transform_${node.id}`;
        context.variables[transformName] = node.params['transform'];

        return `${node.id} = ${inputId}.map(${transformName})`;
      }

      case IntentType.REDUCE: {
        const inputId = node.inputs[0];
        const opName = `op_${node.id}`;
        context.variables[opName] = node.params['operation'];
        const initial = node.params['initial'];

        if (initial !== undefined) {
          return `${node.id} = ${inputId}.reduce(${opName}, ${JSON.stringify(initial)})`;
        } else {
          return `${node.id} = ${inputId}.reduce(${opName})`;
        }
      }

      case IntentType.SORT: {
        const inputId = node.inputs[0];
        const keyFunc = node.params['key'];
        const reverse = node.params['reverse'] || false;

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
        context.variables[keyName] = node.params['key'];

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
        const onName = `on_${node.id}`;
        context.variables[onName] = node.params['on'];

        return `${node.id} = ${leftId}.flatMap(_left => ${rightId}.filter(_right => ${onName}(_left, _right)).map(_right => [_left, _right]))`;
      }

      case IntentType.FLATTEN: {
        const inputId = node.inputs[0];
        return `${node.id} = ${inputId}.flat()`;
      }

      case IntentType.DISTINCT: {
        const inputId = node.inputs[0];
        return `${node.id} = [...new Set(${inputId})]`;
      }

      case IntentType.ASSERT: {
        const inputId = node.inputs[0];
        const predName = `pred_${node.id}`;
        context.variables[predName] = node.params['predicate'];
        const message = node.params['message'] || 'Assertion failed';

        return `if (!${predName}(${inputId})) {
  throw new Error(${JSON.stringify(message)})
}
${node.id} = ${inputId}`;
      }

      default:
        throw new Error(
          `Optimized strategy doesn't support ${node.intentType}`
        );
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
