/**
 * SafeGraph - High-level API for building IOC programs with safety guarantees
 *
 * This provides a type-safe, builder-style API for constructing programs
 * using only safe, serializable operations.
 */

import { randomUUID } from 'crypto';
import {
  SafePredicate,
  SafeTransform,
  ReductionOp,
  SafeValue,
  ComplexityClass,
} from './safe-types.js';
import {
  IOCProgram,
  IOCNode,
  IOCIntentType,
  IOCNodeParams,
  calculateNodeCapability,
  serializeIOC,
  validateIOCProgram,
} from './ioc-format.js';
import {
  compilePredicateFunction,
  compileTransformFunction,
  compileReductionFunction,
} from './compiler.js';
import { TerminationVerifier } from '../core/verifier.js';

/**
 * Safe graph builder with fluent API
 */
export class SafeGraph {
  private nodes: Map<string, IOCNode> = new Map();
  private outputs: Set<string> = new Set();
  private metadata: IOCProgram['metadata'] = {};

  constructor(name?: string) {
    if (name) {
      this.metadata.name = name;
    }
  }

  /**
   * Generate unique node ID
   */
  private generateId(prefix: string): string {
    return `${prefix}_${randomUUID().slice(0, 8)}`;
  }

  /**
   * Add a node to the graph
   */
  private addNode(node: IOCNode): string {
    this.nodes.set(node.id, node);
    return node.id;
  }

  /**
   * Get a node by ID
   */
  getNode(id: string): IOCNode | undefined {
    return this.nodes.get(id);
  }

  /**
   * Define an input parameter
   */
  input(name: string, typeHint?: string): string {
    const params: IOCNodeParams = { intent: 'input', name, typeHint };

    const node: IOCNode = {
      id: this.generateId('input'),
      type: IOCIntentType.INPUT,
      inputs: [],
      params,
      capability: {
        maxComplexity: ComplexityClass.CONSTANT,
        terminationGuarantee: 'structural',
        sideEffects: 'pure',
        parallelizable: true,
        memoryBound: 'O(1)',
      },
    };

    return this.addNode(node);
  }

  /**
   * Create a constant value
   */
  constant(value: SafeValue): string {
    const params: IOCNodeParams = { intent: 'constant', value };

    const node: IOCNode = {
      id: this.generateId('const'),
      type: IOCIntentType.CONSTANT,
      inputs: [],
      params,
      capability: {
        maxComplexity: ComplexityClass.CONSTANT,
        terminationGuarantee: 'structural',
        sideEffects: 'pure',
        parallelizable: true,
        memoryBound: 'O(1)',
      },
    };

    return this.addNode(node);
  }

  /**
   * Filter elements using a safe predicate
   */
  filter(inputNode: string, predicate: SafePredicate): string {
    const input = this.getNode(inputNode);
    if (!input) throw new Error(`Node not found: ${inputNode}`);

    const params: IOCNodeParams = { intent: 'filter', predicate };

    const node: IOCNode = {
      id: this.generateId('filter'),
      type: IOCIntentType.FILTER,
      inputs: [inputNode],
      params,
      capability: calculateNodeCapability({
        id: '',
        type: IOCIntentType.FILTER,
        inputs: [inputNode],
        params,
        capability: {} as any,
      }),
    };

    return this.addNode(node);
  }

  /**
   * Transform elements using a safe transform
   */
  map(inputNode: string, transform: SafeTransform): string {
    const input = this.getNode(inputNode);
    if (!input) throw new Error(`Node not found: ${inputNode}`);

    const params: IOCNodeParams = { intent: 'map', transform };

    const node: IOCNode = {
      id: this.generateId('map'),
      type: IOCIntentType.MAP,
      inputs: [inputNode],
      params,
      capability: calculateNodeCapability({
        id: '',
        type: IOCIntentType.MAP,
        inputs: [inputNode],
        params,
        capability: {} as any,
      }),
    };

    return this.addNode(node);
  }

  /**
   * Reduce elements to a single value
   */
  reduce(inputNode: string, operation: ReductionOp, initial?: SafeValue): string {
    const input = this.getNode(inputNode);
    if (!input) throw new Error(`Node not found: ${inputNode}`);

    const params: IOCNodeParams = { intent: 'reduce', operation, initial };

    const node: IOCNode = {
      id: this.generateId('reduce'),
      type: IOCIntentType.REDUCE,
      inputs: [inputNode],
      params,
      capability: {
        maxComplexity: ComplexityClass.LINEAR,
        terminationGuarantee: 'structural',
        sideEffects: 'pure',
        parallelizable: false,
        memoryBound: 'O(1)',
      },
    };

    return this.addNode(node);
  }

  /**
   * Sort elements
   */
  sort(inputNode: string, keyTransform?: SafeTransform, descending = false): string {
    const input = this.getNode(inputNode);
    if (!input) throw new Error(`Node not found: ${inputNode}`);

    const params: IOCNodeParams = { intent: 'sort', keyTransform, descending };

    const node: IOCNode = {
      id: this.generateId('sort'),
      type: IOCIntentType.SORT,
      inputs: [inputNode],
      params,
      capability: {
        maxComplexity: ComplexityClass.LINEARITHMIC,
        terminationGuarantee: 'bounded',
        sideEffects: 'pure',
        parallelizable: false,
        memoryBound: 'O(n)',
      },
    };

    return this.addNode(node);
  }

  /**
   * Remove duplicates
   */
  distinct(inputNode: string, keyTransform?: SafeTransform): string {
    const input = this.getNode(inputNode);
    if (!input) throw new Error(`Node not found: ${inputNode}`);

    const params: IOCNodeParams = { intent: 'distinct', keyTransform };

    const node: IOCNode = {
      id: this.generateId('distinct'),
      type: IOCIntentType.DISTINCT,
      inputs: [inputNode],
      params,
      capability: {
        maxComplexity: ComplexityClass.LINEAR,
        terminationGuarantee: 'structural',
        sideEffects: 'pure',
        parallelizable: true,
        memoryBound: 'O(n)',
      },
    };

    return this.addNode(node);
  }

  /**
   * Flatten nested arrays
   */
  flatten(inputNode: string, depth = 1): string {
    const input = this.getNode(inputNode);
    if (!input) throw new Error(`Node not found: ${inputNode}`);

    const params: IOCNodeParams = { intent: 'flatten', depth };

    const node: IOCNode = {
      id: this.generateId('flatten'),
      type: IOCIntentType.FLATTEN,
      inputs: [inputNode],
      params,
      capability: {
        maxComplexity: ComplexityClass.LINEAR,
        terminationGuarantee: 'structural',
        sideEffects: 'pure',
        parallelizable: true,
        memoryBound: 'O(n)',
      },
    };

    return this.addNode(node);
  }

  /**
   * Slice array
   */
  slice(inputNode: string, start?: number, end?: number): string {
    const input = this.getNode(inputNode);
    if (!input) throw new Error(`Node not found: ${inputNode}`);

    const params: IOCNodeParams = { intent: 'slice', start, end };

    const node: IOCNode = {
      id: this.generateId('slice'),
      type: IOCIntentType.SLICE,
      inputs: [inputNode],
      params,
      capability: {
        maxComplexity: ComplexityClass.LINEAR,
        terminationGuarantee: 'structural',
        sideEffects: 'pure',
        parallelizable: true,
        memoryBound: 'O(n)',
      },
    };

    return this.addNode(node);
  }

  /**
   * Mark node as output
   */
  output(nodeId: string): string {
    const node = this.getNode(nodeId);
    if (!node) throw new Error(`Node not found: ${nodeId}`);

    this.outputs.add(nodeId);
    return nodeId;
  }

  /**
   * Convert to IOC program format
   */
  toProgram(): IOCProgram {
    return {
      version: '1.0.0',
      metadata: {
        ...this.metadata,
        created: this.metadata.created || new Date().toISOString(),
        modified: new Date().toISOString(),
      },
      nodes: Array.from(this.nodes.values()),
      outputs: Array.from(this.outputs),
      options: {
        optimizationLevel: 'basic',
        targetRuntime: 'javascript',
      },
    };
  }

  /**
   * Serialize to .ioc file format
   */
  toIOC(): string {
    const program = this.toProgram();
    return serializeIOC(program);
  }

  /**
   * Validate the graph
   */
  validate(): { valid: boolean; errors: string[] } {
    const program = this.toProgram();
    return validateIOCProgram(program);
  }

  /**
   * Compile to executable function
   */
  compile(): Function {
    const program = this.toProgram();

    // Validate first
    const validation = validateIOCProgram(program);
    if (!validation.valid) {
      throw new Error(`Invalid program: ${validation.errors.join(', ')}`);
    }

    // Compile each node
    const compiled = new Map<string, Function>();
    const nodeMap = new Map(program.nodes.map((n) => [n.id, n]));

    for (const node of program.nodes) {
      switch (node.type) {
        case IOCIntentType.FILTER: {
          const params = node.params as Extract<IOCNodeParams, { intent: 'filter' }>;
          const predicateFn = compilePredicateFunction(params.predicate);

          // Verify termination
          const verification = TerminationVerifier.verify(
            predicateFn,
            node.capability.maxComplexity
          );

          if (verification.status === 'unsafe') {
            throw new Error(
              `Filter predicate in ${node.id} failed verification: ${verification.reason}`
            );
          }

          compiled.set(node.id, (input: any[]) => input.filter(predicateFn));
          break;
        }

        case IOCIntentType.MAP: {
          const params = node.params as Extract<IOCNodeParams, { intent: 'map' }>;
          const transformFn = compileTransformFunction(params.transform);

          // Verify termination
          const verification = TerminationVerifier.verify(
            transformFn,
            node.capability.maxComplexity
          );

          if (verification.status === 'unsafe') {
            throw new Error(
              `Map transform in ${node.id} failed verification: ${verification.reason}`
            );
          }

          compiled.set(node.id, (input: any[]) => input.map(transformFn));
          break;
        }

        case IOCIntentType.REDUCE: {
          const params = node.params as Extract<IOCNodeParams, { intent: 'reduce' }>;
          const reduceFn = compileReductionFunction(params.operation);
          compiled.set(node.id, reduceFn);
          break;
        }

        case IOCIntentType.SORT: {
          const params = node.params as Extract<IOCNodeParams, { intent: 'sort' }>;
          if (params.keyTransform) {
            const keyFn = compileTransformFunction(params.keyTransform);
            compiled.set(node.id, (input: any[]) => {
              const sorted = [...input].sort((a, b) => {
                const ka = keyFn(a);
                const kb = keyFn(b);
                return ka < kb ? -1 : ka > kb ? 1 : 0;
              });
              return params.descending ? sorted.reverse() : sorted;
            });
          } else {
            compiled.set(node.id, (input: any[]) => {
              const sorted = [...input].sort();
              return params.descending ? sorted.reverse() : sorted;
            });
          }
          break;
        }

        case IOCIntentType.DISTINCT: {
          const params = node.params as Extract<IOCNodeParams, { intent: 'distinct' }>;
          if (params.keyTransform) {
            const keyFn = compileTransformFunction(params.keyTransform);
            compiled.set(node.id, (input: any[]) => {
              const seen = new Set();
              const result = [];
              for (const item of input) {
                const key = keyFn(item);
                if (!seen.has(key)) {
                  seen.add(key);
                  result.push(item);
                }
              }
              return result;
            });
          } else {
            compiled.set(node.id, (input: any[]) => [...new Set(input)]);
          }
          break;
        }

        case IOCIntentType.FLATTEN: {
          const params = node.params as Extract<IOCNodeParams, { intent: 'flatten' }>;
          const depth = params.depth ?? 1;
          compiled.set(node.id, (input: any[]) => input.flat(depth));
          break;
        }

        case IOCIntentType.SLICE: {
          const params = node.params as Extract<IOCNodeParams, { intent: 'slice' }>;
          compiled.set(node.id, (input: any[]) => input.slice(params.start, params.end));
          break;
        }

        default:
          // INPUT and CONSTANT are handled in the wrapper
          break;
      }
    }

    // Build execution function
    const inputNodes = program.nodes.filter((n) => n.type === IOCIntentType.INPUT);

    return (...args: any[]) => {
      const results = new Map<string, any>();

      // Set input values
      for (let i = 0; i < inputNodes.length; i++) {
        results.set(inputNodes[i]!.id, args[i]);
      }

      // Set constant values
      for (const node of program.nodes) {
        if (node.type === IOCIntentType.CONSTANT) {
          const params = node.params as Extract<IOCNodeParams, { intent: 'constant' }>;
          results.set(node.id, params.value);
        }
      }

      // Execute in topological order
      const order = this.getExecutionOrder();

      for (const nodeId of order) {
        const node = nodeMap.get(nodeId);
        if (!node) continue;

        if (node.type === IOCIntentType.INPUT || node.type === IOCIntentType.CONSTANT) {
          continue; // Already set
        }

        const fn = compiled.get(nodeId);
        if (!fn) {
          throw new Error(`No compiled function for node: ${nodeId}`);
        }

        // Get input values
        const inputValues = node.inputs.map((inputId) => {
          const value = results.get(inputId);
          if (value === undefined) {
            throw new Error(`Missing input for node ${nodeId}: ${inputId}`);
          }
          return value;
        });

        // Execute (budget enforcement is baked into compiled functions)
        try {
          const result = fn(...inputValues);
          results.set(nodeId, result);
        } catch (error: any) {
          throw new Error(`Execution failed at node ${nodeId} (${node.type}): ${error.message}`);
        }
      }

      // Return outputs
      if (program.outputs.length === 1) {
        return results.get(program.outputs[0]!);
      } else {
        return program.outputs.map((id) => results.get(id));
      }
    };
  }

  /**
   * Get topological execution order
   */
  private getExecutionOrder(): string[] {
    const visited = new Set<string>();
    const order: string[] = [];

    const visit = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const node = this.getNode(nodeId);
      if (!node) return;

      for (const inputId of node.inputs) {
        visit(inputId);
      }

      order.push(nodeId);
    };

    for (const outputId of this.outputs) {
      visit(outputId);
    }

    return order;
  }
}
