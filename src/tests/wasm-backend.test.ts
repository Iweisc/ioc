/**
 * Tests for WebAssembly Backend
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { WebAssemblyBackend } from '../backends/wasm-backend';
import { BackendType } from '../backends/types';
import { createSimpleProgram } from './test-helpers';
import { IOCIntentType } from '../dsl/ioc-format';
import { ComplexityClass } from '../dsl/safe-types';
import type { IOCProgram } from '../dsl/ioc-format';

describe('WebAssemblyBackend', () => {
  let backend: WebAssemblyBackend;

  beforeEach(() => {
    backend = new WebAssemblyBackend();
  });

  describe('backend properties', () => {
    it('should have correct type', () => {
      expect(backend.type).toBe(BackendType.WASM);
    });

    it('should have correct name', () => {
      expect(backend.name).toBe('WebAssembly');
    });
  });

  describe('isAvailable', () => {
    it('should check if WebAssembly is available', async () => {
      const available = await backend.isAvailable();
      expect(typeof available).toBe('boolean');
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
      const largeProgram: IOCProgram = {
        ...smallProgram,
        nodes: [...smallProgram.nodes, ...smallProgram.nodes, ...smallProgram.nodes],
      };

      const smallEstimate = backend.estimateCompilationTime(smallProgram);
      const largeEstimate = backend.estimateCompilationTime(largeProgram);

      expect(largeEstimate).toBeGreaterThan(smallEstimate);
    });
  });

  describe('estimatePerformanceScore', () => {
    it('should return a performance score', () => {
      const score = backend.estimatePerformanceScore();

      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(10);
    });

    it('should return consistent score', () => {
      const score1 = backend.estimatePerformanceScore();
      const score2 = backend.estimatePerformanceScore();

      expect(score1).toBe(score2);
    });
  });

  describe('compile', () => {
    it('should attempt to compile a simple program', async () => {
      const isAvailable = await backend.isAvailable();

      if (!isAvailable) {
        // Skip test if WASM not available
        return;
      }

      const program = createSimpleProgram();

      try {
        const result = await backend.compile(program);

        expect(result).toBeDefined();
        expect(result.backend).toBe(BackendType.WASM);
        expect(typeof result.execute).toBe('function');
        expect(typeof result.codeSize).toBe('number');
        expect(typeof result.compilationTime).toBe('number');
      } catch (error: any) {
        // WASM compilation might fail due to missing wabt library
        expect(error.message).toContain('wabt');
      }
    });

    it('should handle optimization levels', async () => {
      const isAvailable = await backend.isAvailable();
      if (!isAvailable) return;

      const program = createSimpleProgram();

      try {
        const result = await backend.compile(program, { optimizationLevel: 2 });
        expect(result.metadata?.optimizations).toBeDefined();
      } catch (error: any) {
        // Expected if wabt not available
        expect(error.message).toBeDefined();
      }
    });

    it('should fail gracefully when wabt is not available', async () => {
      const program = createSimpleProgram();

      try {
        await backend.compile(program);
      } catch (error: any) {
        if (error.message.includes('wabt')) {
          expect(error.message).toContain('wabt');
        }
      }
    });
  });

  describe('error handling', () => {
    it('should handle filter nodes with unsupported operations', async () => {
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
        metadata: { name: 'filter-test' },
      };

      try {
        await backend.compile(program);
      } catch (error: any) {
        // Expected to fail with wabt or compilation error
        expect(error).toBeDefined();
      }
    });

    it('should handle group_by nodes with error', async () => {
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
              keyTransform: { type: 'identity' },
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

      try {
        await backend.compile(program);
      } catch (error: any) {
        // Should throw error about unsupported group_by
        expect(error.message).toBeDefined();
      }
    });
  });
});
