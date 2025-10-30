/**
 * JavaScript Compilation Backend
 *
 * Compiles IOC programs to JavaScript functions.
 * This is the default backend - fast to compile, runs anywhere JavaScript runs.
 */

import type { IOCProgram } from '../dsl/ioc-format';
import type {
  CompilationBackend,
  CompilationOptions,
  CompilationResult,
  BackendType,
} from './types';
import { SafeGraph } from '../dsl/safe-graph';

export class JavaScriptBackend implements CompilationBackend {
  readonly type: BackendType = 'javascript' as BackendType;
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
      // Load program into SafeGraph
      const graph = SafeGraph.fromProgram(program);

      // Compile to JavaScript function
      const execute = graph.compile();

      // Get generated code for size calculation (estimate)
      const jsCode = execute.toString();
      const codeSize = new Blob([jsCode]).size;

      const compilationTime = performance.now() - startTime;

      return {
        backend: this.type,
        execute,
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
