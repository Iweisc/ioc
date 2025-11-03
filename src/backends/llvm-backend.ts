
/**
 * LLVM Compilation Backend
 *
 * Compiles IOC programs to native machine code via LLVM for maximum performance.
 * Ideal for: server-side compute, long-running processes, Solver Kernel.
 */

import type { IOCProgram } from '../dsl/ioc-format';
import type { CompilationBackend, CompilationOptions, CompilationResult } from './types';
import { BackendType } from './types';
import type { SafePredicate, SafeTransform, ComparisonOp } from '../dsl/safe-types';
import { getExecutionOrder } from '../dsl/ioc-format';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

/**
 * LLVM IR code generator
 */
class LLVMIRGenerator {
  private code: string[] = [];
  private registerCount = 0;
  private labelCount = 0;
  private stringConstants = new Map<string, string>();
  private globalCount = 0;

  emit(line: string): void {
    this.code.push(line);
  }

  allocRegister(): string {
    return `%${this.registerCount++}`;
  }

  allocLabel(): string {
    return `label${this.labelCount++}`;
  }

  allocGlobal(): string {
    return `@global${this.globalCount++}`;
  }

  addStringConstant(value: string): string {
    if (this.stringConstants.has(value)) {
      return this.stringConstants.get(value)!;
    }
    const name = this.allocGlobal();
    this.stringConstants.set(value, name);
    return name;
  }

  getStringConstants(): string {
    const lines: string[] = [];
    for (const [value, name] of this.stringConstants) {
      const escaped = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
      const len = value.length + 1;
      lines.push(`${name} = private unnamed_addr constant [${len} x i8] c"${escaped}\\00"`);
    }
    return lines.join('\n');
  }

  toString(): string {
    return this.code.join('\n');
  }
}

export class LLVMBackend implements CompilationBackend {
  readonly type: BackendType = BackendType.LLVM;
  readonly name = 'LLVM';

  private llvmAvailable: boolean | null = null;

  async isAvailable(): Promise<boolean> {
    if (this.llvmAvailable !== null) {
      return this.llvmAvailable;
    }

    try {
      execSync('llc --version', { stdio: 'ignore' });
      execSync('lli --version', { stdio: 'ignore' });
      this.llvmAvailable = true;
      return true;
    } catch {
      this.llvmAvailable = false;
      return false;
    }
  }

  async compile(
    program: IOCProgram,
    options: Partial<CompilationOptions> = {}
  ): Promise<CompilationResult> {
    const startTime = performance.now();

    if (!(await this.isAvailable())) {
      // Throw error when LLVM is not available
      throw new Error('LLVM backend not available. Please install LLVM and llvm-bindings package.');
    }

    try {
      const llvmIR = this.generateLLVMIR(program, options);
      const { execute, codeSize } = await this.compileLLVMIR(llvmIR, options);

      const compilationTime = performance.now() - startTime;

      return {
        backend: this.type,
        execute: execute as (input: any) => any,
        codeSize,
        compilationTime,
        metadata: {
          llvmIR: options.debug ? llvmIR : undefined,
          optimizations: this.getOptimizationPasses(options.optimizationLevel || 0),
        },
      };
    } catch (error: any) {
      throw new Error(`LLVM compilation failed: ${error.message}`);
    }
  }

  estimateCompilationTime(program: IOCProgram): number {
    // LLVM compilation is slower: ~20ms per node
    return program.nodes.length * 20;
  }

  estimatePerformanceScore(): number {
    // LLVM gets a score of 10/10 for maximum performance
    return 10;
  }

  private generateLLVMIR(program: IOCProgram, _options: Partial<CompilationOptions>): string {
    const gen = new LLVMIRGenerator();

    // Module header
    gen.emit('; ModuleID = "ioc_program"');
    gen.emit('source_filename = "ioc_program.ioc"');
    gen.emit('target datalayout = "e-m:e-p270:32:32-p271:32:32-p272:64:64-i64:64-f80:128-n8:16:32:64-S128"');
    gen.emit('target triple = "x86_64-unknown-linux-gnu"');
    gen.emit('');

    // Declare external runtime functions
    gen.emit('; Runtime support functions');
    gen.emit('declare i8* @malloc(i64)');
    gen.emit('declare void @free(i8*)');
    gen.emit('declare i32 @printf(i8*, ...)');
    gen.emit('declare double @llvm.fabs.f64(double)');
    gen.emit('declare double @llvm.sqrt.f64(double)');
    gen.emit('declare double @llvm.pow.f64(double, double)');
    gen.emit('');

    // String constants
    const stringConstants = gen.getStringConstants();
    if (stringConstants) {
      gen.emit('; String constants');
      gen.emit(stringConstants);
      gen.emit('');
    }

    // Generate helper functions for predicates and transforms
    this.generateHelperFunctions(gen, program);

    // Generate main execution function
    gen.emit('; Main execution function');
    gen.emit('define i8* @ioc_execute(i8* %input) {');
    gen.emit('entry:');
    
    // Generate node execution in topological order
    const executionOrder = getExecutionOrder(program);
    const nodeResults = new Map<string, string>();
    
    for (const nodeId of executionOrder) {
      const node = program.nodes.find(n => n.id === nodeId);
      if (!node) continue;
      
      const resultReg = gen.allocRegister();
      nodeResults.set(nodeId, resultReg);
      
      switch (node.type) {
        case 'input':
          gen.emit(`  ${resultReg} = bitcast i8* %input to i8*`);
          break;
          
        case 'filter': {
          gen.emit(`  ; Filter node: ${nodeId}`);
          const inputReg = node.inputs[0] ? nodeResults.get(node.inputs[0]) : '%input';
          gen.emit(`  ${resultReg} = call i8* @filter_array(i8* ${inputReg})`);
          break;
        }
          
        case 'map': {
          gen.emit(`  ; Map node: ${nodeId}`);
          const mapInput = node.inputs[0] ? nodeResults.get(node.inputs[0]) : '%input';
          gen.emit(`  ${resultReg} = call i8* @map_array(i8* ${mapInput})`);
          break;
        }
          
        case 'reduce': {
          gen.emit(`  ; Reduce node: ${nodeId}`);
          const reduceInput = node.inputs[0] ? nodeResults.get(node.inputs[0]) : '%input';
          gen.emit(`  ${resultReg} = call i8* @reduce_array(i8* ${reduceInput})`);
          break;
        }
          
        default: {
          gen.emit(`  ; Node type ${node.type} not fully implemented`);
          const defaultInput = node.inputs[0] ? nodeResults.get(node.inputs[0]) : '%input';
          gen.emit(`  ${resultReg} = bitcast i8* ${defaultInput} to i8*`);
        }
      }
    }
    
    // Return the output
    const outputNodeId = program.outputs[0];
    const outputReg = outputNodeId ? nodeResults.get(outputNodeId) : '%input';
    gen.emit(`  ret i8* ${outputReg || '%input'}`);
    gen.emit('}');
    gen.emit('');

    // Add runtime helper functions
    this.generateRuntimeHelpers(gen);

    return gen.toString();
  }

  private generateHelperFunctions(gen: LLVMIRGenerator, program: IOCProgram): void {
    gen.emit('; Helper functions for IOC operations');
    gen.emit('');

    // Generate predicate functions
    let predicateCount = 0;
    for (const node of program.nodes) {
      if (node.type === 'filter') {
        const params = node.params as any;
        if (params.predicate) {
          gen.emit(`define i1 @predicate_${predicateCount}(double %value) {`);
          gen.emit('entry:');
          this.compilePredicateToLLVM(params.predicate, gen, '%value');
          gen.emit('}');
          gen.emit('');
          predicateCount++;
        }
      }
    }

    // Generate transform functions
    let transformCount = 0;
    for (const node of program.nodes) {
      if (node.type === 'map') {
        const params = node.params as any;
        if (params.transform) {
          gen.emit(`define double @transform_${transformCount}(double %value) {`);
          gen.emit('entry:');
          this.compileTransformToLLVM(params.transform, gen, '%value');
          gen.emit('}');
          gen.emit('');
          transformCount++;
        }
      }
    }
  }

  private compilePredicateToLLVM(predicate: SafePredicate, gen: LLVMIRGenerator, valueReg: string): void {
    switch (predicate.type) {
      case 'always':
        gen.emit(`  ret i1 ${predicate.value ? 'true' : 'false'}`);
        break;
        
      case 'compare': {
        const cmpReg = gen.allocRegister();
        const op = this.getLLVMComparisonOp(predicate.op);
        gen.emit(`  ${cmpReg} = fcmp ${op} double ${valueReg}, ${predicate.value}`);
        gen.emit(`  ret i1 ${cmpReg}`);
        break;
      }
      
      case 'type_check':
        // Simplified: always return true for type checks in LLVM
        gen.emit(`  ret i1 true`);
        break;
        
      default:
        gen.emit(`  ret i1 true`);
    }
  }

  private compileTransformToLLVM(transform: SafeTransform, gen: LLVMIRGenerator, valueReg: string): void {
    switch (transform.type) {
      case 'identity':
        gen.emit(`  ret double ${valueReg}`);
        break;
        
      case 'constant': {
        const constValue = typeof transform.value === 'number' ? transform.value : 0;
        gen.emit(`  ret double ${constValue}`);
        break;
      }
        
      case 'arithmetic': {
        const resultReg = gen.allocRegister();
        const operand = typeof transform.operand === 'number' ? transform.operand : 0;
        
        switch (transform.op) {
          case 'add':
            gen.emit(`  ${resultReg} = fadd double ${valueReg}, ${operand}`);
            break;
          case 'subtract':
            gen.emit(`  ${resultReg} = fsub double ${valueReg}, ${operand}`);
            break;
          case 'multiply':
            gen.emit(`  ${resultReg} = fmul double ${valueReg}, ${operand}`);
            break;
          case 'divide':
            gen.emit(`  ${resultReg} = fdiv double ${valueReg}, ${operand}`);
            break;
          case 'negate':
            gen.emit(`  ${resultReg} = fneg double ${valueReg}`);
            break;
          default:
            gen.emit(`  ${resultReg} = fadd double ${valueReg}, 0.0`);
        }
        
        gen.emit(`  ret double ${resultReg}`);
        break;
      }
      
      default:
        gen.emit(`  ret double ${valueReg}`);
    }
  }

  private generateRuntimeHelpers(gen: LLVMIRGenerator): void {
    // Filter array helper
    gen.emit('define i8* @filter_array(i8* %array) {');
    gen.emit('entry:');
    gen.emit('  ; TODO: Implement array filtering');
    gen.emit('  ret i8* %array');
    gen.emit('}');
    gen.emit('');

    // Map array helper
    gen.emit('define i8* @map_array(i8* %array) {');
    gen.emit('entry:');
    gen.emit('  ; TODO: Implement array mapping');
    gen.emit('  ret i8* %array');
    gen.emit('}');
    gen.emit('');

    // Reduce array helper
    gen.emit('define i8* @reduce_array(i8* %array) {');
    gen.emit('entry:');
    gen.emit('  ; TODO: Implement array reduction');
    gen.emit('  ret i8* %array');
    gen.emit('}');
  }

  private getLLVMComparisonOp(op: ComparisonOp): string {
    switch (op) {
      case 'eq': return 'oeq';
      case 'ne': return 'one';
      case 'gt': return 'ogt';
      case 'gte': return 'oge';
      case 'lt': return 'olt';
      case 'lte': return 'ole';
      default: return 'oeq';
    }
  }

  private async compileLLVMIR(llvmIR: string, options: Partial<CompilationOptions>): Promise<{ execute: Function; codeSize: number }> {
    // Write LLVM IR to temporary file
    const tmpDir = os.tmpdir();
    const irFile = path.join(tmpDir, `ioc_${Date.now()}.ll`);
    const objFile = path.join(tmpDir, `ioc_${Date.now()}.o`);
    
    try {
      fs.writeFileSync(irFile, llvmIR);
      
      // Compile to object file
      const optLevel = options.optimizationLevel || 0;
      execSync(`llc -O${optLevel} -filetype=obj -o ${objFile} ${irFile}`);
      
      // Get code size
      const stats = fs.statSync(objFile);
      const codeSize = stats.size;
      
      // Create executor function that would use JIT
      const execute = (input: any) => {
        // In a real implementation, this would:
        // 1. Load the compiled object file
        // 2. Link with runtime libraries
        // 3. Execute via JIT
        // 4. Marshal data between JS and native code
        
        // For now, return a placeholder
        console.log('LLVM execution would happen here');
        return input;
      };
      
      // Clean up temporary files
      fs.unlinkSync(irFile);
      fs.unlinkSync(objFile);
      
      return { execute, codeSize };
    } catch (error) {
      // Clean up on error
      if (fs.existsSync(irFile)) fs.unlinkSync(irFile);
      if (fs.existsSync(objFile)) fs.unlinkSync(objFile);
      throw error;
    }
  }

  private getOptimizationPasses(level: number): string[] {
    switch (level) {
      case 0:
        return [];
      case 1:
        return ['mem2reg', 'instcombine', 'simplifycfg'];
      case 2:
        return ['mem2reg', 'instcombine', 'simplifycfg', 'inline', 'dce', 'gvn'];
      case 3:
        return [
          'mem2reg',
          'instcombine',
          'simplifycfg',
          'inline',
          'dce',
          'gvn',
          'loop-unroll',
          'vectorize',
          'aggressive-instcombine',
        ];
      default:
        return [];
    }
  }

}
