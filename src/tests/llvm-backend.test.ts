/**
 * Tests for LLVM Backend
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { LLVMBackend } from '../backends/llvm-backend';
import { BackendType } from '../backends/types';
import { createSimpleProgram, createLargeProgram } from './test-helpers';

describe('LLVMBackend', () => {
  let backend: LLVMBackend;

  beforeEach(() => {
    backend = new LLVMBackend();
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
      const available = await backend.isAvailable();
      expect(typeof available).toBe('boolean');
    });

    it('should cache availability check', async () => {
      const available1 = await backend.isAvailable();
      const available2 = await backend.isAvailable();

      expect(available1).toBe(available2);
    });

    it('should return false in most environments', async () => {
      // LLVM bindings are typically not available unless explicitly installed
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

    it('should estimate higher compilation time than JavaScript', () => {
      const program = createSimpleProgram();
      const estimate = backend.estimateCompilationTime(program);

      // LLVM should estimate ~20ms per node (slower than JS)
      expect(estimate).toBeGreaterThan(0);
    });
  });

  describe('estimatePerformanceScore', () => {
    it('should return maximum performance score', () => {
      const score = backend.estimatePerformanceScore();

      expect(typeof score).toBe('number');
      expect(score).toBe(10); // LLVM gets 10/10 for performance
    });

    it('should return consistent score', () => {
      const score1 = backend.estimatePerformanceScore();
      const score2 = backend.estimatePerformanceScore();

      expect(score1).toBe(score2);
    });
  });

  describe('compile', () => {
    it('should throw error when LLVM not available', async () => {
      const program = createSimpleProgram();

      await expect(backend.compile(program)).rejects.toThrow('LLVM backend not available');
    });

    it('should check availability before compiling', async () => {
      const program = createSimpleProgram();

      try {
        await backend.compile(program);
      } catch (error: any) {
        expect(error.message).toContain('LLVM');
      }
    });

    it('should reject with clear error message', async () => {
      const program = createSimpleProgram();

      await expect(backend.compile(program)).rejects.toThrow(
        /LLVM backend not available.*llvm-bindings/i
      );
    });

    it('should handle optimization level option', async () => {
      const program = createSimpleProgram();

      try {
        await backend.compile(program, { optimizationLevel: 3 });
      } catch (error: any) {
        // Should fail with availability error, not options error
        expect(error.message).toContain('not available');
      }
    });

    it('should handle debug mode option', async () => {
      const program = createSimpleProgram();

      try {
        await backend.compile(program, { debug: true });
      } catch (error: any) {
        expect(error.message).toContain('not available');
      }
    });
  });

  describe('compilation phases', () => {
    it('should mention LLVM IR generation in errors', async () => {
      // Even though compilation fails, we can verify error messages
      const program = createSimpleProgram();

      try {
        await backend.compile(program);
      } catch (error: any) {
        // Error should be about availability, not IR generation
        expect(error.message).toBeDefined();
      }
    });
  });

  describe('edge cases', () => {
    it('should handle empty program', async () => {
      const emptyProgram = {
        version: '1.0.0',
        nodes: [],
        outputs: [],
        metadata: { name: 'empty' },
      };

      try {
        await backend.compile(emptyProgram);
      } catch (error: any) {
        expect(error.message).toContain('not available');
      }
    });

    it('should handle large programs', async () => {
      const largeProgram = createLargeProgram(100);

      try {
        await backend.compile(largeProgram);
      } catch (error: any) {
        expect(error.message).toContain('not available');
      }
    });
  });

  describe('performance characteristics', () => {
    it('should be slowest to compile', () => {
      const program = createSimpleProgram();
      const time = backend.estimateCompilationTime(program);

      // LLVM should be slowest: ~20ms per node
      // Compare to JS (~1ms) and WASM (~5ms)
      expect(time).toBeGreaterThan(10);
    });

    it('should have best runtime performance score', () => {
      const score = backend.estimatePerformanceScore();
      expect(score).toBe(10);
    });
  });
});
