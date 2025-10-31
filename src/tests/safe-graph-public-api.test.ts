/**
 * Tests for SafeGraph public API additions:
 * - getNodeCount()
 * - getOutputCount()
 * - getMetadata()
 * - setMetadata()
 */

import { describe, it, expect } from 'vitest';
import { SafeGraph } from '../dsl/safe-graph';

describe('SafeGraph Public API', () => {
  describe('getNodeCount()', () => {
    it('should return 0 for empty graph', () => {
      const graph = new SafeGraph();
      expect(graph.getNodeCount()).toBe(0);
    });

    it('should return correct count after adding input node', () => {
      const graph = new SafeGraph();
      graph.input('data');
      expect(graph.getNodeCount()).toBe(1);
    });

    it('should return correct count after adding multiple nodes', () => {
      const graph = new SafeGraph();
      const inputId = graph.input('numbers');
      graph.filter(inputId, { type: 'compare', op: 'gt', value: 0 });
      expect(graph.getNodeCount()).toBe(2);
    });

    it('should return correct count for complex pipeline', () => {
      const graph = new SafeGraph();
      const inputId = graph.input('data');
      const filterId = graph.filter(inputId, { type: 'compare', op: 'gt', value: 5 });
      const mapId = graph.map(filterId, { type: 'arithmetic', op: 'multiply', operand: 2 });
      graph.reduce(mapId, { type: 'sum' });

      expect(graph.getNodeCount()).toBe(4); // input, filter, map, reduce
    });

    it('should include constant nodes in count', () => {
      const graph = new SafeGraph();
      graph.input('data');
      graph.constant(42);
      graph.constant('hello');

      expect(graph.getNodeCount()).toBe(3);
    });
  });

  describe('getOutputCount()', () => {
    it('should return 0 for graph with no outputs', () => {
      const graph = new SafeGraph();
      graph.input('data');
      expect(graph.getOutputCount()).toBe(0);
    });

    it('should return 1 after marking one output', () => {
      const graph = new SafeGraph();
      const inputId = graph.input('data');
      graph.output(inputId);

      expect(graph.getOutputCount()).toBe(1);
    });

    it('should return correct count for multiple outputs', () => {
      const graph = new SafeGraph();
      const inputId = graph.input('data');
      const map1 = graph.map(inputId, { type: 'arithmetic', op: 'multiply', operand: 2 });
      const map2 = graph.map(inputId, { type: 'arithmetic', op: 'add', operand: 10 });

      graph.output(map1);
      graph.output(map2);

      expect(graph.getOutputCount()).toBe(2);
    });

    it('should not double count if same node marked as output twice', () => {
      const graph = new SafeGraph();
      const inputId = graph.input('data');

      graph.output(inputId);
      graph.output(inputId);

      expect(graph.getOutputCount()).toBe(1);
    });
  });

  describe('getMetadata() and setMetadata()', () => {
    it('should return empty metadata for new graph without name', () => {
      const graph = new SafeGraph();
      const metadata = graph.getMetadata();

      expect(metadata).toBeDefined();
      expect(metadata).toEqual({});
    });

    it('should return metadata with name when provided in constructor', () => {
      const graph = new SafeGraph('test-graph');
      const metadata = graph.getMetadata();

      expect(metadata).toBeDefined();
      expect(metadata?.name).toBe('test-graph');
    });

    it('should set metadata correctly', () => {
      const graph = new SafeGraph();

      graph.setMetadata({
        name: 'my-pipeline',
        description: 'A test pipeline',
        author: 'Test User',
      });

      const metadata = graph.getMetadata();
      expect(metadata?.name).toBe('my-pipeline');
      expect(metadata?.description).toBe('A test pipeline');
      expect(metadata?.author).toBe('Test User');
    });

    it('should update existing metadata', () => {
      const graph = new SafeGraph('initial-name');

      graph.setMetadata({
        name: 'updated-name',
        version: '1.0.0',
      });

      const metadata = graph.getMetadata();
      expect(metadata?.name).toBe('updated-name');
      expect(metadata?.version).toBe('1.0.0');
    });

    it('should preserve metadata through serialization', () => {
      const graph = new SafeGraph();

      graph.setMetadata({
        name: 'serialization-test',
        description: 'Testing metadata serialization',
        tags: ['test', 'pipeline'],
      });

      const inputId = graph.input('data');
      graph.output(inputId);

      const json = graph.toJSON();
      const restored = SafeGraph.fromJSON(json);

      const restoredMetadata = restored.getMetadata();
      expect(restoredMetadata?.name).toBe('serialization-test');
      expect(restoredMetadata?.description).toBe('Testing metadata serialization');
      expect(restoredMetadata?.tags).toEqual(['test', 'pipeline']);
    });

    it('should allow setting custom metadata fields', () => {
      const graph = new SafeGraph();

      graph.setMetadata({
        name: 'custom-graph',
        customField: 'custom value',
        nestedObject: {
          key: 'value',
        },
      } as any);

      const metadata = graph.getMetadata();
      expect((metadata as any).customField).toBe('custom value');
      expect((metadata as any).nestedObject).toEqual({ key: 'value' });
    });
  });

  describe('Integration with existing methods', () => {
    it('should maintain correct counts during graph construction', () => {
      const graph = new SafeGraph('integration-test');

      expect(graph.getNodeCount()).toBe(0);
      expect(graph.getOutputCount()).toBe(0);

      const inputId = graph.input('numbers');
      expect(graph.getNodeCount()).toBe(1);

      const filterId = graph.filter(inputId, { type: 'compare', op: 'gt', value: 0 });
      expect(graph.getNodeCount()).toBe(2);

      const mapId = graph.map(filterId, { type: 'arithmetic', op: 'multiply', operand: 2 });
      expect(graph.getNodeCount()).toBe(3);

      graph.output(mapId);
      expect(graph.getOutputCount()).toBe(1);

      expect(graph.getMetadata()?.name).toBe('integration-test');
    });

    it('should reflect counts in toJSON output', () => {
      const graph = new SafeGraph('json-test');
      const inputId = graph.input('data');
      const mapId = graph.map(inputId, { type: 'identity' });
      graph.output(mapId);

      const json = graph.toJSON();

      expect(json.nodes.length).toBe(graph.getNodeCount());
      expect(json.outputs.length).toBe(graph.getOutputCount());
      expect(json.metadata?.name).toBe(graph.getMetadata()?.name);
    });

    it('should allow metadata modification after graph construction', () => {
      const graph = new SafeGraph('initial');
      const inputId = graph.input('data');
      graph.output(inputId);

      // Modify metadata after construction
      graph.setMetadata({
        name: 'modified',
        description: 'Added after construction',
      });

      const json = graph.toJSON();
      expect(json.metadata?.name).toBe('modified');
      expect(json.metadata?.description).toBe('Added after construction');
    });
  });

  describe('Deserialization and public API', () => {
    it('should preserve node count through fromJSON', () => {
      const graph = new SafeGraph();
      const inputId = graph.input('numbers');
      const filterId = graph.filter(inputId, { type: 'compare', op: 'gt', value: 10 });
      graph.output(filterId);

      const json = graph.toJSON();
      const restored = SafeGraph.fromJSON(json);

      expect(restored.getNodeCount()).toBe(graph.getNodeCount());
      expect(restored.getOutputCount()).toBe(graph.getOutputCount());
    });

    it('should preserve metadata through fromProgram', () => {
      const graph = new SafeGraph('program-test');
      graph.setMetadata({
        name: 'program-test',
        version: '2.0.0',
        author: 'Test',
      });

      const inputId = graph.input('data');
      graph.output(inputId);

      const program = graph.toProgram();
      const restored = SafeGraph.fromProgram(program);

      const restoredMetadata = restored.getMetadata();
      expect(restoredMetadata?.name).toBe('program-test');
      expect(restoredMetadata?.version).toBe('2.0.0');
      expect(restoredMetadata?.author).toBe('Test');
    });

    it('should handle empty graph deserialization', () => {
      const graph = new SafeGraph('empty');
      const json = graph.toJSON();
      const restored = SafeGraph.fromJSON(json);

      expect(restored.getNodeCount()).toBe(0);
      expect(restored.getOutputCount()).toBe(0);
      expect(restored.getMetadata()?.name).toBe('empty');
    });
  });

  describe('Edge cases', () => {
    it('should handle metadata with undefined values', () => {
      const graph = new SafeGraph();

      graph.setMetadata({
        name: 'test',
        description: undefined,
      });

      const metadata = graph.getMetadata();
      expect(metadata?.name).toBe('test');
      expect(metadata?.description).toBeUndefined();
    });

    it('should handle setting metadata to empty object', () => {
      const graph = new SafeGraph('initial');

      graph.setMetadata({});

      const metadata = graph.getMetadata();
      expect(metadata).toBeDefined();
      expect(metadata).toEqual({});
    });

    it('should maintain counts when adding nodes in different orders', () => {
      const graph = new SafeGraph();

      // Add constant first
      graph.constant(42);
      expect(graph.getNodeCount()).toBe(1);

      // Add input
      const inputId = graph.input('data');
      expect(graph.getNodeCount()).toBe(2);

      // Add operation
      graph.filter(inputId, { type: 'compare', op: 'gt', value: 0 });
      expect(graph.getNodeCount()).toBe(3);
    });

    it('should correctly count after multiple operations on same input', () => {
      const graph = new SafeGraph();
      const inputId = graph.input('data');

      // Create multiple branches
      const branch1 = graph.map(inputId, { type: 'arithmetic', op: 'multiply', operand: 2 });
      const branch2 = graph.map(inputId, { type: 'arithmetic', op: 'add', operand: 5 });
      const branch3 = graph.filter(inputId, { type: 'compare', op: 'gt', value: 0 });

      expect(graph.getNodeCount()).toBe(4); // input + 3 operations

      graph.output(branch1);
      graph.output(branch2);
      graph.output(branch3);

      expect(graph.getOutputCount()).toBe(3);
    });
  });
});
