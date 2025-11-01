/**
 * Expanded tests for IOC Format
 */
import { describe, it, expect } from 'vitest';
import {
  IOCIntentType,
  serializeIOC,
  deserializeIOC,
  validateIOCProgram,
  getExecutionOrder,
  calculateNodeCapability,
} from '../dsl/ioc-format';
import { createSimpleProgram, createLargeProgram } from './test-helpers';
import type { IOCProgram } from '../dsl/ioc-format';
import { ComplexityClass } from '../dsl/safe-types';

describe('IOC Format - Expanded Tests', () => {
  describe('serializeIOC', () => {
    it('should serialize a simple program to JSON', () => {
      const program = createSimpleProgram();
      const serialized = serializeIOC(program);

      expect(typeof serialized).toBe('string');
      expect(JSON.parse(serialized)).toEqual(program);
    });

    it('should serialize a large program', () => {
      const program = createLargeProgram(50);
      const serialized = serializeIOC(program);

      expect(typeof serialized).toBe('string');
      const parsed = JSON.parse(serialized);
      expect(parsed.nodes.length).toBe(50);
    });

    it('should handle programs with metadata', () => {
      const program = createSimpleProgram();
      program.metadata.description = 'Test program';
      program.metadata.author = 'Test Author';

      const serialized = serializeIOC(program);
      const parsed = JSON.parse(serialized);

      expect(parsed.metadata.description).toBe('Test program');
      expect(parsed.metadata.author).toBe('Test Author');
    });
  });

  describe('deserializeIOC', () => {
    it('should deserialize a valid JSON program', () => {
      const program = createSimpleProgram();
      const serialized = serializeIOC(program);
      const deserialized = deserializeIOC(serialized);

      expect(deserialized).toEqual(program);
    });

    it('should preserve node structure', () => {
      const program = createSimpleProgram();
      const serialized = serializeIOC(program);
      const deserialized = deserializeIOC(serialized);

      expect(deserialized.nodes.length).toBe(program.nodes.length);
      expect(deserialized.nodes[0]).toEqual(program.nodes[0]);
    });

    it('should handle programs with all node types', () => {
      const program: IOCProgram = {
        version: '1.0.0',
        nodes: [
          {
            id: 'input',
            type: IOCIntentType.INPUT,
            inputs: [],
            params: { intent: 'input', name: 'data' },
            capability: calculateNodeCapability({
              id: 'input',
              type: IOCIntentType.INPUT,
              inputs: [],
              params: { intent: 'input', name: 'data' },
            } as any),
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
              maxComplexity: ComplexityClass.CONSTANT,
              terminationGuarantee: 'structural',
              sideEffects: 'pure',
              parallelizable: true,
            },
          },
          {
            id: 'map',
            type: IOCIntentType.MAP,
            inputs: ['filter'],
            params: {
              intent: 'map',
              transform: { type: 'identity' },
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
        metadata: { name: 'multi-type' },
      };

      const serialized = serializeIOC(program);
      const deserialized = deserializeIOC(serialized);

      expect(deserialized.nodes.length).toBe(3);
      expect(deserialized.nodes.map((n) => n.type)).toEqual([
        IOCIntentType.INPUT,
        IOCIntentType.FILTER,
        IOCIntentType.MAP,
      ]);
    });
  });

  describe('validateIOCProgram', () => {
    it('should validate a correct program', () => {
      const program = createSimpleProgram();
      expect(() => validateIOCProgram(program)).not.toThrow();
    });

    it('should validate program with multiple outputs', () => {
      const program = createSimpleProgram();
      program.outputs = ['output', 'output'];

      expect(() => validateIOCProgram(program)).not.toThrow();
    });

    it('should validate program with complex graph', () => {
      const program = createLargeProgram(10);
      expect(() => validateIOCProgram(program)).not.toThrow();
    });
  });

  describe('getExecutionOrder', () => {
    it('should return execution order for simple program', () => {
      const program = createSimpleProgram();
      const order = getExecutionOrder(program);

      expect(Array.isArray(order)).toBe(true);
      expect(order.length).toBe(program.nodes.length);
    });

    it('should return topologically sorted order', () => {
      const program = createSimpleProgram();
      const order = getExecutionOrder(program);

      // Input node should come before output node
      const inputIndex = order.indexOf('input');
      const outputIndex = order.indexOf('output');
      expect(inputIndex).toBeLessThan(outputIndex);
    });

    it('should handle large programs', () => {
      const program = createLargeProgram(20);
      const order = getExecutionOrder(program);

      expect(order.length).toBe(20);
    });

    it('should handle program with multiple branches', () => {
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
            id: 'branch1',
            type: IOCIntentType.CONSTANT,
            inputs: ['input'],
            params: { intent: 'constant', value: 1 },
            capability: {
              maxComplexity: ComplexityClass.CONSTANT,
              terminationGuarantee: 'structural',
              sideEffects: 'pure',
              parallelizable: true,
            },
          },
          {
            id: 'branch2',
            type: IOCIntentType.CONSTANT,
            inputs: ['input'],
            params: { intent: 'constant', value: 2 },
            capability: {
              maxComplexity: ComplexityClass.CONSTANT,
              terminationGuarantee: 'structural',
              sideEffects: 'pure',
              parallelizable: true,
            },
          },
        ],
        outputs: ['branch1', 'branch2'],
        metadata: { name: 'branches' },
      };

      const order = getExecutionOrder(program);
      const inputIndex = order.indexOf('input');
      const branch1Index = order.indexOf('branch1');
      const branch2Index = order.indexOf('branch2');

      expect(inputIndex).toBeLessThan(branch1Index);
      expect(inputIndex).toBeLessThan(branch2Index);
    });
  });

  describe('calculateNodeCapability', () => {
    it('should calculate capability for input node', () => {
      const node: any = {
        id: 'test',
        type: IOCIntentType.INPUT,
        inputs: [],
        params: { intent: 'input', name: 'data' },
      };

      const capability = calculateNodeCapability(node);

      expect(capability.maxComplexity).toBe(ComplexityClass.CONSTANT);
      expect(capability.terminationGuarantee).toBe('structural');
      expect(capability.sideEffects).toBe('pure');
      expect(capability.parallelizable).toBe(true);
    });

    it('should calculate capability for constant node', () => {
      const node: any = {
        id: 'test',
        type: IOCIntentType.CONSTANT,
        inputs: [],
        params: { intent: 'constant', value: 42 },
      };

      const capability = calculateNodeCapability(node);

      expect(capability.maxComplexity).toBe(ComplexityClass.CONSTANT);
    });

    it('should calculate capability for filter node', () => {
      const node: any = {
        id: 'test',
        type: IOCIntentType.FILTER,
        inputs: ['input'],
        params: {
          intent: 'filter',
          predicate: { type: 'always', value: true },
        },
      };

      const capability = calculateNodeCapability(node);

      expect(capability.parallelizable).toBe(true);
    });

    it('should calculate capability for map node', () => {
      const node: any = {
        id: 'test',
        type: IOCIntentType.MAP,
        inputs: ['input'],
        params: {
          intent: 'map',
          transform: { type: 'identity' },
        },
      };

      const capability = calculateNodeCapability(node);

      expect(capability.parallelizable).toBe(true);
    });

    it('should calculate capability for reduce node', () => {
      const node: any = {
        id: 'test',
        type: IOCIntentType.REDUCE,
        inputs: ['input'],
        params: {
          intent: 'reduce',
          operation: { type: 'sum' },
        },
      };

      const capability = calculateNodeCapability(node);

      expect(capability.maxComplexity).toBe(ComplexityClass.LINEAR);
      expect(capability.parallelizable).toBe(false);
    });

    it('should calculate capability for sort node', () => {
      const node: any = {
        id: 'test',
        type: IOCIntentType.SORT,
        inputs: ['input'],
        params: {
          intent: 'sort',
        },
      };

      const capability = calculateNodeCapability(node);

      expect(capability.maxComplexity).toBe(ComplexityClass.LINEARITHMIC);
      expect(capability.terminationGuarantee).toBe('bounded');
    });

    it('should calculate capability for distinct node', () => {
      const node: any = {
        id: 'test',
        type: IOCIntentType.DISTINCT,
        inputs: ['input'],
        params: {
          intent: 'distinct',
        },
      };

      const capability = calculateNodeCapability(node);

      expect(capability.maxComplexity).toBe(ComplexityClass.LINEAR);
    });

    it('should calculate capability for flatten node', () => {
      const node: any = {
        id: 'test',
        type: IOCIntentType.FLATTEN,
        inputs: ['input'],
        params: {
          intent: 'flatten',
          depth: 1,
        },
      };

      const capability = calculateNodeCapability(node);

      expect(capability.maxComplexity).toBe(ComplexityClass.LINEAR);
    });

    it('should calculate capability for slice node', () => {
      const node: any = {
        id: 'test',
        type: IOCIntentType.SLICE,
        inputs: ['input'],
        params: {
          intent: 'slice',
          start: 0,
          end: 10,
        },
      };

      const capability = calculateNodeCapability(node);

      expect(capability.maxComplexity).toBe(ComplexityClass.LINEAR);
    });

    it('should calculate capability for concat node', () => {
      const node: any = {
        id: 'test',
        type: IOCIntentType.CONCAT,
        inputs: ['input1', 'input2'],
        params: {
          intent: 'concat',
        },
      };

      const capability = calculateNodeCapability(node);

      expect(capability.maxComplexity).toBe(ComplexityClass.LINEAR);
    });

    it('should calculate capability for group_by node', () => {
      const node: any = {
        id: 'test',
        type: IOCIntentType.GROUP_BY,
        inputs: ['input'],
        params: {
          intent: 'group_by',
          keyTransform: { type: 'identity' },
        },
      };

      const capability = calculateNodeCapability(node);

      expect(capability.maxComplexity).toBe(ComplexityClass.LINEAR);
    });

    it('should calculate capability for join node', () => {
      const node: any = {
        id: 'test',
        type: IOCIntentType.JOIN,
        inputs: ['left', 'right'],
        params: {
          intent: 'join',
          leftKey: { type: 'identity' },
          rightKey: { type: 'identity' },
        },
      };

      const capability = calculateNodeCapability(node);

      expect(capability.maxComplexity).toBe(ComplexityClass.QUADRATIC);
    });
  });
});
