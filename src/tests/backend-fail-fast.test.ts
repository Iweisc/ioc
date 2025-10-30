/**
 * Backend Fail-Fast Tests
 *
 * Verify that incomplete backends (WASM, LLVM) fail fast instead of
 * silently returning incorrect results.
 */

import { describe, it, expect } from 'vitest';
import { WebAssemblyBackend } from '../backends/wasm-backend';
import { LLVMBackend } from '../backends/llvm-backend';
import type { IOCProgram } from '../dsl/ioc-format';

describe('Backend Fail-Fast Behavior', () => {
  describe('WebAssembly Backend', () => {
    it('should throw error when compiling programs with nodes', async () => {
      const backend = new WebAssemblyBackend();

      // Program with an IOC node (filter operation)
      const program: IOCProgram = {
        version: '1.0',
        nodes: [
          {
            id: 'filter1',
            type: 'filter',
            inputs: ['input'],
            predicate: {
              type: 'comparison',
              left: { type: 'property', path: ['value'] },
              op: 'gt',
              right: { type: 'constant', value: 5 },
            },
            capability: {
              maxComplexity: 'O(n)',
              terminationGuarantee: 'always',
            },
          },
        ],
        edges: [],
        inputs: ['input'],
        outputs: ['filter1'],
      };

      // Should throw error instead of silently compiling
      await expect(backend.compile(program)).rejects.toThrow(
        /WebAssembly backend code generation is not yet implemented/
      );
    });

    it('should be marked as available (WASM support exists)', async () => {
      const backend = new WebAssemblyBackend();
      const available = await backend.isAvailable();

      // WASM backend is "available" (has infrastructure) but will fail on actual compilation
      expect(available).toBe(typeof WebAssembly !== 'undefined');
    });
  });

  describe('LLVM Backend', () => {
    it('should throw error when compiling programs with nodes', async () => {
      const backend = new LLVMBackend();

      // Program with an IOC node (map operation)
      const program: IOCProgram = {
        version: '1.0',
        nodes: [
          {
            id: 'map1',
            type: 'map',
            inputs: ['input'],
            transform: {
              type: 'arithmetic',
              op: 'multiply',
              operand: 2,
            },
            capability: {
              maxComplexity: 'O(n)',
              terminationGuarantee: 'always',
            },
          },
        ],
        edges: [],
        inputs: ['input'],
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
    it('WASM backend should fail without wabt library', async () => {
      const backend = new WebAssemblyBackend();

      const emptyProgram: IOCProgram = {
        version: '1.0',
        nodes: [],
        edges: [],
        inputs: [],
        outputs: [],
      };

      // Without wabt library, compilation should fail
      await expect(backend.compile(emptyProgram)).rejects.toThrow(/wabt/);
    });

    it('LLVM backend should fail without llvm-bindings', async () => {
      const backend = new LLVMBackend();

      const emptyProgram: IOCProgram = {
        version: '1.0',
        nodes: [],
        edges: [],
        inputs: [],
        outputs: [],
      };

      // Should throw since LLVM is not available or compilation is not implemented
      await expect(backend.compile(emptyProgram)).rejects.toThrow(/LLVM backend|llvm-bindings/);
    });
  });
});
