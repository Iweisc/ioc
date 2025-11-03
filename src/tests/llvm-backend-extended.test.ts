
/**
 * Extended tests for LLVM Backend - Part 2
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LLVMBackend } from '../backends/llvm-backend';
import { IOCIntentType } from '../dsl/ioc-format';
import { ComplexityClass } from '../dsl/safe-types';
import type { IOCProgram } from '../dsl/ioc-format';
import * as child_process from 'child_process';
import * as fs from 'fs';

// Mock child_process and fs modules
vi.mock('child_process');
vi.mock('fs');

describe('LLVMBackend - Extended Tests', () => {
  let backend: LLVMBackend;

  beforeEach(() => {
    backend = new LLVMBackend();
    vi.clearAllMocks();
    
    // Setup default mocks
    const mockExecSync = vi.mocked(child_process.execSync);
    const mockWriteFileSync = vi.mocked(fs.writeFileSync);
    const mockUnlinkSync = vi.mocked(fs.unlinkSync);
    const mockStatSync = vi.mocked(fs.statSync);

    mockExecSync.mockImplementation(() => Buffer.from('Success'));
    mockWriteFileSync.mockImplementation(() => {});
    mockUnlinkSync.mockImplementation(() => {});
    mockStatSync.mockReturnValue({ size: 1024 } as any);
  });

  describe('Transform compilation', () => {
    it('should compile constant transform', async () => {
      const program: IOCProgram = {
        version: '1.0.0',
        nodes: [
          {
            id: 'input',
            type: IOCIntentType.INPUT,
            inputs: [],
            params: { intent: 'input', name: 'data' },
            capability: {
              maxComplexity: ComplexityClass.CONSTANT,
              terminationGuarantee: 'structural',
              sideEffects: 'pure',
              parallelizable: true,
            },
          },
          {
            id: 'map',
            type: IOCIntentType.MAP,
            inputs: ['input'],
            params: {
              intent: 'map',
              transform: { type: 'constant', value: 42 },
            },
            capability: {
              maxComplexity: ComplexityClass.LINEAR,
              terminationGuarantee: 'structural',
              sideEffects: 'pure',
              parallelizable: true,
            },
          },
        ],
        outputs: ['map'],
        metadata: { name: 'constant-transform' },
      };

      const result = await backend.compile(program, { debug: true });
      expect(result.metadata?.llvmIR).toContain('ret double 42');
    });

    it('should compile arithmetic transforms with all operations', async () => {
      const operations = ['add', 'subtract', 'multiply', 'divide', 'negate'];
      
      for (const op of operations) {
        const program: IOCProgram = {
          version: '1.0.0',
          nodes: [
            {
              id: 'input',
              type: IOCIntentType.INPUT,
              inputs: [],
              params: { intent: 'input', name: 'data' },
              capability: {
                maxComplexity: ComplexityClass.CONSTANT,
                terminationGuarantee: 'structural',
                sideEffects: 'pure',
                parallelizable: true,
              },
            },
            {
              id: 'map',
              type: IOCIntentType.MAP,
              inputs: ['input'],
              params: {
                intent: 'map',
                transform: { type: 'arithmetic', op: op as any, operand: 5 },
              },
              capability: {
                maxComplexity: ComplexityClass.LINEAR,
                terminationGuarantee: 'structural',
                sideEffects: 'pure',
                parallelizable: true,
              },
            },
          ],
          outputs: ['map'],
          metadata: { name: `arithmetic-${op}` },
        };

        const result = await backend.compile(program, { debug: true });
        
        if (op === 'add') expect(result.metadata?.llvmIR).toContain('fadd');
        if (op === 'subtract') expect(result.metadata?.llvmIR).toContain('fsub');
        if (op === 'multiply') expect(result.metadata?.llvmIR).toContain('fmul');
        if (op === 'divide') expect(result.metadata?.llvmIR).toContain('fdiv');
        if (op === 'negate') expect(result.metadata?.llvmIR).toContain('fneg');
      }
    });

    it('should handle unsupported transform types', async () => {
      const program: IOCProgram = {
        version: '1.0.0',
        nodes: [
          {
            id: 'input',
            type: IOCIntentType.INPUT,
            inputs: [],
            params: { intent: 'input', name: 'data' },
            capability: {
              maxComplexity: ComplexityClass.CONSTANT,
              terminationGuarantee: 'structural',
              sideEffects: 'pure',
              parallelizable: true,
            },
          },
          {
            id: 'map',
            type: IOCIntentType.MAP,
            inputs: ['input'],
            params: {
              intent: 'map',
              transform: { type: 'unknown_type' as any },
            },
            capability: {
              maxComplexity: ComplexityClass.LINEAR,
              terminationGuarantee: 'structural',
              sideEffects: 'pure',
              parallelizable: true,
            },
          },
        ],
        outputs: ['map'],
        metadata: { name: 'unknown-transform' },
      };

      const result = await backend.compile(program, { debug: true });
      expect(result.metadata?.llvmIR).toContain('ret double');
    });
  });

  describe('Optimization passes', () => {
    it('should apply no optimizations at level 0', async () => {
      const program: IOCProgram = {
        version: '1.0.0',
        nodes: [
          {
            id: 'input',
            type: IOCIntentType.INPUT,
            inputs: [],
            params: { intent: 'input', name: 'data' },
            capability: {
              maxComplexity: ComplexityClass.CONSTANT,
              terminationGuarantee: 'structural',
              sideEffects: 'pure',
              parallelizable: true,
            },
          },
        ],
        outputs: ['input'],
        metadata: { name: 'opt-level-0' },
      };

      const result = await backend.compile(program, { optimizationLevel: 0 });
      expect(result.metadata?.optimizations).toEqual([]);
    });

    it('should apply basic optimizations at level 1', async () => {
      const program: IOCProgram = {
        version: '1.0.0',
        nodes: [
          {
            id: 'input',
            type: IOCIntentType.INPUT,
            inputs: [],
            params: { intent: 'input', name: 'data' },
            capability: {
              maxComplexity: ComplexityClass.CONSTANT,
              terminationGuarantee: 'structural',
              sideEffects: 'pure',
              parallelizable: true,
            },
          },
        ],
        outputs: ['input'],
        metadata: { name: 'opt-level-1' },
      };

      const result = await backend.compile(program, { optimizationLevel: 1 });
      expect(result.metadata?.optimizations).toContain('mem2reg');
      expect(result.metadata?.optimizations).toContain('instcombine');
      expect(result.metadata?.optimizations).toContain('simplifycfg');
    });

    it('should apply more optimizations at level 2', async () => {
      const program: IOCProgram = {
        version: '1.0.0',
        nodes: [
          {
            id: 'input',
            type: IOCIntentType.INPUT,
            inputs: [],
            params: { intent: 'input', name: 'data' },
            capability: {
              maxComplexity: ComplexityClass.CONSTANT,
              terminationGuarantee: 'structural',
              sideEffects: 'pure',
              parallelizable: true,
            },
          },
        ],
        outputs: ['input'],
        metadata: { name: 'opt-level-2' },
      };

      const result = await backend.compile(program, { optimizationLevel: 2 });
      expect(result.metadata?.optimizations).toContain('inline');
      expect(result.metadata?.optimizations).toContain('dce');
      expect(result.metadata?.optimizations).toContain('gvn');
    });

    it('should apply aggressive optimizations at level 3', async () => {
      const program: IOCProgram = {
        version: '1.0.0',
        nodes: [
          {
            id: 'input',
            type: IOCIntentType.INPUT,
            inputs: [],
            params: { intent: 'input', name: 'data' },
            capability: {
              maxComplexity: ComplexityClass.CONSTANT,
              terminationGuarantee: 'structural',
              sideEffects: 'pure',
              parallelizable: true,
            },
          },
        ],
        outputs: ['input'],
        metadata: { name: 'opt-level-3' },
      };

      const result = await backend.compile(program, { optimizationLevel: 3 });
      expect(result.metadata?.optimizations).toContain('loop-unroll');
      expect(result.metadata?.optimizations).toContain('vectorize');
      expect(result.metadata?.optimizations).toContain('aggressive-instcombine');
    });

    it('should handle invalid optimization levels', async () => {
      const program: IOCProgram = {
        version: '1.0.0',
        nodes: [
          {
            id: 'input',
            type: IOCIntentType.INPUT,
            inputs: [],
            params: { intent: 'input', name: 'data' },
            capability: {
              maxComplexity: ComplexityClass.CONSTANT,
              terminationGuarantee: 'structural' as 'structural',
              sideEffects: 'pure' as 'pure',
              parallelizable: true,
            },
          },
        ],
        outputs: ['input'],
        metadata: { name: 'opt-level-invalid' },
      };

      const result = await backend.compile(program, { optimizationLevel: 99 as any });
      expect(result.metadata?.optimizations).toEqual([]);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle empty program', async () => {
      const program: IOCProgram = {
        version: '1.0.0',
        nodes: [],
        outputs: [],
        metadata: { name: 'empty' },
      };

      const result = await backend.compile(program, { debug: true });
      expect(result.metadata?.llvmIR).toContain('ModuleID');
      expect(result.metadata?.llvmIR).toContain('ioc_execute');
    });

    it('should handle program with no outputs', async () => {
      const program: IOCProgram = {
        version: '1.0.0',
        nodes: [
          {
            id: 'input',
            type: IOCIntentType.INPUT,
            inputs: [],
            params: { intent: 'input', name: 'data' },
            capability: {
              maxComplexity: ComplexityClass.CONSTANT,
              terminationGuarantee: 'structural',
              sideEffects: 'pure',
              parallelizable: true,
            },
          },
        ],
        outputs: [],
        metadata: { name: 'no-outputs' },
      };

      const result = await backend.compile(program, { debug: true });
      expect(result.metadata?.llvmIR).toContain('ret i8* %input');
    });

    it('should handle missing node in execution order', async () => {
      const program: IOCProgram = {
        version: '1.0.0',
        nodes: [
          {
            id: 'input',
            type: IOCIntentType.INPUT,
            inputs: [],
            params: { intent: 'input', name: 'data' },
            capability: {
              maxComplexity: ComplexityClass.CONSTANT,
              terminationGuarantee: 'structural',
              sideEffects: 'pure',
              parallelizable: true,
            },
          },
        ],
        outputs: ['nonexistent'],
        metadata: { name: 'missing-node' },
      };

      const result = await backend.compile(program, { debug: true });
      expect(result.metadata?.llvmIR).toBeDefined();
    });

    it('should handle nodes with missing inputs', async () => {
      const program: IOCProgram = {
        version: '1.0.0',
        nodes: [
          {
            id: 'filter',
            type: IOCIntentType.FILTER,
            inputs: ['nonexistent'],
            params: {
              intent: 'filter',
              predicate: { type: 'always', value: true },
            },
            capability: {
              maxComplexity: ComplexityClass.LINEAR,
              terminationGuarantee: 'structural',
              sideEffects: 'pure',
              parallelizable: true,
            },
          },
        ],
        outputs: ['filter'],
        metadata: { name: 'missing-input' },
      };

      const result = await backend.compile(program, { debug: true });
      expect(result.metadata?.llvmIR).toContain('filter_array');
    });

    it('should handle compilation errors gracefully', async () => {
      const mockExecSync = vi.mocked(child_process.execSync);
      mockExecSync.mockImplementation((cmd: any) => {
        if (typeof cmd === 'string' && cmd.includes('llc')) {
          throw new Error('LLVM compilation error: invalid instruction');
        }
        return Buffer.from('Success');
      });

      const program: IOCProgram = {
        version: '1.0.0',
        nodes: [
          {
            id: 'input',
            type: IOCIntentType.INPUT,
            inputs: [],
            params: { intent: 'input', name: 'data' },
            capability: {
              maxComplexity: ComplexityClass.CONSTANT,
              terminationGuarantee: 'structural',
              sideEffects: 'pure',
              parallelizable: true,
            },
          },
        ],
        outputs: ['input'],
        metadata: { name: 'compilation-error' },
      };

      await expect(backend.compile(program)).rejects.toThrow('LLVM');
    });

    it('should execute compiled function placeholder', async () => {
      const program: IOCProgram = {
        version: '1.0.0',
        nodes: [
          {
            id: 'input',
            type: IOCIntentType.INPUT,
            inputs: [],
            params: { intent: 'input', name: 'data' },
            capability: {
              maxComplexity: ComplexityClass.CONSTANT,
              terminationGuarantee: 'structural',
              sideEffects: 'pure',
              parallelizable: true,
            },
          },
        ],
        outputs: ['input'],
        metadata: { name: 'execute-test' },
      };

      const result = await backend.compile(program);
      const testInput = [1, 2, 3, 4, 5];
      const output = result.execute(testInput);
      
      expect(output).toEqual(testInput);
    });

    it('should handle large programs efficiently', async () => {
      const nodes = [];
      for (let i = 0; i < 100; i++) {
        nodes.push({
          id: `node${i}`,
          type: IOCIntentType.INPUT,
          inputs: [],
          params: { intent: 'input' as const, name: `data${i}` },
          capability: {
            maxComplexity: ComplexityClass.CONSTANT,
            terminationGuarantee: 'structural',
            sideEffects: 'pure',
            parallelizable: true,
          },
        });
      }

      const program: IOCProgram = {
        version: '1.0.0',
        nodes,
        outputs: ['node0'],
        metadata: { name: 'large-program' },
      };

      const result = await backend.compile(program);
      expect(result.codeSize).toBeGreaterThan(0);
      expect(result.compilationTime).toBeGreaterThan(0);
    });
  });

  describe('LLVM comparison operators', () => {
    it('should map comparison operators correctly', async () => {
      const mappings = [
        { op: 'eq', expected: 'oeq' },
        { op: 'ne', expected: 'one' },
        { op: 'gt', expected: 'ogt' },
        { op: 'gte', expected: 'oge' },
        { op: 'lt', expected: 'olt' },
        { op: 'lte', expected: 'ole' },
      ];

      for (const { op, expected } of mappings) {
        const program: IOCProgram = {
          version: '1.0.0',
          nodes: [
            {
              id: 'input',
              type: IOCIntentType.INPUT,
              inputs: [],
              params: { intent: 'input', name: 'data' },
              capability: {
                maxComplexity: ComplexityClass.CONSTANT,
                terminationGuarantee: 'structural',
                sideEffects: 'pure',
                parallelizable: true,
              },
            },
            {
              id: 'filter',
              type: IOCIntentType.FILTER,
              inputs: ['input'],
              params: {
                intent: 'filter',
                predicate: { type: 'compare', op: op as any, value: 10 },
              },
              capability: {
                maxComplexity: ComplexityClass.LINEAR,
                terminationGuarantee: 'structural',
                sideEffects: 'pure',
                parallelizable: true,
              },
            },
          ],
          outputs: ['filter'],
          metadata: { name: `compare-${op}` },
        };

        const result = await backend.compile(program, { debug: true });
        expect(result.metadata?.llvmIR).toContain(`fcmp ${expected}`);
      }
    });
  });

  describe('String constants', () => {
    it('should handle string constants in LLVM IR', async () => {
      const program: IOCProgram = {
        version: '1.0.0',
        nodes: [
          {
            id: 'input',
            type: IOCIntentType.INPUT,
            inputs: [],
            params: { intent: 'input', name: 'data' },
            capability: {
              maxComplexity: ComplexityClass.CONSTANT,
              terminationGuarantee: 'structural',
              sideEffects: 'pure',
              parallelizable: true,
            },
          },
        ],
        outputs: ['input'],
        metadata: { name: 'string-constants' },
      };

      const result = await backend.compile(program, { debug: true });
      expect(result.metadata?.llvmIR).toContain('ModuleID');
    });
  });
});