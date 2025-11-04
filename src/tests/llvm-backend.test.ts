/**
 * Tests for LLVM Backend
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { LLVMBackend } from '../backends/llvm-backend';
import { BackendType } from '../backends/types';
import { createSimpleProgram, createLargeProgram } from './test-helpers';
import { IOCIntentType } from '../dsl/ioc-format';
import { ComplexityClass } from '../dsl/safe-types';
import type { IOCProgram } from '../dsl/ioc-format';
import * as child_process from 'child_process';
import * as fs from 'fs';

// Mock child_process and fs modules
vi.mock('child_process');
vi.mock('fs');

describe('LLVMBackend', () => {
  let backend: LLVMBackend;

  beforeEach(() => {
    backend = new LLVMBackend();
    vi.clearAllMocks();
  });

  describe('backend properties', () => {
    it('should have correct type', () => {
      expect(backend.type).toBe(BackendType.LLVM);
    });

    it('should have correct name', () => {
      expect(backend.name).toBe('LLVM');
    });
  });

  describe('isAvailable', () => {
    it('should check if LLVM is available', async () => {
      const mockExecSync = vi.mocked(child_process.execSync);
      mockExecSync.mockImplementation(() => Buffer.from('LLVM version 15.0.0'));

      const available = await backend.isAvailable();
      expect(available).toBe(true);
      expect(mockExecSync).toHaveBeenCalledWith('llc --version', { stdio: 'ignore' });
      expect(mockExecSync).toHaveBeenCalledWith('lli --version', { stdio: 'ignore' });
    });

    it('should cache availability check', async () => {
      const mockExecSync = vi.mocked(child_process.execSync);
      mockExecSync.mockImplementation(() => Buffer.from('LLVM version 15.0.0'));

      const available1 = await backend.isAvailable();
      const available2 = await backend.isAvailable();

      expect(available1).toBe(available2);
      expect(mockExecSync).toHaveBeenCalledTimes(2); // Only first call checks both tools
    });

    it('should return false when LLVM is not available', async () => {
      const mockExecSync = vi.mocked(child_process.execSync);
      mockExecSync.mockImplementation(() => {
        throw new Error('Command not found');
      });

      const available = await backend.isAvailable();
      expect(available).toBe(false);
    });
  });

  describe('estimateCompilationTime', () => {
    it('should estimate compilation time for simple program', () => {
      const program = createSimpleProgram();
      const estimate = backend.estimateCompilationTime(program);

      expect(typeof estimate).toBe('number');
      expect(estimate).toBeGreaterThanOrEqual(0);
    });

    it('should scale with number of nodes', () => {
      const smallProgram = createSimpleProgram();
      const largeProgram = createLargeProgram(10);

      const smallEstimate = backend.estimateCompilationTime(smallProgram);
      const largeEstimate = backend.estimateCompilationTime(largeProgram);

      expect(largeEstimate).toBeGreaterThan(smallEstimate);
    });

    it('should estimate ~20ms per node', () => {
      const program = createSimpleProgram();
      const estimate = backend.estimateCompilationTime(program);
      const expectedEstimate = program.nodes.length * 20;

      expect(estimate).toBe(expectedEstimate);
    });
  });

  describe('estimatePerformanceScore', () => {
    it('should return maximum performance score', () => {
      const score = backend.estimatePerformanceScore();

      expect(typeof score).toBe('number');
      expect(score).toBe(10);
    });

    it('should return consistent score', () => {
      const score1 = backend.estimatePerformanceScore();
      const score2 = backend.estimatePerformanceScore();

      expect(score1).toBe(score2);
    });
  });

  describe('compile', () => {
    it('should throw error when LLVM not available', async () => {
      const mockExecSync = vi.mocked(child_process.execSync);
      mockExecSync.mockImplementation(() => {
        throw new Error('Command not found');
      });

      const program = createSimpleProgram();

      await expect(backend.compile(program)).rejects.toThrow('LLVM backend not available');
    });

    it('should compile a simple program when LLVM is available', async () => {
      const mockExecSync = vi.mocked(child_process.execSync);
      const mockWriteFileSync = vi.mocked(fs.writeFileSync);
      const mockUnlinkSync = vi.mocked(fs.unlinkSync);
      const mockStatSync = vi.mocked(fs.statSync);
      const mockExistsSync = vi.mocked(fs.existsSync);

      mockExecSync.mockImplementation(() => Buffer.from('Success'));
      mockWriteFileSync.mockImplementation(() => {});
      mockUnlinkSync.mockImplementation(() => {});
      mockExistsSync.mockReturnValue(true);
      mockStatSync.mockReturnValue({ size: 1024 } as any);

      const program = createSimpleProgram();
      const result = await backend.compile(program);

      expect(result).toBeDefined();
      expect(result.backend).toBe(BackendType.LLVM);
      expect(typeof result.execute).toBe('function');
      expect(result.codeSize).toBe(1024);
      expect(typeof result.compilationTime).toBe('number');
    });

    it('should handle optimization level option', async () => {
      const mockExecSync = vi.mocked(child_process.execSync);
      const mockWriteFileSync = vi.mocked(fs.writeFileSync);
      const mockUnlinkSync = vi.mocked(fs.unlinkSync);
      const mockStatSync = vi.mocked(fs.statSync);

      mockExecSync.mockImplementation((cmd: any) => {
        if (typeof cmd === 'string' && cmd.includes('-O3')) {
          return Buffer.from('Optimized');
        }
        return Buffer.from('Success');
      });
      mockWriteFileSync.mockImplementation(() => {});
      mockUnlinkSync.mockImplementation(() => {});
      mockStatSync.mockReturnValue({ size: 1024 } as any);

      const program = createSimpleProgram();
      const result = await backend.compile(program, { optimizationLevel: 3 });

      expect(result.metadata?.optimizations).toContain('vectorize');
      expect(result.metadata?.optimizations).toContain('loop-unroll');
    });

    it('should include LLVM IR in debug mode', async () => {
      const mockExecSync = vi.mocked(child_process.execSync);
      const mockWriteFileSync = vi.mocked(fs.writeFileSync);
      const mockUnlinkSync = vi.mocked(fs.unlinkSync);
      const mockStatSync = vi.mocked(fs.statSync);

      mockExecSync.mockImplementation(() => Buffer.from('Success'));
      mockWriteFileSync.mockImplementation(() => {});
      mockUnlinkSync.mockImplementation(() => {});
      mockStatSync.mockReturnValue({ size: 1024 } as any);

      const program = createSimpleProgram();
      const result = await backend.compile(program, { debug: true });

      expect(result.metadata?.llvmIR).toBeDefined();
      expect(result.metadata?.llvmIR).toContain('ModuleID');
    });

    it('should clean up temporary files on error', async () => {
      const mockExecSync = vi.mocked(child_process.execSync);
      const mockWriteFileSync = vi.mocked(fs.writeFileSync);
      const mockUnlinkSync = vi.mocked(fs.unlinkSync);
      const mockExistsSync = vi.mocked(fs.existsSync);

      mockExecSync.mockImplementation((cmd: any) => {
        if (typeof cmd === 'string' && cmd.includes('llc')) {
          throw new Error('Compilation failed');
        }
        return Buffer.from('Success');
      });
      mockWriteFileSync.mockImplementation(() => {});
      mockUnlinkSync.mockImplementation(() => {});
      mockExistsSync.mockReturnValue(true);

      const program = createSimpleProgram();

      await expect(backend.compile(program)).rejects.toThrow('LLVM');
    });
  });

  describe('LLVM IR generation - operations', () => {
    beforeEach(() => {
      const mockExecSync = vi.mocked(child_process.execSync);
      const mockWriteFileSync = vi.mocked(fs.writeFileSync);
      const mockUnlinkSync = vi.mocked(fs.unlinkSync);
      const mockStatSync = vi.mocked(fs.statSync);

      mockExecSync.mockImplementation(() => Buffer.from('Success'));
      mockWriteFileSync.mockImplementation(() => {});
      mockUnlinkSync.mockImplementation(() => {});
      mockStatSync.mockReturnValue({ size: 1024 } as any);
    });

    it('should generate LLVM IR for MAP operation', async () => {
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
              transform: { type: 'arithmetic', op: 'multiply', operand: 2 },
            },
            capability: {
              maxComplexity: ComplexityClass.CONSTANT,
              terminationGuarantee: 'structural',
              sideEffects: 'pure',
              parallelizable: true,
            },
          },
        ],
        outputs: ['map'],
        metadata: { name: 'map-test' },
      };

      const result = await backend.compile(program, { debug: true });
      expect(result.metadata?.llvmIR).toContain('Map node');
      expect(result.metadata?.llvmIR).toContain('map_array');
    });

    it('should generate LLVM IR for FILTER operation', async () => {
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
              predicate: { type: 'compare', op: 'gt', value: 10 },
            },
            capability: {
              maxComplexity: ComplexityClass.CONSTANT,
              terminationGuarantee: 'structural',
              sideEffects: 'pure',
              parallelizable: true,
            },
          },
        ],
        outputs: ['filter'],
        metadata: { name: 'filter-test' },
      };

      const result = await backend.compile(program, { debug: true });
      expect(result.metadata?.llvmIR).toContain('Filter node');
      expect(result.metadata?.llvmIR).toContain('filter_array');
    });

    it('should generate LLVM IR for REDUCE operation', async () => {
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
            id: 'reduce',
            type: IOCIntentType.REDUCE,
            inputs: ['input'],
            params: {
              intent: 'reduce',
              operation: { type: 'sum' },
            },
            capability: {
              maxComplexity: ComplexityClass.LINEAR,
              terminationGuarantee: 'structural',
              sideEffects: 'pure',
              parallelizable: false,
            },
          },
        ],
        outputs: ['reduce'],
        metadata: { name: 'reduce-test' },
      };

      const result = await backend.compile(program, { debug: true });
      expect(result.metadata?.llvmIR).toContain('Reduce node');
      expect(result.metadata?.llvmIR).toContain('reduce_array');
    });

    it('should handle unsupported GROUP_BY operation', async () => {
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
            id: 'group',
            type: IOCIntentType.GROUP_BY,
            inputs: ['input'],
            params: {
              intent: 'group_by',
              keyTransform: { type: 'property', path: ['category'] },
            },
            capability: {
              maxComplexity: ComplexityClass.LINEAR,
              terminationGuarantee: 'structural',
              sideEffects: 'pure',
              parallelizable: false,
            },
          },
        ],
        outputs: ['group'],
        metadata: { name: 'group-test' },
      };

      await expect(backend.compile(program)).rejects.toThrow();
    });

    it('should generate LLVM IR for simple input operation', async () => {
      const program: IOCProgram = {
        version: '1.0.0',
        nodes: [
          {
            id: 'input1',
            type: IOCIntentType.INPUT,
            inputs: [],
            params: { intent: 'input', name: 'data1' },
            capability: {
              maxComplexity: ComplexityClass.CONSTANT,
              terminationGuarantee: 'structural',
              sideEffects: 'pure',
              parallelizable: true,
            },
          },
        ],
        outputs: ['input1'],
        metadata: { name: 'test' },
      };

      const result = await backend.compile(program, { debug: true });
      expect(result.metadata?.llvmIR).toContain('ioc_execute');
    });
  });
});
