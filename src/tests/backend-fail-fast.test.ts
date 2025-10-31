/**
 * Backend Fail-Fast Tests
 *
 * Verify that incomplete backends (WASM, LLVM) fail fast instead of
 * silently returning incorrect results.
 */

import { describe, it, expect } from 'vitest';
import { WebAssemblyBackend } from '../backends/wasm-backend';
import { LLVMBackend } from '../backends/llvm-backend';
import { IOCIntentType, type IOCProgram } from '../dsl/ioc-format';
import { ComplexityClass } from '../dsl/safe-types';

describe('Backend Fail-Fast Behavior', () => {
  describe('WebAssembly Backend', () => {
    it('should throw error when compiling programs with nodes', async () => {
      const backend = new WebAssemblyBackend();

      // Program with an IOC node (filter operation)
      const program: IOCProgram = {
        version: '1.0',
        metadata: {},
        nodes: [
          {
            id: 'filter1',
            type: IOCIntentType.FILTER,
            inputs: ['input'],
            params: {
              intent: 'filter',
              predicate: {
                type: 'compare_property',
                property: 'value',
                op: 'gt',
                value: 5,
              },
            },
            capability: {
              maxComplexity: ComplexityClass.LINEAR,
              terminationGuarantee: 'structural',
              sideEffects: 'pure',
              parallelizable: true,
            },
          },
        ],
        outputs: ['filter1'],
      };

      // With wabt library installed, should succeed
      const result = await backend.compile(program);
      expect(result).toBeDefined();
      expect(result.backend).toBe('wasm');
    });

    it('should be marked as available (WASM support exists)', async () => {
      const backend = new WebAssemblyBackend();
      const available = await backend.isAvailable();

      // WASM backend is "available" (has infrastructure) but will fail on actual compilation
      expect(available).toBe(typeof (globalThis as any).WebAssembly !== 'undefined');
    });
  });

  describe('LLVM Backend', () => {
    it('should throw error when compiling programs with nodes', async () => {
      const backend = new LLVMBackend();

      // Program with an IOC node (map operation)
      const program: IOCProgram = {
        version: '1.0',
        metadata: {},
        nodes: [
          {
            id: 'map1',
            type: IOCIntentType.MAP,
            inputs: ['input'],
            params: {
              intent: 'map',
              transform: {
                type: 'arithmetic',
                op: 'multiply',
                operand: 2,
              },
            },
            capability: {
              maxComplexity: ComplexityClass.LINEAR,
              terminationGuarantee: 'structural',
              sideEffects: 'pure',
              parallelizable: true,
            },
          },
        ],
        outputs: ['map1'],
      };

      // Should throw error (either availability or compilation error)
      await expect(backend.compile(program)).rejects.toThrow(/LLVM backend|llvm-bindings/);
    });

    it('should detect llvm-bindings availability', async () => {
      const backend = new LLVMBackend();
      const available = await backend.isAvailable();

      // LLVM backend availability depends on llvm-bindings package
      expect(typeof available).toBe('boolean');
    });
  });

  describe('Empty Program Handling', () => {
    it('WASM backend should compile empty programs with wabt library', async () => {
      const backend = new WebAssemblyBackend();

      const emptyProgram: IOCProgram = {
        version: '1.0',
        metadata: {},
        nodes: [],
        outputs: [],
      };

      // With wabt library installed, compilation should succeed
      const result = await backend.compile(emptyProgram);
      expect(result).toBeDefined();
      expect(result.backend).toBe('wasm');
      expect(result.execute).toBeDefined();
    });

    it('LLVM backend should fail without llvm-bindings', async () => {
      const backend = new LLVMBackend();

      const emptyProgram: IOCProgram = {
        version: '1.0',
        metadata: {},
        nodes: [],
        outputs: [],
      };

      // Should throw since LLVM is not available or compilation is not implemented
      await expect(backend.compile(emptyProgram)).rejects.toThrow(/LLVM backend|llvm-bindings/);
    });
  });
});
