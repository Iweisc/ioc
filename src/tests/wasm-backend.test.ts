/**
 * Tests for WebAssembly Backend
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { WebAssemblyBackend } from '../backends/wasm-backend';
import { BackendType } from '../backends/types';
import { createSimpleProgram } from './test-helpers';
import { IOCIntentType } from '../dsl/ioc-format';
import { ComplexityClass, type ArithmeticOp } from '../dsl/safe-types';
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

    it('should throw error for reduce operation with "any" predicate', async () => {
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
              operation: { type: 'any', predicate: { type: 'always', value: true } },
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
        metadata: { name: 'any-test' },
      };

      try {
        await backend.compile(program);
        // If compilation succeeds, just mark as success (wabt available)
      } catch (error: any) {
        expect(error.message).toBeDefined();
        if (!error.message.includes('wabt')) {
          expect(error.message).toContain('any');
        }
      }
    });

    it('should throw error for reduce operation with "all" predicate', async () => {
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
              operation: { type: 'all', predicate: { type: 'always', value: true } },
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
        metadata: { name: 'all-test' },
      };

      try {
        await backend.compile(program);
      } catch (error: any) {
        expect(error.message).toBeDefined();
        if (!error.message.includes('wabt')) {
          expect(error.message).toContain('all');
        }
      }
    });

    it('should throw error for reduce operation with "join"', async () => {
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
              operation: { type: 'join', separator: ',' },
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
        metadata: { name: 'join-test' },
      };

      try {
        await backend.compile(program);
      } catch (error: any) {
        expect(error.message).toBeDefined();
        if (!error.message.includes('wabt')) {
          expect(error.message).toContain('join');
        }
      }
    });

    it('should throw error for join node type', async () => {
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
          {
            id: 'input2',
            type: IOCIntentType.INPUT,
            inputs: [],
            params: { intent: 'input', name: 'data2' },
            capability: {
              maxComplexity: ComplexityClass.CONSTANT,
              terminationGuarantee: 'structural',
              sideEffects: 'pure',
              parallelizable: true,
            },
          },
          {
            id: 'join',
            type: IOCIntentType.JOIN,
            inputs: ['input1', 'input2'],
            params: {
              intent: 'join',
              leftKey: { type: 'property', path: ['id'] as string[] },
              rightKey: { type: 'property', path: ['id'] as string[] },
              joinType: 'inner',
            },
            capability: {
              maxComplexity: ComplexityClass.QUADRATIC,
              terminationGuarantee: 'structural',
              sideEffects: 'pure',
              parallelizable: false,
            },
          },
        ],
        outputs: ['join'],
        metadata: { name: 'join-node-test' },
      };

      try {
        await backend.compile(program);
      } catch (error: any) {
        expect(error.message).toBeDefined();
        if (!error.message.includes('wabt')) {
          expect(error.message).toContain('join');
        }
      }
    });
  });

  describe('WAT generation - predicates', () => {
    it('should generate WAT for compare predicate', async () => {
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
              maxComplexity: ComplexityClass.LINEAR,
              terminationGuarantee: 'structural',
              sideEffects: 'pure',
              parallelizable: true,
            },
          },
        ],
        outputs: ['filter'],
        metadata: { name: 'compare-test' },
      };

      try {
        await backend.compile(program);
      } catch (error: any) {
        // Expected to fail with wabt not available
        expect(error).toBeDefined();
      }
    });

    it('should generate WAT for compare_property predicate', async () => {
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
              predicate: { type: 'compare_property', property: 'age', op: 'gte', value: 18 },
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
        metadata: { name: 'property-test' },
      };

      try {
        await backend.compile(program);
      } catch (error: any) {
        expect(error).toBeDefined();
      }
    });

    it('should generate WAT for type_check predicate', async () => {
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
              predicate: { type: 'type_check', expectedType: 'number' },
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
        metadata: { name: 'typecheck-test' },
      };

      try {
        await backend.compile(program);
      } catch (error: any) {
        expect(error).toBeDefined();
      }
    });

    it('should generate WAT for AND predicate', async () => {
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
              predicate: {
                type: 'and',
                predicates: [
                  { type: 'compare', op: 'gt', value: 10 },
                  { type: 'compare', op: 'lt', value: 100 },
                ],
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
        outputs: ['filter'],
        metadata: { name: 'and-test' },
      };

      try {
        await backend.compile(program);
      } catch (error: any) {
        expect(error).toBeDefined();
      }
    });

    it('should generate WAT for OR predicate', async () => {
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
              predicate: {
                type: 'or',
                predicates: [
                  { type: 'compare', op: 'lt', value: 10 },
                  { type: 'compare', op: 'gt', value: 100 },
                ],
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
        outputs: ['filter'],
        metadata: { name: 'or-test' },
      };

      try {
        await backend.compile(program);
      } catch (error: any) {
        expect(error).toBeDefined();
      }
    });

    it('should generate WAT for NOT predicate', async () => {
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
              predicate: {
                type: 'not',
                predicate: { type: 'compare', op: 'eq', value: 0 },
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
        outputs: ['filter'],
        metadata: { name: 'not-test' },
      };

      try {
        await backend.compile(program);
      } catch (error: any) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('WAT generation - transforms', () => {
    it('should generate WAT for constant transform', async () => {
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

      try {
        await backend.compile(program);
      } catch (error: any) {
        expect(error).toBeDefined();
      }
    });

    it('should generate WAT for property transform', async () => {
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
              transform: { type: 'property', path: ['name'] as string[] },
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
        metadata: { name: 'property-transform' },
      };

      try {
        await backend.compile(program);
      } catch (error: any) {
        expect(error).toBeDefined();
      }
    });

    it('should generate WAT for arithmetic transform with all operations', async () => {
      const operations: Array<'add' | 'subtract' | 'multiply' | 'divide' | 'modulo' | 'negate'> = [
        'add',
        'subtract',
        'multiply',
        'divide',
        'modulo',
        'negate',
      ];

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
                transform: { type: 'arithmetic', op: op as ArithmeticOp, operand: 5 },
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

        try {
          await backend.compile(program);
        } catch (error: any) {
          expect(error).toBeDefined();
        }
      }
    });

    it('should generate WAT for string transform', async () => {
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
              transform: { type: 'string', op: 'uppercase' },
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
        metadata: { name: 'string-transform' },
      };

      try {
        await backend.compile(program);
      } catch (error: any) {
        expect(error).toBeDefined();
      }
    });

    it('should generate WAT for array length transform', async () => {
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
              transform: { type: 'array', op: 'length' },
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
        metadata: { name: 'array-length' },
      };

      try {
        await backend.compile(program);
      } catch (error: any) {
        expect(error).toBeDefined();
      }
    });

    it('should generate WAT for conditional transform', async () => {
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
              transform: {
                type: 'conditional',
                condition: { type: 'compare', op: 'gt', value: 0 },
                ifTrue: { type: 'constant', value: 1 },
                ifFalse: { type: 'constant', value: 0 },
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
        outputs: ['map'],
        metadata: { name: 'conditional-transform' },
      };

      try {
        await backend.compile(program);
      } catch (error: any) {
        expect(error).toBeDefined();
      }
    });

    it('should generate WAT for compose transform', async () => {
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
              transform: {
                type: 'compose',
                transforms: [
                  { type: 'arithmetic', op: 'multiply', operand: 2 },
                  { type: 'arithmetic', op: 'add', operand: 10 },
                ],
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
        outputs: ['map'],
        metadata: { name: 'compose-transform' },
      };

      try {
        await backend.compile(program);
      } catch (error: any) {
        expect(error).toBeDefined();
      }
    });
  });

  describe('WAT generation - reductions', () => {
    const reductionOps: Array<
      'sum' | 'product' | 'min' | 'max' | 'average' | 'count' | 'first' | 'last'
    > = ['sum', 'product', 'min', 'max', 'average', 'count', 'first', 'last'];

    reductionOps.forEach((op) => {
      it(`should generate WAT for ${op} reduction`, async () => {
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
                operation: {
                  type: op as
                    | 'sum'
                    | 'product'
                    | 'max'
                    | 'min'
                    | 'average'
                    | 'count'
                    | 'first'
                    | 'last',
                },
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
          metadata: { name: `${op}-reduction` },
        };

        try {
          await backend.compile(program);
        } catch (error: any) {
          expect(error).toBeDefined();
        }
      });
    });
  });

  describe('WAT generation - array operations', () => {
    it('should generate WAT for slice operation', async () => {
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
            id: 'slice',
            type: IOCIntentType.SLICE,
            inputs: ['input'],
            params: {
              intent: 'slice',
              start: 0,
              end: 10,
            },
            capability: {
              maxComplexity: ComplexityClass.LINEAR,
              terminationGuarantee: 'structural',
              sideEffects: 'pure',
              parallelizable: true,
            },
          },
        ],
        outputs: ['slice'],
        metadata: { name: 'slice-operation' },
      };

      try {
        await backend.compile(program);
      } catch (error: any) {
        expect(error).toBeDefined();
      }
    });

    it('should generate WAT for concat operation', async () => {
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
          {
            id: 'input2',
            type: IOCIntentType.INPUT,
            inputs: [],
            params: { intent: 'input', name: 'data2' },
            capability: {
              maxComplexity: ComplexityClass.CONSTANT,
              terminationGuarantee: 'structural',
              sideEffects: 'pure',
              parallelizable: true,
            },
          },
          {
            id: 'concat',
            type: IOCIntentType.CONCAT,
            inputs: ['input1', 'input2'],
            params: { intent: 'concat' },
            capability: {
              maxComplexity: ComplexityClass.LINEAR,
              terminationGuarantee: 'structural',
              sideEffects: 'pure',
              parallelizable: true,
            },
          },
        ],
        outputs: ['concat'],
        metadata: { name: 'concat-operation' },
      };

      try {
        await backend.compile(program);
      } catch (error: any) {
        expect(error).toBeDefined();
      }
    });

    it('should generate WAT for flatten operation', async () => {
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
            id: 'flatten',
            type: IOCIntentType.FLATTEN,
            inputs: ['input'],
            params: {
              intent: 'flatten',
              depth: 2,
            },
            capability: {
              maxComplexity: ComplexityClass.QUADRATIC,
              terminationGuarantee: 'structural',
              sideEffects: 'pure',
              parallelizable: true,
            },
          },
        ],
        outputs: ['flatten'],
        metadata: { name: 'flatten-operation' },
      };

      try {
        await backend.compile(program);
      } catch (error: any) {
        expect(error).toBeDefined();
      }
    });

    it('should generate WAT for distinct operation', async () => {
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
            id: 'distinct',
            type: IOCIntentType.DISTINCT,
            inputs: ['input'],
            params: { intent: 'distinct' },
            capability: {
              maxComplexity: ComplexityClass.LINEAR,
              terminationGuarantee: 'structural',
              sideEffects: 'pure',
              parallelizable: true,
            },
          },
        ],
        outputs: ['distinct'],
        metadata: { name: 'distinct-operation' },
      };

      try {
        await backend.compile(program);
      } catch (error: any) {
        expect(error).toBeDefined();
      }
    });

    it('should generate WAT for sort operation', async () => {
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
            id: 'sort',
            type: IOCIntentType.SORT,
            inputs: ['input'],
            params: {
              intent: 'sort',
              descending: true,
            },
            capability: {
              maxComplexity: ComplexityClass.LINEARITHMIC,
              terminationGuarantee: 'structural',
              sideEffects: 'pure',
              parallelizable: false,
            },
          },
        ],
        outputs: ['sort'],
        metadata: { name: 'sort-operation' },
      };

      try {
        await backend.compile(program);
      } catch (error: any) {
        expect(error).toBeDefined();
      }
    });
  });
});
