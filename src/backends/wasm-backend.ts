/**
 * WebAssembly Compilation Backend
 *
 * Compiles IOC programs to WebAssembly for portable, sandboxed execution.
 * Ideal for: browsers, edge computing, secure plugin systems.
 */

import type { IOCProgram } from '../dsl/ioc-format';
import type { CompilationBackend, CompilationOptions, CompilationResult } from './types';
import { BackendType } from './types';
import type { SafePredicate, SafeTransform, ReductionOp, ComparisonOp } from '../dsl/safe-types';
import { getExecutionOrder } from '../dsl/ioc-format';

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

/**
 * Helper to serialize safe values for embedding in WAT
 */
function serializeValue(value: any): string {
  if (typeof value === 'number') {
    return value.toString();
  } else if (typeof value === 'boolean') {
    return value ? '1' : '0';
  } else if (value === null) {
    return '0';
  } else if (typeof value === 'string') {
    // Strings need special handling - return a memory offset pointer
    // For now, we'll use a simple encoding
    return '0'; // placeholder
  } else {
    return '0'; // Complex types handled in memory
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

      // Create import object with helper functions
      const imports = this.createImports();

      // Instantiate WebAssembly module
      const WebAssembly = (globalThis as any).WebAssembly;
      const wasmModule = await WebAssembly.instantiate(wasmBinary, imports);
      const { instance } = wasmModule;

      // Store memory reference for data marshaling
      const memory = imports['js'].memory;

      // Create JavaScript wrapper that calls WASM
      const execute = (input: any) => {
        return this.executeWasm(instance, memory, input);
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
   */
  private generateWAT(program: IOCProgram, _options: Partial<CompilationOptions>): string {
    const gen = new WATGenerator();

    // Module header
    gen.emit('(module', 0);
    gen.emit('', 0);

    // Import memory from JavaScript (for data marshaling)
    gen.emit('(memory (import "js" "memory") 1)', 1);
    gen.emit('', 0);

    // Import helper functions from JavaScript for complex operations
    gen.emit(';; Import helper functions for complex operations', 1);
    gen.emit('(import "js" "log" (func $log (param f64)))', 1);
    gen.emit('(import "js" "typeof_val" (func $typeof_val (param i32) (result i32)))', 1);
    gen.emit('(import "js" "get_property" (func $get_property (param i32 i32) (result i32)))', 1);
    gen.emit('(import "js" "string_op" (func $string_op (param i32 i32 i32) (result i32)))', 1);
    gen.emit('(import "js" "array_length" (func $array_length (param i32) (result i32)))', 1);
    gen.emit('(import "js" "array_get" (func $array_get (param i32 i32) (result i32)))', 1);
    gen.emit('(import "js" "array_set" (func $array_set (param i32 i32 i32)))', 1);
    gen.emit('(import "js" "array_push" (func $array_push (param i32 i32)))', 1);
    gen.emit('(import "js" "create_array" (func $create_array (result i32)))', 1);
    gen.emit('(import "js" "store_value" (func $store_value (param f64) (result i32)))', 1);
    gen.emit('(import "js" "load_value" (func $load_value (param i32) (result f64)))', 1);
    gen.emit('', 0);

    // Generate helper functions for predicates, transforms, and reductions
    const helperFuncs = this.generateHelperFunctions(gen, program);

    // Generate main execution function
    this.generateExecuteFunction(gen, program, helperFuncs);

    gen.emit(')', 0);

    return gen.toString();
  }

  /**
   * Generate helper functions for predicates, transforms, and reductions
   */
  private generateHelperFunctions(
    gen: WATGenerator,
    program: IOCProgram
  ): Map<string, { funcName: string; type: 'predicate' | 'transform' | 'reduction' }> {
    const helperFuncs = new Map<
      string,
      { funcName: string; type: 'predicate' | 'transform' | 'reduction' }
    >();

    gen.emit(';; Helper functions for IOC operations', 1);
    gen.emit('', 0);

    // Generate functions for each node's operation
    for (const node of program.nodes) {
      if (node.type === 'filter') {
        const params = node.params as any;
        const funcName = gen.allocFunction();
        gen.emit(`;; Predicate for node ${node.id}`, 1);
        gen.emit(`(func ${funcName} (param $value i32) (result i32)`, 1);
        const predicateCode = this.compilePredicateToWAT(params.predicate, '$value', gen, 2);
        gen.emit(predicateCode, 0);
        gen.emit(')', 1);
        gen.emit('', 0);
        helperFuncs.set(node.id, { funcName, type: 'predicate' });
      } else if (node.type === 'map') {
        const params = node.params as any;
        const funcName = gen.allocFunction();
        gen.emit(`;; Transform for node ${node.id}`, 1);
        gen.emit(`(func ${funcName} (param $value i32) (result i32)`, 1);
        const transformCode = this.compileTransformToWAT(params.transform, '$value', gen, 2);
        gen.emit(transformCode, 0);
        gen.emit(')', 1);
        gen.emit('', 0);
        helperFuncs.set(node.id, { funcName, type: 'transform' });
      } else if (node.type === 'reduce') {
        const params = node.params as any;
        const funcName = gen.allocFunction();
        gen.emit(`;; Reduction for node ${node.id}`, 1);
        gen.emit(`(func ${funcName} (param $arr i32) (result i32)`, 1);
        const reductionCode = this.compileReductionToWAT(params.operation, '$arr', gen, 2);
        gen.emit(reductionCode, 0);
        gen.emit(')', 1);
        gen.emit('', 0);
        helperFuncs.set(node.id, { funcName, type: 'reduction' });
      }
    }

    return helperFuncs;
  }

  /**
   * Compile a SafePredicate to WAT code
   * Returns code that evaluates to i32 (1 for true, 0 for false)
   */
  private compilePredicateToWAT(
    predicate: SafePredicate,
    valueVar: string,
    gen: WATGenerator,
    indent: number
  ): string {
    const lines: string[] = [];
    const emit = (line: string) => lines.push('  '.repeat(indent) + line);

    switch (predicate.type) {
      case 'always':
        emit(`(i32.const ${predicate.value ? '1' : '0'})`);
        break;

      case 'compare': {
        // Load value
        emit(`local.get ${valueVar}`);
        emit(`call $load_value`);
        // Load comparison value
        emit(`(f64.const ${serializeValue(predicate.value)})`);
        // Compare
        emit(this.getComparisonOp(predicate.op));
        break;
      }

      case 'compare_property': {
        // Get property value
        emit(`local.get ${valueVar}`);
        emit(`(i32.const 0) ;; property name ptr - TODO`);
        emit(`call $get_property`);
        emit(`call $load_value`);
        // Load comparison value
        emit(`(f64.const ${serializeValue(predicate.value)})`);
        // Compare
        emit(this.getComparisonOp(predicate.op));
        break;
      }

      case 'type_check': {
        emit(`local.get ${valueVar}`);
        emit(`call $typeof_val`);
        const typeCode = this.getTypeCode(predicate.expectedType);
        emit(`(i32.const ${typeCode})`);
        emit(`i32.eq`);
        break;
      }

      case 'and': {
        // Evaluate all predicates and AND them
        emit(`(i32.const 1)`);
        for (const p of predicate.predicates) {
          const subCode = this.compilePredicateToWAT(p, valueVar, gen, 0);
          emit(subCode);
          emit(`i32.and`);
        }
        break;
      }

      case 'or': {
        // Evaluate all predicates and OR them
        emit(`(i32.const 0)`);
        for (const p of predicate.predicates) {
          const subCode = this.compilePredicateToWAT(p, valueVar, gen, 0);
          emit(subCode);
          emit(`i32.or`);
        }
        break;
      }

      case 'not': {
        const subCode = this.compilePredicateToWAT(predicate.predicate, valueVar, gen, 0);
        emit(subCode);
        emit(`i32.eqz ;; logical NOT`);
        break;
      }

      default:
        emit(`(i32.const 1) ;; unknown predicate type`);
    }

    return lines.join('\n');
  }

  /**
   * Compile a SafeTransform to WAT code
   * Returns code that produces an i32 (memory pointer to result)
   */
  private compileTransformToWAT(
    transform: SafeTransform,
    valueVar: string,
    gen: WATGenerator,
    indent: number
  ): string {
    const lines: string[] = [];
    const emit = (line: string) => lines.push('  '.repeat(indent) + line);

    switch (transform.type) {
      case 'identity':
        emit(`local.get ${valueVar}`);
        break;

      case 'constant':
        emit(`(f64.const ${serializeValue(transform.value)})`);
        emit(`call $store_value`);
        break;

      case 'property': {
        emit(`local.get ${valueVar}`);
        emit(`(i32.const 0) ;; property path ptr - TODO`);
        emit(`call $get_property`);
        break;
      }

      case 'arithmetic': {
        emit(`local.get ${valueVar}`);
        emit(`call $load_value`);
        if (transform.op === 'negate') {
          emit(`f64.neg`);
        } else if (transform.operand !== undefined) {
          emit(`(f64.const ${transform.operand})`);
          switch (transform.op) {
            case 'add':
              emit(`f64.add`);
              break;
            case 'subtract':
              emit(`f64.sub`);
              break;
            case 'multiply':
              emit(`f64.mul`);
              break;
            case 'divide':
              emit(`f64.div`);
              break;
            case 'modulo':
              emit(`;; modulo not directly supported in f64`);
              emit(`f64.sub ;; placeholder`);
              break;
            default:
              emit(`;; unknown arithmetic op`);
          }
        }
        emit(`call $store_value`);
        break;
      }

      case 'string': {
        emit(`local.get ${valueVar}`);
        emit(`(i32.const ${this.getStringOpCode(transform.op)})`);
        emit(`(i32.const 0) ;; args ptr - TODO`);
        emit(`call $string_op`);
        break;
      }

      case 'array': {
        if (transform.op === 'length') {
          emit(`local.get ${valueVar}`);
          emit(`call $array_length`);
          emit(`f64.convert_i32_s`);
          emit(`call $store_value`);
        } else {
          emit(`local.get ${valueVar} ;; TODO: implement array op ${transform.op}`);
        }
        break;
      }

      case 'conditional': {
        const predCode = this.compilePredicateToWAT(transform.condition, valueVar, gen, indent);
        const trueCode = this.compileTransformToWAT(transform.ifTrue, valueVar, gen, indent + 1);
        const falseCode = this.compileTransformToWAT(transform.ifFalse, valueVar, gen, indent + 1);
        emit(`(if (result i32)`);
        emit(predCode);
        emit(`(then`);
        emit(trueCode);
        emit(`)`);
        emit(`(else`);
        emit(falseCode);
        emit(`)`);
        emit(`)`);
        break;
      }

      case 'compose': {
        // Chain transforms: apply each in sequence
        emit(`local.get ${valueVar}`);
        for (const t of transform.transforms) {
          const local = gen.allocLocal();
          emit(`local.set ${local}`);
          const code = this.compileTransformToWAT(t, local, gen, indent);
          emit(code);
        }
        break;
      }

      default:
        emit(`local.get ${valueVar} ;; unknown transform type`);
    }

    return lines.join('\n');
  }

  /**
   * Compile a ReductionOp to WAT code
   */
  private compileReductionToWAT(
    reduction: ReductionOp,
    arrayVar: string,
    _gen: WATGenerator,
    indent: number
  ): string {
    const lines: string[] = [];
    const emit = (line: string) => lines.push('  '.repeat(indent) + line);

    switch (reduction.type) {
      case 'sum': {
        emit(`(local $sum f64)`);
        emit(`(local $i i32)`);
        emit(`(local $len i32)`);
        emit(`local.get ${arrayVar}`);
        emit(`call $array_length`);
        emit(`local.set $len`);
        emit(`(f64.const 0)`);
        emit(`local.set $sum`);
        emit(`(loop $loop`);
        emit(`  local.get $i`);
        emit(`  local.get $len`);
        emit(`  i32.lt_s`);
        emit(`  (if (then`);
        emit(`    local.get $sum`);
        emit(`    local.get ${arrayVar}`);
        emit(`    local.get $i`);
        emit(`    call $array_get`);
        emit(`    call $load_value`);
        emit(`    f64.add`);
        emit(`    local.set $sum`);
        emit(`    local.get $i`);
        emit(`    (i32.const 1)`);
        emit(`    i32.add`);
        emit(`    local.set $i`);
        emit(`    br $loop`);
        emit(`  ))`);
        emit(`)`);
        emit(`local.get $sum`);
        emit(`call $store_value`);
        break;
      }

      case 'count': {
        emit(`local.get ${arrayVar}`);
        emit(`call $array_length`);
        emit(`f64.convert_i32_s`);
        emit(`call $store_value`);
        break;
      }

      case 'first': {
        emit(`local.get ${arrayVar}`);
        emit(`(i32.const 0)`);
        emit(`call $array_get`);
        break;
      }

      case 'last': {
        emit(`local.get ${arrayVar}`);
        emit(`local.get ${arrayVar}`);
        emit(`call $array_length`);
        emit(`(i32.const 1)`);
        emit(`i32.sub`);
        emit(`call $array_get`);
        break;
      }

      default:
        emit(`local.get ${arrayVar} ;; TODO: implement reduction ${reduction.type}`);
    }

    return lines.join('\n');
  }

  /**
   * Generate the main execute function that processes the IOC program
   */
  private generateExecuteFunction(
    gen: WATGenerator,
    program: IOCProgram,
    helperFuncs: Map<string, { funcName: string; type: string }>
  ): void {
    gen.emit('(func (export "execute") (param $input i32) (result i32)', 1);
    gen.emit(';; IOC program execution', 2);

    // Allocate locals for each node
    const nodeVars = new Map<string, string>();
    for (const node of program.nodes) {
      const varName = `$node_${node.id.replace(/[^a-zA-Z0-9]/g, '_')}`;
      gen.emit(`(local ${varName} i32)`, 2);
      nodeVars.set(node.id, varName);
    }
    gen.emit('', 2);

    // Generate code for each node in execution order
    const executionOrder = getExecutionOrder(program);
    for (const nodeId of executionOrder) {
      const node = program.nodes.find((n) => n.id === nodeId);
      if (!node) continue;

      const varName = nodeVars.get(nodeId)!;

      switch (node.type) {
        case 'input':
          gen.emit(`;; INPUT: ${nodeId}`, 2);
          gen.emit(`local.get $input`, 2);
          gen.emit(`local.set ${varName}`, 2);
          break;

        case 'constant': {
          gen.emit(`;; CONSTANT: ${nodeId}`, 2);
          const params = node.params as any;
          gen.emit(`(f64.const ${serializeValue(params.value)})`, 2);
          gen.emit(`call $store_value`, 2);
          gen.emit(`local.set ${varName}`, 2);
          break;
        }

        case 'filter': {
          gen.emit(`;; FILTER: ${nodeId}`, 2);
          const inputVar = nodeVars.get(node.inputs[0] || '') || '$input';
          const helper = helperFuncs.get(nodeId);
          gen.emit(`;; TODO: Implement filter loop using ${helper?.funcName}`, 2);
          gen.emit(`local.get ${inputVar}`, 2);
          gen.emit(`local.set ${varName}`, 2);
          break;
        }

        case 'map': {
          gen.emit(`;; MAP: ${nodeId}`, 2);
          const inputVar = nodeVars.get(node.inputs[0] || '') || '$input';
          const helper = helperFuncs.get(nodeId);
          gen.emit(`;; TODO: Implement map loop using ${helper?.funcName}`, 2);
          gen.emit(`local.get ${inputVar}`, 2);
          gen.emit(`local.set ${varName}`, 2);
          break;
        }

        case 'reduce': {
          gen.emit(`;; REDUCE: ${nodeId}`, 2);
          const inputVar = nodeVars.get(node.inputs[0] || '') || '$input';
          const helper = helperFuncs.get(nodeId);
          if (helper) {
            gen.emit(`local.get ${inputVar}`, 2);
            gen.emit(`call ${helper.funcName}`, 2);
            gen.emit(`local.set ${varName}`, 2);
          }
          break;
        }

        default:
          gen.emit(`;; TODO: Implement ${node.type}`, 2);
          gen.emit(`local.get ${nodeVars.get(node.inputs[0] || '') || '$input'}`, 2);
          gen.emit(`local.set ${varName}`, 2);
      }
      gen.emit('', 2);
    }

    // Return the output node
    if (program.outputs.length > 0) {
      const outputNodeId = program.outputs[0];
      if (outputNodeId) {
        const outputVar = nodeVars.get(outputNodeId);
        if (outputVar) {
          gen.emit(`local.get ${outputVar}`, 2);
        } else {
          gen.emit(`local.get $input`, 2);
        }
      } else {
        gen.emit(`local.get $input`, 2);
      }
    } else {
      gen.emit(`local.get $input`, 2);
    }

    gen.emit(')', 1);
  }

  /**
   * Get WAT comparison operation
   */
  private getComparisonOp(op: ComparisonOp): string {
    switch (op) {
      case 'eq':
        return 'f64.eq';
      case 'ne':
        return 'f64.ne';
      case 'gt':
        return 'f64.gt';
      case 'gte':
        return 'f64.ge';
      case 'lt':
        return 'f64.lt';
      case 'lte':
        return 'f64.le';
      default:
        return 'f64.eq ;; unsupported comparison';
    }
  }

  /**
   * Get type code for type checking
   */
  private getTypeCode(type: string): number {
    const codes: Record<string, number> = {
      number: 1,
      string: 2,
      boolean: 3,
      array: 4,
      object: 5,
      null: 6,
    };
    return codes[type] || 0;
  }

  /**
   * Get string operation code
   */
  private getStringOpCode(op: string): number {
    const codes: Record<string, number> = {
      uppercase: 1,
      lowercase: 2,
      trim: 3,
      concat: 4,
      substring: 5,
      split: 6,
      replace: 7,
    };
    return codes[op] || 0;
  }

  /**
   * Compile WAT (text) to WASM (binary)
   *
   * Uses the wabt library to compile WebAssembly Text format to binary.
   */
  private async compileWAT(wat: string): Promise<Uint8Array> {
    try {
      // Try to import wabt (Node.js)
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
   * Create import object for WebAssembly instance with JavaScript helper functions
   */
  private createImports(): Record<string, any> {
    const WebAssembly = (globalThis as any).WebAssembly;
    const memory = new WebAssembly.Memory({ initial: 10, maximum: 100 });

    // Value storage: Map memory pointers to JavaScript values
    const valueStore = new Map<number, any>();
    let nextPtr = 1000; // Start pointers at 1000 to avoid low values

    const storeValue = (value: any): number => {
      const ptr = nextPtr++;
      valueStore.set(ptr, value);
      return ptr;
    };

    const loadValue = (ptr: number): any => {
      return valueStore.get(ptr);
    };

    return {
      js: {
        memory,
        log: (value: number) => console.log('WASM:', value),

        // Type checking
        typeof_val: (ptr: number): number => {
          const value = loadValue(ptr);
          if (value === null) return 6;
          if (Array.isArray(value)) return 4;
          const t = typeof value;
          if (t === 'number') return 1;
          if (t === 'string') return 2;
          if (t === 'boolean') return 3;
          if (t === 'object') return 5;
          return 0;
        },

        // Property access
        get_property: (objPtr: number, propPtr: number): number => {
          const obj = loadValue(objPtr);
          const prop = loadValue(propPtr);
          if (obj && typeof obj === 'object' && typeof prop === 'string') {
            return storeValue(obj[prop]);
          }
          return 0;
        },

        // String operations
        string_op: (strPtr: number, opCode: number, _argsPtr: number): number => {
          const str = loadValue(strPtr);
          if (typeof str !== 'string') return strPtr;

          switch (opCode) {
            case 1:
              return storeValue(str.toUpperCase());
            case 2:
              return storeValue(str.toLowerCase());
            case 3:
              return storeValue(str.trim());
            default:
              return strPtr;
          }
        },

        // Array operations
        array_length: (arrPtr: number): number => {
          const arr = loadValue(arrPtr);
          return Array.isArray(arr) ? arr.length : 0;
        },

        array_get: (arrPtr: number, index: number): number => {
          const arr = loadValue(arrPtr);
          if (Array.isArray(arr) && index >= 0 && index < arr.length) {
            return storeValue(arr[index]);
          }
          return 0;
        },

        array_set: (arrPtr: number, index: number, valuePtr: number): void => {
          const arr = loadValue(arrPtr);
          const value = loadValue(valuePtr);
          if (Array.isArray(arr) && index >= 0) {
            arr[index] = value;
          }
        },

        array_push: (arrPtr: number, valuePtr: number): void => {
          const arr = loadValue(arrPtr);
          const value = loadValue(valuePtr);
          if (Array.isArray(arr)) {
            arr.push(value);
          }
        },

        create_array: (): number => {
          return storeValue([]);
        },

        // Value storage
        store_value: (value: number): number => {
          return storeValue(value);
        },

        load_value: (ptr: number): number => {
          const value = loadValue(ptr);
          return typeof value === 'number' ? value : 0;
        },
      },
    };
  }

  /**
   * Execute WASM instance with input data
   */
  private executeWasm(instance: any, _memory: any, input: any): any {
    const exports = instance.exports as any;

    // Get the import object to access storeValue
    const valueStore = new Map<number, any>();
    let nextPtr = 1000;

    const storeValue = (value: any): number => {
      const ptr = nextPtr++;
      valueStore.set(ptr, value);
      return ptr;
    };

    const loadValue = (ptr: number): any => {
      return valueStore.get(ptr);
    };

    // Marshal input to WASM memory
    const inputPtr = storeValue(input);

    // Execute WASM
    const resultPtr = exports.execute(inputPtr);

    // Marshal result back to JavaScript
    return loadValue(resultPtr);
  }

  estimateCompilationTime(program: IOCProgram): number {
    // WASM compilation is moderate: ~5ms per node
    return program.nodes.length * 5;
  }

  estimatePerformanceScore(): number {
    // WebAssembly gets a score of 8/10
    return 8;
  }
}
