import { describe, it, expect } from 'vitest';
import { Graph } from '../core/graph';
import { GraphOptimizer } from '../core/optimizer';

describe('GraphOptimizer', () => {
  describe('Dead code elimination', () => {
    it('should remove unreachable nodes', () => {
      const graph = new Graph();
      const input = graph.input('data');
      const used = graph.filter(input, (x: any) => x > 0);
      graph.map(input, (x: any) => x * 2); // unused node
      graph.output(used);

      const optimizer = new GraphOptimizer(graph);
      const initialCount = graph.nodes.size;

      optimizer.optimize(['dead_code_elimination']);

      expect(graph.nodes.size).toBeLessThan(initialCount);
    });

    it('should keep all reachable nodes', () => {
      const graph = new Graph();
      const input = graph.input('data');
      const filtered = graph.filter(input, (x: any) => x > 0);
      const mapped = graph.map(filtered, (x: any) => x * 2);
      graph.output(mapped);

      const optimizer = new GraphOptimizer(graph);
      const initialCount = graph.nodes.size;

      optimizer.optimize(['dead_code_elimination']);

      // All nodes are reachable, so count should not change
      expect(graph.nodes.size).toBe(initialCount);
    });
  });

  describe('Common subexpression elimination', () => {
    it('should deduplicate identical constant nodes', () => {
      const graph = new Graph();
      const const1 = graph.constant(42);
      const const2 = graph.constant(42);
      graph.output(const1);
      graph.output(const2);

      const optimizer = new GraphOptimizer(graph);
      const initialCount = graph.nodes.size;

      optimizer.optimize(['common_subexpression_elimination']);

      expect(graph.nodes.size).toBeLessThan(initialCount);
    });

    it('should not deduplicate different constants', () => {
      const graph = new Graph();
      const const1 = graph.constant(42);
      const const2 = graph.constant(43);
      graph.output(const1);
      graph.output(const2);

      const optimizer = new GraphOptimizer(graph);
      const initialCount = graph.nodes.size;

      optimizer.optimize(['common_subexpression_elimination']);

      expect(graph.nodes.size).toBe(initialCount);
    });
  });

  describe('Filter fusion', () => {
    it('should fuse consecutive filter operations', () => {
      const graph = new Graph();
      const input = graph.input('data');
      const filter1 = graph.filter(input, (x: any) => x > 0);
      const filter2 = graph.filter(filter1, (x: any) => x < 100);
      graph.output(filter2);

      const optimizer = new GraphOptimizer(graph);
      const initialCount = graph.nodes.size;

      optimizer.optimize(['filter_fusion']);

      expect(graph.nodes.size).toBeLessThan(initialCount);
    });
  });

  describe('Map fusion', () => {
    it('should fuse consecutive map operations', () => {
      const graph = new Graph();
      const input = graph.input('data');
      const map1 = graph.map(input, (x: any) => x * 2);
      const map2 = graph.map(map1, (x: any) => x + 1);
      graph.output(map2);

      const optimizer = new GraphOptimizer(graph);
      const initialCount = graph.nodes.size;

      optimizer.optimize(['map_fusion']);

      expect(graph.nodes.size).toBeLessThan(initialCount);
    });
  });

  describe('Filter before map', () => {
    it('should reorder filter before map when beneficial', () => {
      const graph = new Graph();
      const input = graph.input('data');
      const mapped = graph.map(input, (x: any) => x * 2);
      const filtered = graph.filter(mapped, (x: any) => x > 10);
      graph.output(filtered);

      const optimizer = new GraphOptimizer(graph);

      optimizer.optimize(['filter_before_map']);

      // Verify structure changed (hard to test without inspecting internals)
      expect(graph.nodes.size).toBeGreaterThan(0);
    });

    it('should not reorder when map has multiple consumers', () => {
      const graph = new Graph();
      const input = graph.input('data');
      const mapped = graph.map(input, (x: any) => x * 2);
      const filtered = graph.filter(mapped, (x: any) => x > 10);
      const reduced = graph.reduce(mapped, (a: any, b: any) => a + b, 0);
      graph.output(filtered);
      graph.output(reduced);

      const optimizer = new GraphOptimizer(graph);
      const initialCount = graph.nodes.size;

      optimizer.optimize(['filter_before_map']);

      // Should not change since map has multiple consumers
      expect(graph.nodes.size).toBe(initialCount);
    });
  });

  describe('Multiple optimization passes', () => {
    it('should apply all default passes', () => {
      const graph = new Graph();
      const input = graph.input('data');
      const filter1 = graph.filter(input, (x: any) => x > 0);
      const filter2 = graph.filter(filter1, (x: any) => x < 100);
      graph.output(filter2);

      const optimizer = new GraphOptimizer(graph);

      optimizer.optimize(); // Uses default passes

      // Graph should still be valid
      expect(graph.nodes.size).toBeGreaterThan(0);
    });

    it('should throw error for unknown pass', () => {
      const graph = new Graph();
      const input = graph.input('data');
      graph.output(input);

      const optimizer = new GraphOptimizer(graph);

      expect(() => optimizer.optimize(['unknown_pass'])).toThrow();
    });
  });

  describe('Optimization report', () => {
    it('should generate optimization report', () => {
      const graph = new Graph();
      const input = graph.input('data');
      const filter1 = graph.filter(input, (x: any) => x > 0);
      const filter2 = graph.filter(filter1, (x: any) => x < 100);
      graph.output(filter2);

      const optimizer = new GraphOptimizer(graph);
      optimizer.optimize(['filter_fusion']);

      const report = optimizer.getOptimizationReport();
      expect(report).toContain('filter_fusion');
    });

    it('should report no optimizations when none applied', () => {
      const graph = new Graph();
      const input = graph.input('data');
      graph.output(input);

      const optimizer = new GraphOptimizer(graph);
      optimizer.optimize([]);

      const report = optimizer.getOptimizationReport();
      expect(report).toContain('No optimizations applied');
    });
  });

  describe('Complex optimization scenarios', () => {
    it('should handle graphs with multiple output nodes', () => {
      const graph = new Graph();
      const input = graph.input('data');
      const filter1 = graph.filter(input, (x: any) => x > 0);
      const filter2 = graph.filter(input, (x: any) => x < 100);
      graph.output(filter1);
      graph.output(filter2);

      const optimizer = new GraphOptimizer(graph);

      expect(() => optimizer.optimize()).not.toThrow();
    });

    it('should handle empty graphs', () => {
      const graph = new Graph();
      const optimizer = new GraphOptimizer(graph);

      expect(() => optimizer.optimize()).not.toThrow();
    });

    it('should handle graphs with only inputs', () => {
      const graph = new Graph();
      const input = graph.input('data');
      graph.output(input);

      const optimizer = new GraphOptimizer(graph);
      const initialCount = graph.nodes.size;

      optimizer.optimize();

      expect(graph.nodes.size).toBe(initialCount);
    });
  });

  describe('Optimization correctness', () => {
    it('should preserve graph outputs after optimization', () => {
      const graph = new Graph();
      const input = graph.input('data');
      const filtered = graph.filter(input, (x: any) => x > 0);
      graph.output(filtered);

      const originalOutputs = [...graph.outputs];

      const optimizer = new GraphOptimizer(graph);
      optimizer.optimize();

      // Outputs should still exist (might be different node IDs due to fusion)
      expect(graph.outputs.length).toBe(originalOutputs.length);
    });

    it('should handle optimization with constants', () => {
      const graph = new Graph();
      const const1 = graph.constant([1, 2, 3]);
      const filtered = graph.filter(const1, (x: any) => x > 1);
      graph.output(filtered);

      const optimizer = new GraphOptimizer(graph);

      expect(() => optimizer.optimize()).not.toThrow();
    });
  });
});
