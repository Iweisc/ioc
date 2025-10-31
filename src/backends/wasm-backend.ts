/**
 * WebAssembly Compilation Backend
 *
 * Compiles IOC programs to WebAssembly for portable, sandboxed execution.
 * Ideal for: browsers, edge computing, secure plugin systems.
 */

import type { IOCProgram } from '../dsl/ioc-format';
import type { CompilationBackend, CompilationOptions, CompilationResult } from './types';
import { BackendType } from './types';

/**
 * WebAssembly Text Format (WAT) code generator
 */
class WATGenerator {
  private code: string[] = [];
  private localVarCount = 0;
  private functionCount = 0;

  emit(line: string, indent: number = 0): void {
    this.code.push('  '.repeat(indent) + line);
  }

  allocLocal(): string {
    return `$local${this.localVarCount++}`;
  }

  allocFunction(): string {
    return `$func${this.functionCount++}`;
  }

  toString(): string {
    return this.code.join('\n');
  }
}

export class WebAssemblyBackend implements CompilationBackend {
  readonly type: BackendType = BackendType.WASM;
  readonly name = 'WebAssembly';

  async isAvailable(): Promise<boolean> {
    // Check if WebAssembly is supported
    return typeof (globalThis as any).WebAssembly !== 'undefined';
  }

  async compile(
    program: IOCProgram,
    options: Partial<CompilationOptions> = {}
  ): Promise<CompilationResult> {
    const startTime = performance.now();

    try {
      // Generate WebAssembly Text format
      const wat = this.generateWAT(program, options);

      // Compile WAT to binary WASM
      const wasmBinary = await this.compileWAT(wat);

      // Instantiate WebAssembly module
      const WebAssembly = (globalThis as any).WebAssembly;
      const wasmModule = await WebAssembly.instantiate(wasmBinary, this.createImports());
      const { instance } = wasmModule;

      // Create JavaScript wrapper that calls WASM
      const execute = (input: any) => {
        return this.executeWasm(instance, input);
      };

      const compilationTime = performance.now() - startTime;

      return {
        backend: this.type,
        execute,
        codeSize: wasmBinary.byteLength,
        compilationTime,
        metadata: {
          wasmBinary,
          optimizations: options.optimizationLevel ? [`O${options.optimizationLevel}`] : ['O0'],
        },
      };
    } catch (error: any) {
      throw new Error(`WebAssembly compilation failed: ${error.message}`);
    }
  }

  /**
   * Generate WebAssembly Text format from IOC program
   *
   * Generates WAT code that implements the IOC program's dataflow.
   * Uses linear memory for data storage and helper functions for complex operations.
   */
  private generateWAT(program: IOCProgram, _options: Partial<CompilationOptions>): string {
    const gen = new WATGenerator();

    // Module header
    gen.emit('(module', 0);
    gen.emit('', 0);

    // Import memory from JavaScript (for data marshaling)
    gen.emit('(memory (import "js" "memory") 1)', 1);
    gen.emit('', 0);

    // Import helper functions from JavaScript
    gen.emit(';; Import helper functions for complex operations', 1);
    gen.emit('(import "js" "log" (func $log (param f64)))', 1);
    gen.emit(
      '(import "js" "array_filter" (func $array_filter (param i32 i32 i32) (result i32)))',
      1
    );
    gen.emit('(import "js" "array_map" (func $array_map (param i32 i32 i32) (result i32)))', 1);
    gen.emit(
      '(import "js" "array_reduce" (func $array_reduce (param i32 i32 i32) (result f64)))',
      1
    );
    gen.emit('(import "js" "array_sort" (func $array_sort (param i32 i32) (result i32)))', 1);
    gen.emit('(import "js" "get_input" (func $get_input (param i32) (result i32)))', 1);
    gen.emit('', 0);

    // Generate helper functions for predicates and transforms
    this.generateHelperFunctions(gen, program);

    // Generate main execution function
    gen.emit('(func (export "execute") (param $input i32) (result i32)', 1);
    gen.emit(';; IOC program execution', 2);
    gen.emit('(local $result i32)', 2);
    gen.emit('', 2);

    // For simple programs, generate inline execution
    // For complex programs, this would need a more sophisticated approach
    gen.emit(';; TODO: Implement full IOC node compilation', 2);
    gen.emit(';; This is a minimal placeholder implementation', 2);
    gen.emit('local.get $input', 2);
    gen.emit('local.set $result', 2);
    gen.emit('', 2);

    gen.emit('local.get $result', 2);
    gen.emit(')', 1);
    gen.emit(')', 0);

    return gen.toString();
  }

  /**
   * Generate helper functions for predicates, transforms, and reductions
   */
  private generateHelperFunctions(gen: WATGenerator, program: IOCProgram): void {
    gen.emit(';; Helper functions for IOC operations', 1);
    gen.emit('', 0);

    // Generate predicate functions
    for (const node of program.nodes) {
      if (node.type === 'filter') {
        const funcName = gen.allocFunction();
        gen.emit(`(func ${funcName} (param $value f64) (result i32)`, 1);
        gen.emit(';; Predicate function', 2);
        gen.emit('(i32.const 1)', 2); // Placeholder: always return true
        gen.emit(')', 1);
        gen.emit('', 0);
      } else if (node.type === 'map') {
        const funcName = gen.allocFunction();
        gen.emit(`(func ${funcName} (param $value f64) (result f64)`, 1);
        gen.emit(';; Transform function', 2);
        gen.emit('local.get $value', 2); // Placeholder: identity
        gen.emit(')', 1);
        gen.emit('', 0);
      }
    }
  }

  /**
   * Compile WAT (text) to WASM (binary)
   *
   * Uses the wabt library to compile WebAssembly Text format to binary.
   * In Node.js, dynamically imports wabt. In browsers, requires wabt to be available.
   *
   * @throws {Error} If wabt is not available or compilation fails
   */
  private async compileWAT(wat: string): Promise<Uint8Array> {
    try {
      // Try to import wabt (Node.js)
      // Install with: npm install wabt
      const wabt = await import('wabt').catch(() => null);

      if (wabt) {
        // Node.js environment with wabt installed
        const wabtInstance = await wabt.default();
        const wasmModule = wabtInstance.parseWat('program.wat', wat);
        const { buffer } = wasmModule.toBinary({});
        return new Uint8Array(buffer);
      }

      // Check if wabt is available globally (browser with preloaded wabt)
      if (typeof (globalThis as any).wabt !== 'undefined') {
        const wabtInstance = await (globalThis as any).wabt();
        const wasmModule = wabtInstance.parseWat('program.wat', wat);
        const { buffer } = wasmModule.toBinary({});
        return new Uint8Array(buffer);
      }

      // wabt not available
      throw new Error(
        'wabt library is not available. ' +
          'Install wabt for WAT compilation: npm install wabt. ' +
          'In browsers, load wabt library before using WebAssembly backend.'
      );
    } catch (error: any) {
      if (error.message.includes('wabt')) {
        // Re-throw wabt availability errors
        throw error;
      }
      // WAT compilation error
      throw new Error(`WAT compilation failed: ${error.message}`);
    }
  }

  /**
   * Create import object for WebAssembly instance
   */
  private createImports(): Record<string, any> {
    const WebAssembly = (globalThis as any).WebAssembly;
    return {
      js: {
        memory: new WebAssembly.Memory({ initial: 1 }),
        log: (value: number) => console.log('WASM:', value),
      },
    };
  }

  /**
   * Execute WASM instance with input data
   */
  private executeWasm(instance: any, _input: any): any {
    const exports = instance.exports as any;

    // For now, just call the execute function
    // TODO: Properly marshal JavaScript data to/from WASM memory
    return exports.execute(0);
  }

  estimateCompilationTime(program: IOCProgram): number {
    // WASM compilation is moderate: ~5ms per node
    // (includes WAT generation + binary compilation)
    return program.nodes.length * 5;
  }

  estimatePerformanceScore(): number {
    // WebAssembly gets a score of 8/10
    // Better than JavaScript, close to native
    return 8;
  }
}
