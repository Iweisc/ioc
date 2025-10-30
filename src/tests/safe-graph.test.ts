/**
 * SafeGraph and SafeTypes tests
 */

import { describe, it, expect } from 'vitest';
import { SafeGraph } from '../dsl/safe-graph';
import { ComplexityClass } from '../dsl/safe-types';

describe('SafeGraph', () => {
  describe('Input Nodes', () => {
    it('should create input node', () => {
      const graph = new SafeGraph('test');
      const inputId = graph.input('data', 'number[]');

      const node = graph.getNode(inputId);
      expect(node).toBeDefined();
      expect(node!.type).toBe('input');
      expect(node!.capability.maxComplexity).toBe(ComplexityClass.CONSTANT);
    });

    it('should create multiple input nodes', () => {
      const graph = new SafeGraph('test');
      const input1 = graph.input('data1');
      const input2 = graph.input('data2');

      expect(input1).not.toBe(input2);
      expect(graph.getNode(input1)).toBeDefined();
      expect(graph.getNode(input2)).toBeDefined();
    });
  });

  describe('Constant Nodes', () => {
    it('should create constant node with number', () => {
      const graph = new SafeGraph();
      const constId = graph.constant(42);

      const node = graph.getNode(constId);
      expect(node).toBeDefined();
      expect(node!.type).toBe('constant');
    });

    it('should create constant node with string', () => {
      const graph = new SafeGraph();
      const constId = graph.constant('hello');

      const node = graph.getNode(constId);
      expect(node).toBeDefined();
    });

    it('should create constant node with array', () => {
      const graph = new SafeGraph();
      const constId = graph.constant([1, 2, 3]);

      const node = graph.getNode(constId);
      expect(node).toBeDefined();
    });

    it('should create constant node with object', () => {
      const graph = new SafeGraph();
      const constId = graph.constant({ key: 'value' });

      const node = graph.getNode(constId);
      expect(node).toBeDefined();
    });
  });

  describe('Filter Operations', () => {
    it('should filter with comparison predicate', () => {
      const graph = new SafeGraph();
      const inputId = graph.input('numbers');
      const filterId = graph.filter(inputId, {
        type: 'compare',
        op: 'gt',
        value: 10,
      });

      graph.output(filterId);

      const compiledFn = graph.compile();
      const result = compiledFn([5, 15, 8, 20]);

      expect(result).toEqual([15, 20]);
    });

    it('should filter with all comparison operators', () => {
      const testCases = [
        { op: 'gt' as const, value: 5, input: [3, 7, 5], expected: [7] },
        { op: 'lt' as const, value: 5, input: [3, 7, 5], expected: [3] },
        { op: 'gte' as const, value: 5, input: [3, 7, 5], expected: [7, 5] },
        { op: 'lte' as const, value: 5, input: [3, 7, 5], expected: [3, 5] },
        { op: 'eq' as const, value: 5, input: [3, 7, 5], expected: [5] },
        { op: 'ne' as const, value: 5, input: [3, 7, 5], expected: [3, 7] },
      ];

      testCases.forEach(({ op, value, input, expected }) => {
        const graph = new SafeGraph();
        const inputId = graph.input('data');
        const filterId = graph.filter(inputId, {
          type: 'compare',
          op,
          value,
        });
        graph.output(filterId);

        const compiledFn = graph.compile();
        const result = compiledFn(input);

        expect(result).toEqual(expected);
      });
    });

    it('should filter with property comparison', () => {
      const graph = new SafeGraph();
      const inputId = graph.input('users');
      const filterId = graph.filter(inputId, {
        type: 'compare_property',
        op: 'gte',
        property: 'age',
        value: 18,
      });

      graph.output(filterId);

      const compiledFn = graph.compile();
      const users = [
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 15 },
        { name: 'Charlie', age: 30 },
      ];

      const result = compiledFn(users);
      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Alice');
      expect(result[1].name).toBe('Charlie');
    });

    it('should filter with AND predicate', () => {
      const graph = new SafeGraph();
      const inputId = graph.input('numbers');
      const filterId = graph.filter(inputId, {
        type: 'and',
        predicates: [
          { type: 'compare', op: 'gt', value: 5 },
          { type: 'compare', op: 'lt', value: 15 },
        ],
      });

      graph.output(filterId);

      const compiledFn = graph.compile();
      const result = compiledFn([3, 8, 12, 20]);

      expect(result).toEqual([8, 12]);
    });

    it('should filter with OR predicate', () => {
      const graph = new SafeGraph();
      const inputId = graph.input('numbers');
      const filterId = graph.filter(inputId, {
        type: 'or',
        predicates: [
          { type: 'compare', op: 'lt', value: 5 },
          { type: 'compare', op: 'gt', value: 15 },
        ],
      });

      graph.output(filterId);

      const compiledFn = graph.compile();
      const result = compiledFn([3, 8, 12, 20]);

      expect(result).toEqual([3, 20]);
    });

    it('should filter with NOT predicate', () => {
      const graph = new SafeGraph();
      const inputId = graph.input('numbers');
      const filterId = graph.filter(inputId, {
        type: 'not',
        predicate: { type: 'compare', op: 'gt', value: 10 },
      });

      graph.output(filterId);

      const compiledFn = graph.compile();
      const result = compiledFn([5, 15, 8, 20]);

      expect(result).toEqual([5, 8]);
    });

    it('should filter with type check predicate', () => {
      const graph = new SafeGraph();
      const inputId = graph.input('data');
      const filterId = graph.filter(inputId, {
        type: 'type_check',
        expectedType: 'number',
      });

      graph.output(filterId);

      const compiledFn = graph.compile();
      const result = compiledFn([1, 'hello', 2, null, 3]);

      expect(result).toEqual([1, 2, 3]);
    });
  });

  describe('Map Operations', () => {
    it('should map with arithmetic transform', () => {
      const graph = new SafeGraph();
      const inputId = graph.input('numbers');
      const mapId = graph.map(inputId, {
        type: 'arithmetic',
        op: 'multiply',
        operand: 2,
      });

      graph.output(mapId);

      const compiledFn = graph.compile();
      const result = compiledFn([1, 2, 3]);

      expect(result).toEqual([2, 4, 6]);
    });

    it('should map with all arithmetic operations', () => {
      const testCases = [
        { op: 'add' as const, operand: 5, input: [1, 2, 3], expected: [6, 7, 8] },
        { op: 'subtract' as const, operand: 5, input: [10, 20, 30], expected: [5, 15, 25] },
        { op: 'multiply' as const, operand: 3, input: [1, 2, 3], expected: [3, 6, 9] },
        { op: 'divide' as const, operand: 2, input: [10, 20, 30], expected: [5, 10, 15] },
        { op: 'modulo' as const, operand: 3, input: [10, 11, 12], expected: [1, 2, 0] },
      ];

      testCases.forEach(({ op, operand, input, expected }) => {
        const graph = new SafeGraph();
        const inputId = graph.input('data');
        const mapId = graph.map(inputId, {
          type: 'arithmetic',
          op,
          operand,
        });
        graph.output(mapId);

        const compiledFn = graph.compile();
        const result = compiledFn(input);

        expect(result).toEqual(expected);
      });
    });

    it('should map with property transform', () => {
      const graph = new SafeGraph();
      const inputId = graph.input('users');
      const mapId = graph.map(inputId, {
        type: 'property',
        path: ['name'],
      });

      graph.output(mapId);

      const compiledFn = graph.compile();
      const users = [
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 30 },
      ];

      const result = compiledFn(users);
      expect(result).toEqual(['Alice', 'Bob']);
    });

    it('should map with nested property transform', () => {
      const graph = new SafeGraph();
      const inputId = graph.input('data');
      const mapId = graph.map(inputId, {
        type: 'property',
        path: ['user', 'name'],
      });

      graph.output(mapId);

      const compiledFn = graph.compile();
      const data = [
        { user: { name: 'Alice', age: 25 } },
        { user: { name: 'Bob', age: 30 } },
      ];

      const result = compiledFn(data);
      expect(result).toEqual(['Alice', 'Bob']);
    });

    it('should map with string transform - uppercase', () => {
      const graph = new SafeGraph();
      const inputId = graph.input('words');
      const mapId = graph.map(inputId, {
        type: 'string',
        op: 'uppercase',
      });

      graph.output(mapId);

      const compiledFn = graph.compile();
      const result = compiledFn(['hello', 'world']);

      expect(result).toEqual(['HELLO', 'WORLD']);
    });

    it('should map with string transform - lowercase', () => {
      const graph = new SafeGraph();
      const inputId = graph.input('words');
      const mapId = graph.map(inputId, {
        type: 'string',
        op: 'lowercase',
      });

      graph.output(mapId);

      const compiledFn = graph.compile();
      const result = compiledFn(['HELLO', 'WORLD']);

      expect(result).toEqual(['hello', 'world']);
    });

    it('should map with string transform - trim', () => {
      const graph = new SafeGraph();
      const inputId = graph.input('words');
      const mapId = graph.map(inputId, {
        type: 'string',
        op: 'trim',
      });

      graph.output(mapId);

      const compiledFn = graph.compile();
      const result = compiledFn(['  hello  ', '  world  ']);

      expect(result).toEqual(['hello', 'world']);
    });

    it('should map with identity transform', () => {
      const graph = new SafeGraph();
      const inputId = graph.input('data');
      const mapId = graph.map(inputId, {
        type: 'identity',
      });

      graph.output(mapId);

      const compiledFn = graph.compile();
      const result = compiledFn([1, 2, 3]);

      expect(result).toEqual([1, 2, 3]);
    });

    it('should map with constant transform', () => {
      const graph = new SafeGraph();
      const inputId = graph.input('data');
      const mapId = graph.map(inputId, {
        type: 'constant',
        value: 42,
      });

      graph.output(mapId);

      const compiledFn = graph.compile();
      const result = compiledFn([1, 2, 3]);

      expect(result).toEqual([42, 42, 42]);
    });
  });

  describe('Reduce Operations', () => {
    it('should reduce with sum', () => {
      const graph = new SafeGraph();
      const inputId = graph.input('numbers');
      const reduceId = graph.reduce(inputId, { type: 'sum' });

      graph.output(reduceId);

      const compiledFn = graph.compile();
      const result = compiledFn([1, 2, 3, 4]);

      expect(result).toBe(10);
    });

    it('should reduce with product', () => {
      const graph = new SafeGraph();
      const inputId = graph.input('numbers');
      const reduceId = graph.reduce(inputId, { type: 'product' });

      graph.output(reduceId);

      const compiledFn = graph.compile();
      const result = compiledFn([2, 3, 4]);

      expect(result).toBe(24);
    });

    it('should reduce with max', () => {
      const graph = new SafeGraph();
      const inputId = graph.input('numbers');
      const reduceId = graph.reduce(inputId, { type: 'max' });

      graph.output(reduceId);

      const compiledFn = graph.compile();
      const result = compiledFn([3, 7, 2, 9, 1]);

      expect(result).toBe(9);
    });

    it('should reduce with min', () => {
      const graph = new SafeGraph();
      const inputId = graph.input('numbers');
      const reduceId = graph.reduce(inputId, { type: 'min' });

      graph.output(reduceId);

      const compiledFn = graph.compile();
      const result = compiledFn([3, 7, 2, 9, 1]);

      expect(result).toBe(1);
    });

    it('should reduce with average', () => {
      const graph = new SafeGraph();
      const inputId = graph.input('numbers');
      const reduceId = graph.reduce(inputId, { type: 'average' });

      graph.output(reduceId);

      const compiledFn = graph.compile();
      const result = compiledFn([1, 2, 3, 4, 5]);

      expect(result).toBe(3);
    });

    it('should reduce with count', () => {
      const graph = new SafeGraph();
      const inputId = graph.input('numbers');
      const reduceId = graph.reduce(inputId, { type: 'count' });

      graph.output(reduceId);

      const compiledFn = graph.compile();
      const result = compiledFn([1, 2, 3, 4, 5]);

      expect(result).toBe(5);
    });

    it('should reduce with first', () => {
      const graph = new SafeGraph();
      const inputId = graph.input('numbers');
      const reduceId = graph.reduce(inputId, { type: 'first' });

      graph.output(reduceId);

      const compiledFn = graph.compile();
      const result = compiledFn([1, 2, 3, 4, 5]);

      expect(result).toBe(1);
    });

    it('should reduce with last', () => {
      const graph = new SafeGraph();
      const inputId = graph.input('numbers');
      const reduceId = graph.reduce(inputId, { type: 'last' });

      graph.output(reduceId);

      const compiledFn = graph.compile();
      const result = compiledFn([1, 2, 3, 4, 5]);

      expect(result).toBe(5);
    });
  });

  describe('Complex Pipelines', () => {
    it('should handle filter-map-reduce pipeline', () => {
      const graph = new SafeGraph('pipeline');
      const inputId = graph.input('numbers');

      const filterId = graph.filter(inputId, {
        type: 'compare',
        op: 'gt',
        value: 0,
      });

      const mapId = graph.map(filterId, {
        type: 'arithmetic',
        op: 'multiply',
        operand: 2,
      });

      const reduceId = graph.reduce(mapId, { type: 'sum' });

      graph.output(reduceId);

      const compiledFn = graph.compile();
      const result = compiledFn([1, -2, 3, -4, 5]);

      // Filter: [1, 3, 5]
      // Map *2: [2, 6, 10]
      // Sum: 18
      expect(result).toBe(18);
    });

    it('should handle multiple filters in sequence', () => {
      const graph = new SafeGraph();
      const inputId = graph.input('numbers');

      const filter1 = graph.filter(inputId, {
        type: 'compare',
        op: 'gt',
        value: 5,
      });

      const filter2 = graph.filter(filter1, {
        type: 'compare',
        op: 'lt',
        value: 15,
      });

      graph.output(filter2);

      const compiledFn = graph.compile();
      const result = compiledFn([3, 8, 12, 20]);

      expect(result).toEqual([8, 12]);
    });

    it('should handle multiple maps in sequence', () => {
      const graph = new SafeGraph();
      const inputId = graph.input('numbers');

      const map1 = graph.map(inputId, {
        type: 'arithmetic',
        op: 'add',
        operand: 5,
      });

      const map2 = graph.map(map1, {
        type: 'arithmetic',
        op: 'multiply',
        operand: 2,
      });

      graph.output(map2);

      const compiledFn = graph.compile();
      const result = compiledFn([1, 2, 3]);

      // Add 5: [6, 7, 8]
      // Multiply 2: [12, 14, 16]
      expect(result).toEqual([12, 14, 16]);
    });

    it('should handle object filtering and property extraction', () => {
      const graph = new SafeGraph();
      const inputId = graph.input('users');

      const filterId = graph.filter(inputId, {
        type: 'compare_property',
        op: 'gte',
        property: 'age',
        value: 18,
      });

      const mapId = graph.map(filterId, {
        type: 'property',
        path: ['name'],
      });

      graph.output(mapId);

      const compiledFn = graph.compile();
      const users = [
        { name: 'Alice', age: 25 },
        { name: 'Bob', age: 15 },
        { name: 'Charlie', age: 30 },
      ];

      const result = compiledFn(users);
      expect(result).toEqual(['Alice', 'Charlie']);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty arrays', () => {
      const graph = new SafeGraph();
      const inputId = graph.input('data');
      const mapId = graph.map(inputId, {
        type: 'arithmetic',
        op: 'multiply',
        operand: 2,
      });

      graph.output(mapId);

      const compiledFn = graph.compile();
      const result = compiledFn([]);

      expect(result).toEqual([]);
    });

    it('should handle single element arrays', () => {
      const graph = new SafeGraph();
      const inputId = graph.input('data');
      const reduceId = graph.reduce(inputId, { type: 'sum' });

      graph.output(reduceId);

      const compiledFn = graph.compile();
      const result = compiledFn([42]);

      expect(result).toBe(42);
    });

    it('should handle filter that removes all elements', () => {
      const graph = new SafeGraph();
      const inputId = graph.input('numbers');
      const filterId = graph.filter(inputId, {
        type: 'compare',
        op: 'gt',
        value: 100,
      });

      graph.output(filterId);

      const compiledFn = graph.compile();
      const result = compiledFn([1, 2, 3, 4, 5]);

      expect(result).toEqual([]);
    });

    it('should handle division by zero gracefully', () => {
      const graph = new SafeGraph();
      const inputId = graph.input('numbers');
      const mapId = graph.map(inputId, {
        type: 'arithmetic',
        op: 'divide',
        operand: 0,
      });

      graph.output(mapId);

      const compiledFn = graph.compile();
      const result = compiledFn([10, 20, 30]);

      expect(result.every((x: number) => !isFinite(x))).toBe(true);
    });
  });

  describe('Serialization', () => {
    it('should serialize simple graph to JSON', () => {
      const graph = new SafeGraph('test');
      const inputId = graph.input('data');
      const mapId = graph.map(inputId, {
        type: 'arithmetic',
        op: 'multiply',
        operand: 2,
      });
      graph.output(mapId);

      const json = graph.toJSON();
      expect(json).toBeDefined();
      expect(json.nodes).toBeDefined();
      expect(json.outputs).toBeDefined();
    });

    it('should serialize and deserialize graph', () => {
      const graph = new SafeGraph('test');
      const inputId = graph.input('numbers');
      const filterId = graph.filter(inputId, {
        type: 'compare',
        op: 'gt',
        value: 5,
      });
      graph.output(filterId);

      const json = graph.toJSON();
      const restored = SafeGraph.fromJSON(json);

      const compiledOriginal = graph.compile();
      const compiledRestored = restored.compile();

      const testData = [1, 3, 7, 9];
      expect(compiledRestored(testData)).toEqual(compiledOriginal(testData));
    });
  });
});
// Additional tests for toJSON, fromProgram, and fromJSON methods
describe('SafeGraph Serialization', () => {
  describe('toJSON', () => {
    it('should serialize graph to IOCProgram format', () => {
      const graph = new SafeGraph('test-graph');
      const input = graph.input('numbers');
      const filtered = graph.filter(input, Predicate.gt(10));
      graph.output(filtered);

      const json = graph.toJSON();

      expect(json).toHaveProperty('version');
      expect(json).toHaveProperty('metadata');
      expect(json).toHaveProperty('nodes');
      expect(json).toHaveProperty('outputs');
      expect(json.metadata?.name).toBe('test-graph');
      expect(json.nodes).toHaveLength(2);
      expect(json.outputs).toHaveLength(1);
    });

    it('should include all node details in serialization', () => {
      const graph = new SafeGraph();
      const input = graph.input('data');
      const mapped = graph.map(input, Transform.multiply(2));
      graph.output(mapped);

      const json = graph.toJSON();

      expect(json.nodes[0]).toHaveProperty('id');
      expect(json.nodes[0]).toHaveProperty('type');
      expect(json.nodes[0]).toHaveProperty('inputs');
      expect(json.nodes[0]).toHaveProperty('params');
      expect(json.nodes[0]).toHaveProperty('capability');
    });

    it('should serialize complex graphs correctly', () => {
      const graph = new SafeGraph('complex-pipeline');
      const input = graph.input('data');
      const filtered = graph.filter(input, Predicate.gt(5));
      const mapped = graph.map(filtered, Transform.multiply(3));
      const reduced = graph.reduce(mapped, Reduce.sum());
      graph.output(reduced);

      const json = graph.toJSON();

      expect(json.nodes).toHaveLength(4);
      expect(json.outputs).toHaveLength(1);
      expect(json.metadata?.name).toBe('complex-pipeline');
    });

    it('should preserve metadata in serialization', () => {
      const graph = new SafeGraph('metadata-test');
      const input = graph.input('x');
      graph.output(input);

      const json = graph.toJSON();

      expect(json.metadata).toHaveProperty('name', 'metadata-test');
      expect(json.metadata).toHaveProperty('created');
      expect(json.metadata).toHaveProperty('modified');
    });
  });

  describe('fromProgram', () => {
    it('should reconstruct graph from IOCProgram', () => {
      const originalGraph = new SafeGraph('test');
      const input = originalGraph.input('data');
      const filtered = originalGraph.filter(input, Predicate.lt(100));
      originalGraph.output(filtered);

      const program = originalGraph.toProgram();
      const reconstructed = SafeGraph.fromProgram(program);

      expect(reconstructed).toBeInstanceOf(SafeGraph);
      expect(reconstructed.toJSON()).toEqual(program);
    });

    it('should preserve all nodes from program', () => {
      const program: IOCProgram = {
        version: '1.0.0',
        metadata: { name: 'preserved-test' },
        nodes: [
          {
            id: 'input_1',
            type: IOCIntentType.INPUT,
            inputs: [],
            params: { intent: 'input', name: 'x' },
            capability: {
              maxComplexity: ComplexityClass.CONSTANT,
              terminationGuarantee: 'structural',
              sideEffects: 'pure',
              parallelizable: true,
              memoryBound: 'O(1)',
            },
          },
          {
            id: 'filter_1',
            type: IOCIntentType.FILTER,
            inputs: ['input_1'],
            params: {
              intent: 'filter',
              predicate: { type: 'compare', op: 'gt', value: 0 },
            },
            capability: {
              maxComplexity: ComplexityClass.LINEAR,
              terminationGuarantee: 'structural',
              sideEffects: 'pure',
              parallelizable: true,
              memoryBound: 'O(n)',
            },
          },
        ],
        outputs: ['filter_1'],
        options: { optimizationLevel: 'basic', targetRuntime: 'javascript' },
      };

      const graph = SafeGraph.fromProgram(program);
      const reconstructed = graph.toProgram();

      expect(reconstructed.nodes).toHaveLength(2);
      expect(reconstructed.outputs).toEqual(['filter_1']);
      expect(reconstructed.metadata?.name).toBe('preserved-test');
    });

    it('should handle programs without metadata', () => {
      const program: IOCProgram = {
        version: '1.0.0',
        nodes: [],
        outputs: [],
        options: { optimizationLevel: 'basic', targetRuntime: 'javascript' },
      };

      const graph = SafeGraph.fromProgram(program);

      expect(graph).toBeInstanceOf(SafeGraph);
      expect(graph.toJSON().metadata?.name).toBe('imported');
    });

    it('should preserve output node references', () => {
      const program: IOCProgram = {
        version: '1.0.0',
        nodes: [
          {
            id: 'node_a',
            type: IOCIntentType.INPUT,
            inputs: [],
            params: { intent: 'input', name: 'a' },
            capability: {
              maxComplexity: ComplexityClass.CONSTANT,
              terminationGuarantee: 'structural',
              sideEffects: 'pure',
              parallelizable: true,
              memoryBound: 'O(1)',
            },
          },
          {
            id: 'node_b',
            type: IOCIntentType.INPUT,
            inputs: [],
            params: { intent: 'input', name: 'b' },
            capability: {
              maxComplexity: ComplexityClass.CONSTANT,
              terminationGuarantee: 'structural',
              sideEffects: 'pure',
              parallelizable: true,
              memoryBound: 'O(1)',
            },
          },
        ],
        outputs: ['node_a', 'node_b'],
        options: { optimizationLevel: 'basic', targetRuntime: 'javascript' },
      };

      const graph = SafeGraph.fromProgram(program);
      const result = graph.toProgram();

      expect(result.outputs).toEqual(['node_a', 'node_b']);
    });
  });

  describe('fromJSON', () => {
    it('should reconstruct graph from JSON string', () => {
      const originalGraph = new SafeGraph('json-test');
      const input = originalGraph.input('values');
      const mapped = originalGraph.map(input, Transform.add(10));
      originalGraph.output(mapped);

      const jsonString = JSON.stringify(originalGraph.toJSON());
      const reconstructed = SafeGraph.fromJSON(jsonString);

      expect(reconstructed).toBeInstanceOf(SafeGraph);
      expect(reconstructed.toJSON()).toEqual(JSON.parse(jsonString));
    });

    it('should accept IOCProgram object directly', () => {
      const program: IOCProgram = {
        version: '1.0.0',
        metadata: { name: 'direct-program' },
        nodes: [
          {
            id: 'input_x',
            type: IOCIntentType.INPUT,
            inputs: [],
            params: { intent: 'input', name: 'x' },
            capability: {
              maxComplexity: ComplexityClass.CONSTANT,
              terminationGuarantee: 'structural',
              sideEffects: 'pure',
              parallelizable: true,
              memoryBound: 'O(1)',
            },
          },
        ],
        outputs: ['input_x'],
        options: { optimizationLevel: 'basic', targetRuntime: 'javascript' },
      };

      const graph = SafeGraph.fromJSON(program);

      expect(graph).toBeInstanceOf(SafeGraph);
      expect(graph.toJSON().metadata?.name).toBe('direct-program');
    });

    it('should handle round-trip serialization', () => {
      const graph1 = new SafeGraph('round-trip');
      const input = graph1.input('data');
      const filtered = graph1.filter(input, Predicate.gte(10));
      const sorted = graph1.sort(filtered, undefined, false);
      graph1.output(sorted);

      const json = JSON.stringify(graph1.toJSON());
      const graph2 = SafeGraph.fromJSON(json);
      const json2 = JSON.stringify(graph2.toJSON());

      expect(json).toBe(json2);
    });

    it('should preserve complex predicates and transforms', () => {
      const graph = new SafeGraph('complex-ops');
      const input = graph.input('items');
      const filtered = graph.filter(
        input,
        Predicate.and(Predicate.gt(5), Predicate.lt(100))
      );
      const mapped = graph.map(filtered, Transform.multiply(2));
      graph.output(mapped);

      const jsonString = JSON.stringify(graph.toJSON());
      const reconstructed = SafeGraph.fromJSON(jsonString);
      const program = reconstructed.toJSON();

      const filterNode = program.nodes.find((n) => n.type === IOCIntentType.FILTER);
      expect(filterNode).toBeDefined();
      expect(filterNode?.params).toHaveProperty('predicate');
    });
  });

  describe('Serialization edge cases', () => {
    it('should handle empty graphs', () => {
      const graph = new SafeGraph('empty');
      const json = graph.toJSON();

      expect(json.nodes).toEqual([]);
      expect(json.outputs).toEqual([]);
    });

    it('should handle graphs with only inputs', () => {
      const graph = new SafeGraph('inputs-only');
      graph.input('a');
      graph.input('b');

      const json = graph.toJSON();

      expect(json.nodes).toHaveLength(2);
      expect(json.outputs).toEqual([]);
    });

    it('should handle graphs with constants', () => {
      const graph = new SafeGraph('with-constants');
      const const1 = graph.constant(42);
      const const2 = graph.constant('hello');
      graph.output(const1);
      graph.output(const2);

      const json = graph.toJSON();
      const reconstructed = SafeGraph.fromJSON(json);

      expect(reconstructed.toJSON().nodes).toHaveLength(2);
    });

    it('should preserve node IDs during serialization', () => {
      const graph = new SafeGraph('id-preservation');
      const input = graph.input('x');
      const mapped = graph.map(input, Transform.multiply(2));
      graph.output(mapped);

      const json1 = graph.toJSON();
      const nodeIds1 = json1.nodes.map((n) => n.id);

      const reconstructed = SafeGraph.fromJSON(json1);
      const json2 = reconstructed.toJSON();
      const nodeIds2 = json2.nodes.map((n) => n.id);

      expect(nodeIds1).toEqual(nodeIds2);
    });
  });

  describe('Integration with compile', () => {
    it('should compile reconstructed graphs successfully', () => {
      const originalGraph = new SafeGraph('compilable');
      const input = originalGraph.input('numbers');
      const filtered = originalGraph.filter(input, Predicate.gt(5));
      const mapped = originalGraph.map(filtered, Transform.multiply(2));
      originalGraph.output(mapped);

      const jsonString = JSON.stringify(originalGraph.toJSON());
      const reconstructed = SafeGraph.fromJSON(jsonString);
      const compiled = reconstructed.compile();

      const result = compiled([1, 3, 6, 8, 10]);
      expect(result).toEqual([12, 16, 20]);
    });

    it('should execute reconstructed graphs identically to originals', () => {
      const graph1 = new SafeGraph('original');
      const input1 = graph1.input('data');
      const reduced1 = graph1.reduce(input1, Reduce.sum());
      graph1.output(reduced1);

      const compiled1 = graph1.compile();
      const result1 = compiled1([10, 20, 30]);

      const json = JSON.stringify(graph1.toJSON());
      const graph2 = SafeGraph.fromJSON(json);
      const compiled2 = graph2.compile();
      const result2 = compiled2([10, 20, 30]);

      expect(result1).toBe(result2);
      expect(result2).toBe(60);
    });
  });
});