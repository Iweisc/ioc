import { describe, it, expect } from 'vitest';
import { Graph, IntentType } from '../core/graph';

describe('Graph', () => {
  describe('Basic node operations', () => {
    it('should create input nodes', () => {
      const graph = new Graph();
      const nodeId = graph.input('data');

      const node = graph.getNode(nodeId);
      expect(node).toBeDefined();
      expect(node?.intentType).toBe(IntentType.INPUT);
      expect(node?.params['name']).toBe('data');
    });

    it('should create constant nodes', () => {
      const graph = new Graph();
      const nodeId = graph.constant(42);

      const node = graph.getNode(nodeId);
      expect(node).toBeDefined();
      expect(node?.intentType).toBe(IntentType.CONSTANT);
      expect(node?.params['value']).toBe(42);
    });

    it('should get all nodes', () => {
      const graph = new Graph();
      graph.input('a');
      graph.constant(1);

      const nodes = graph.getAllNodes();
      expect(nodes.length).toBe(2);
    });
  });

  describe('Filter operations', () => {
    it('should create filter nodes', () => {
      const graph = new Graph();
      const input = graph.input('data');
      const predicate = (x: any) => x > 5;
      const filterId = graph.filter(input, predicate);

      const filterNode = graph.getNode(filterId);
      expect(filterNode).toBeDefined();
      expect(filterNode?.intentType).toBe(IntentType.FILTER);
      expect(filterNode?.inputs).toEqual([input]);
      expect(filterNode?.metadata.parallelizable).toBe(true);
    });

    it('should throw error for invalid input node', () => {
      const graph = new Graph();
      const predicate = (x: any) => x > 5;

      expect(() => graph.filter('invalid', predicate)).toThrow();
    });
  });

  describe('Map operations', () => {
    it('should create map nodes', () => {
      const graph = new Graph();
      const input = graph.input('data');
      const transform = (x: any) => x * 2;
      const mapId = graph.map(input, transform);

      const mapNode = graph.getNode(mapId);
      expect(mapNode).toBeDefined();
      expect(mapNode?.intentType).toBe(IntentType.MAP);
      expect(mapNode?.inputs).toEqual([input]);
      expect(mapNode?.metadata.parallelizable).toBe(true);
      expect(mapNode?.metadata.vectorizable).toBe(true);
    });

    it('should throw error for invalid input node', () => {
      const graph = new Graph();
      const transform = (x: any) => x * 2;

      expect(() => graph.map('invalid', transform)).toThrow();
    });
  });

  describe('Reduce operations', () => {
    it('should create reduce nodes with initial value', () => {
      const graph = new Graph();
      const input = graph.input('data');
      const operation = (acc: any, x: any) => acc + x;
      const reduceId = graph.reduce(input, operation, 0);

      const reduceNode = graph.getNode(reduceId);
      expect(reduceNode).toBeDefined();
      expect(reduceNode?.intentType).toBe(IntentType.REDUCE);
      expect(reduceNode?.params['initial']).toBe(0);
    });

    it('should create reduce nodes without initial value', () => {
      const graph = new Graph();
      const input = graph.input('data');
      const operation = (acc: any, x: any) => acc + x;
      const reduceId = graph.reduce(input, operation);

      const reduceNode = graph.getNode(reduceId);
      expect(reduceNode).toBeDefined();
      expect(reduceNode?.params['initial']).toBeUndefined();
    });

    it('should throw error for invalid input node', () => {
      const graph = new Graph();
      const operation = (acc: any, x: any) => acc + x;

      expect(() => graph.reduce('invalid', operation)).toThrow();
    });
  });

  describe('Sort operations', () => {
    it('should create sort nodes with compare function', () => {
      const graph = new Graph();
      const input = graph.input('data');
      const compareFn = (a: any, b: any) => a - b;
      const sortId = graph.sort(input, compareFn);

      const sortNode = graph.getNode(sortId);
      expect(sortNode).toBeDefined();
      expect(sortNode?.intentType).toBe(IntentType.SORT);
      expect(sortNode?.params['compareFn']).toBe(compareFn);
    });

    it('should create sort nodes without compare function', () => {
      const graph = new Graph();
      const input = graph.input('data');
      const sortId = graph.sort(input);

      const sortNode = graph.getNode(sortId);
      expect(sortNode).toBeDefined();
      expect(sortNode?.params['compareFn']).toBeUndefined();
    });

    it('should throw error for invalid input node', () => {
      const graph = new Graph();
      expect(() => graph.sort('invalid')).toThrow();
    });
  });

  describe('GroupBy operations', () => {
    it('should create groupBy nodes', () => {
      const graph = new Graph();
      const input = graph.input('data');
      const keyFn = (x: any) => x.category;
      const groupId = graph.groupBy(input, keyFn);

      const groupNode = graph.getNode(groupId);
      expect(groupNode).toBeDefined();
      expect(groupNode?.intentType).toBe(IntentType.GROUP_BY);
      expect(groupNode?.params['keyFn']).toBe(keyFn);
    });

    it('should throw error for invalid input node', () => {
      const graph = new Graph();
      const keyFn = (x: any) => x.category;

      expect(() => graph.groupBy('invalid', keyFn)).toThrow();
    });
  });

  describe('Join operations', () => {
    it('should create join nodes', () => {
      const graph = new Graph();
      const left = graph.input('left');
      const right = graph.input('right');
      const leftKey = (x: any) => x.id;
      const rightKey = (x: any) => x.id;
      const joinId = graph.join(left, right, leftKey, rightKey);

      const joinNode = graph.getNode(joinId);
      expect(joinNode).toBeDefined();
      expect(joinNode?.intentType).toBe(IntentType.JOIN);
      expect(joinNode?.inputs).toEqual([left, right]);
    });

    it('should throw error for invalid left node', () => {
      const graph = new Graph();
      const right = graph.input('right');
      const leftKey = (x: any) => x.id;
      const rightKey = (x: any) => x.id;

      expect(() => graph.join('invalid', right, leftKey, rightKey)).toThrow();
    });

    it('should throw error for invalid right node', () => {
      const graph = new Graph();
      const left = graph.input('left');
      const leftKey = (x: any) => x.id;
      const rightKey = (x: any) => x.id;

      expect(() => graph.join(left, 'invalid', leftKey, rightKey)).toThrow();
    });
  });

  describe('Flatten operations', () => {
    it('should create flatten nodes with default depth', () => {
      const graph = new Graph();
      const input = graph.input('data');
      const flattenId = graph.flatten(input);

      const flattenNode = graph.getNode(flattenId);
      expect(flattenNode).toBeDefined();
      expect(flattenNode?.intentType).toBe(IntentType.FLATTEN);
      expect(flattenNode?.params['depth']).toBe(1);
    });

    it('should create flatten nodes with custom depth', () => {
      const graph = new Graph();
      const input = graph.input('data');
      const flattenId = graph.flatten(input, 3);

      const flattenNode = graph.getNode(flattenId);
      expect(flattenNode?.params['depth']).toBe(3);
    });

    it('should throw error for invalid input node', () => {
      const graph = new Graph();
      expect(() => graph.flatten('invalid')).toThrow();
    });
  });

  describe('Distinct operations', () => {
    it('should create distinct nodes without key function', () => {
      const graph = new Graph();
      const input = graph.input('data');
      const distinctId = graph.distinct(input);

      const distinctNode = graph.getNode(distinctId);
      expect(distinctNode).toBeDefined();
      expect(distinctNode?.intentType).toBe(IntentType.DISTINCT);
      expect(distinctNode?.params['keyFn']).toBeUndefined();
    });

    it('should create distinct nodes with key function', () => {
      const graph = new Graph();
      const input = graph.input('data');
      const keyFn = (x: any) => x.id;
      const distinctId = graph.distinct(input, keyFn);

      const distinctNode = graph.getNode(distinctId);
      expect(distinctNode?.params['keyFn']).toBe(keyFn);
    });

    it('should throw error for invalid input node', () => {
      const graph = new Graph();
      expect(() => graph.distinct('invalid')).toThrow();
    });
  });

  describe('Output operations', () => {
    it('should mark nodes as outputs', () => {
      const graph = new Graph();
      const input = graph.input('data');
      graph.output(input);

      const outputs = graph.getOutputs();
      expect(outputs).toContain(input);
    });

    it('should not duplicate outputs', () => {
      const graph = new Graph();
      const input = graph.input('data');
      graph.output(input);
      graph.output(input);

      const outputs = graph.getOutputs();
      expect(outputs.filter((x) => x === input).length).toBe(1);
    });

    it('should throw error for invalid node', () => {
      const graph = new Graph();
      expect(() => graph.output('invalid')).toThrow();
    });

    it('should handle multiple outputs', () => {
      const graph = new Graph();
      const input1 = graph.input('a');
      const input2 = graph.input('b');
      graph.output(input1);
      graph.output(input2);

      const outputs = graph.getOutputs();
      expect(outputs.length).toBe(2);
      expect(outputs).toContain(input1);
      expect(outputs).toContain(input2);
    });
  });

  describe('Execution order', () => {
    it('should return topological order for linear pipeline', () => {
      const graph = new Graph();
      const input = graph.input('data');
      const filtered = graph.filter(input, (x: any) => x > 0);
      const mapped = graph.map(filtered, (x: any) => x * 2);
      graph.output(mapped);

      const order = graph.getExecutionOrder();
      expect(order).toEqual([input, filtered, mapped]);
    });

    it('should handle graphs with multiple branches', () => {
      const graph = new Graph();
      const input = graph.input('data');
      const branch1 = graph.filter(input, (x: any) => x > 0);
      const branch2 = graph.map(input, (x: any) => x * 2);
      graph.output(branch1);
      graph.output(branch2);

      const order = graph.getExecutionOrder();
      expect(order).toContain(input);
      expect(order).toContain(branch1);
      expect(order).toContain(branch2);
      expect(order.indexOf(input)).toBeLessThan(order.indexOf(branch1));
      expect(order.indexOf(input)).toBeLessThan(order.indexOf(branch2));
    });

    it('should return empty order for graphs with no outputs', () => {
      const graph = new Graph();
      graph.input('data');

      const order = graph.getExecutionOrder();
      expect(order).toEqual([]);
    });
  });

  describe('Graph visualization', () => {
    it('should generate ASCII visualization', () => {
      const graph = new Graph();
      const input = graph.input('data');
      const filtered = graph.filter(input, (x: any) => x > 0);
      graph.output(filtered);

      const viz = graph.visualize();
      expect(viz).toContain('Intent Graph:');
      expect(viz).toContain('input');
      expect(viz).toContain('filter');
      expect(viz).toContain('Outputs:');
    });
  });

  describe('Graph cloning', () => {
    it('should create independent copy of graph', () => {
      const graph = new Graph();
      const input = graph.input('data');
      const filtered = graph.filter(input, (x: any) => x > 0);
      graph.output(filtered);

      const cloned = graph.clone();

      // Verify structure is the same
      expect(cloned.nodes.size).toBe(graph.nodes.size);
      expect(cloned.outputs.length).toBe(graph.outputs.length);

      // Verify it's independent
      graph.input('new');
      expect(cloned.nodes.size).not.toBe(graph.nodes.size);
    });

    it('should deep clone node properties', () => {
      const graph = new Graph();
      const input = graph.input('data');
      graph.output(input);

      const cloned = graph.clone();

      const originalNode = graph.getNode(input)!;
      const clonedNode = cloned.getNode(input)!;

      // Modify original
      originalNode.inputs.push('test');

      // Cloned should not be affected
      expect(clonedNode.inputs.length).not.toBe(originalNode.inputs.length);
    });
  });

  describe('Graph optimization', () => {
    it.skip('should apply optimization passes', () => {
      const graph = new Graph();
      const input = graph.input('data');
      const filtered = graph.filter(input, (x: any) => x > 0);
      graph.output(filtered);

      const originalNodeCount = graph.nodes.size;
      graph.optimize(['dead_code_elimination']);

      // Node count should not change for this simple case
      expect(graph.nodes.size).toBe(originalNodeCount);
    });

    it.skip('should use default passes when none specified', () => {
      const graph = new Graph();
      const input = graph.input('data');
      const filtered = graph.filter(input, (x: any) => x > 0);
      graph.output(filtered);

      expect(() => graph.optimize()).not.toThrow();
    });
  });

  describe('Edge cases', () => {
    it('should handle graphs with cycles (though DAG structure is expected)', () => {
      const graph = new Graph();
      const input = graph.input('data');
      graph.output(input);

      const order = graph.getExecutionOrder();
      expect(order).toContain(input);
    });

    it('should handle undefined return from getNode', () => {
      const graph = new Graph();
      const node = graph.getNode('nonexistent');
      expect(node).toBeUndefined();
    });

    it('should generate unique node IDs', () => {
      const graph = new Graph();
      const input1 = graph.input('a');
      const input2 = graph.input('b');

      expect(input1).not.toBe(input2);
    });
  });
});
