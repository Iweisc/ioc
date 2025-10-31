/**
 * JavaScript Compilation Backend
 *
 * Compiles IOC programs to JavaScript functions.
 * This is the default backend - fast to compile, runs anywhere JavaScript runs.
 */

import type { IOCProgram, IOCNodeParams } from '../dsl/ioc-format';
import { IOCIntentType, validateIOCProgram } from '../dsl/ioc-format';
import {
  compilePredicateFunction,
  compileTransformFunction,
  compileReductionFunction,
} from '../dsl/compiler';
import { TerminationVerifier } from '../core/verifier';
import type { CompilationBackend, CompilationOptions, CompilationResult } from './types';
import { BackendType } from './types';

export class JavaScriptBackend implements CompilationBackend {
  readonly type: BackendType = BackendType.JAVASCRIPT;
  readonly name = 'JavaScript';

  async isAvailable(): Promise<boolean> {
    // JavaScript backend is always available
    return true;
  }

  async compile(
    program: IOCProgram,
    options: Partial<CompilationOptions> = {}
  ): Promise<CompilationResult> {
    const startTime = performance.now();

    try {
      // Validate program
      const validation = validateIOCProgram(program);
      if (!validation.valid) {
        throw new Error(`Invalid program: ${validation.errors.join(', ')}`);
      }

      // Compile to JavaScript function
      const execute = this.compileProgram(program);

      // Get generated code for size calculation (estimate)
      const jsCode = execute.toString();

      // Calculate code size in a cross-platform way
      let codeSize: number;
      if (typeof Buffer !== 'undefined' && typeof Buffer.byteLength === 'function') {
        // Node.js environment
        codeSize = Buffer.byteLength(jsCode, 'utf8');
      } else if (typeof TextEncoder !== 'undefined') {
        // Modern browsers
        codeSize = new TextEncoder().encode(jsCode).length;
      } else {
        // Fallback: count UTF-16 code units (may overestimate for non-ASCII)
        codeSize = jsCode.length * 2;
      }

      const compilationTime = performance.now() - startTime;

      return {
        backend: this.type,
        execute: execute as (input: any) => any,
        codeSize,
        compilationTime,
        metadata: {
          jsCode: options.debug ? jsCode : undefined,
          optimizations: ['inline-constants', 'dead-code-elimination'],
        },
      };
    } catch (error: any) {
      throw new Error(`JavaScript compilation failed: ${error.message}`);
    }
  }

  private compileProgram(program: IOCProgram): Function {
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
    const executionOrder = this.getExecutionOrder(program);

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
      for (const nodeId of executionOrder) {
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

        // Execute
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
  private getExecutionOrder(program: IOCProgram): string[] {
    const nodeMap = new Map(program.nodes.map((n) => [n.id, n]));
    const visited = new Set<string>();
    const order: string[] = [];

    const visit = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const node = nodeMap.get(nodeId);
      if (!node) return;

      for (const inputId of node.inputs) {
        visit(inputId);
      }

      order.push(nodeId);
    };

    for (const outputId of program.outputs) {
      visit(outputId);
    }

    return order;
  }

  estimateCompilationTime(program: IOCProgram): number {
    // JavaScript compilation is very fast: ~1ms per node
    return program.nodes.length * 1;
  }

  estimatePerformanceScore(): number {
    // JavaScript gets a score of 6/10
    // Good performance, but not as fast as native LLVM
    return 6;
  }
}
