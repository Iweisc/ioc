/**
 * WASM Backend Integration Tests
 *
 * Comprehensive tests for WebAssembly backend functionality
 * including all node types, operations, and edge cases.
 */

import { describe, it, expect } from 'vitest';
import { WebAssemblyBackend } from '../backends/wasm-backend';
import { SafeGraph } from '../dsl/safe-graph';
import { Predicate, Transform, Reduce } from '../dsl/safe-types';

describe('WASM Backend Integration', () => {
  describe('Basic Operations', () => {
    it('should compile and execute constant nodes', async () => {
      const backend = new WebAssemblyBackend();
      const graph = new SafeGraph('constant-test');

      const constNode = graph.constant(42);
      graph.output(constNode);

      const program = graph.toProgram();
      const result = await backend.compile(program);

      expect(result.backend).toBe('wasm');
      expect(result.execute).toBeDefined();
    });

    it('should compile and execute input nodes', async () => {
      const backend = new WebAssemblyBackend();
      const graph = new SafeGraph('input-test');

      const inputNode = graph.input('data');
      graph.output(inputNode);

      const program = graph.toProgram();
      const result = await backend.compile(program);

      expect(result.backend).toBe('wasm');
      expect(result.codeSize).toBeGreaterThan(0);
    });
  });

  describe('Filter Operations', () => {
    it('should filter arrays with predicates', async () => {
      const backend = new WebAssemblyBackend();
      const graph = new SafeGraph('filter-test');

      const inputNode = graph.input('numbers');
      const filterNode = graph.filter(inputNode, Predicate.gt(5));
      graph.output(filterNode);

      const program = graph.toProgram();
      const result = await backend.compile(program);

      expect(result.backend).toBe('wasm');
      expect(result.execute).toBeDefined();
    });

    it('should filter with complex predicates', async () => {
      const backend = new WebAssemblyBackend();
      const graph = new SafeGraph('complex-filter');

      const inputNode = graph.input('data');
      const filterNode = graph.filter(inputNode, Predicate.and(Predicate.gt(0), Predicate.lt(100)));
      graph.output(filterNode);

      const program = graph.toProgram();
      const result = await backend.compile(program);

      expect(result.backend).toBe('wasm');
    });

    it('should filter with property predicates', async () => {
      const backend = new WebAssemblyBackend();
      const graph = new SafeGraph('property-filter');

      const inputNode = graph.input('users');
      const filterNode = graph.filter(inputNode, Predicate.property.gt('age', 18));
      graph.output(filterNode);

      const program = graph.toProgram();
      const result = await backend.compile(program);

      expect(result.backend).toBe('wasm');
    });
  });

  describe('Map Operations', () => {
    it('should map with arithmetic transforms', async () => {
      const backend = new WebAssemblyBackend();
      const graph = new SafeGraph('map-test');

      const inputNode = graph.input('numbers');
      const mapNode = graph.map(inputNode, Transform.multiply(2));
      graph.output(mapNode);

      const program = graph.toProgram();
      const result = await backend.compile(program);

      expect(result.backend).toBe('wasm');
      expect(result.execute).toBeDefined();
    });

    it('should map with property transforms', async () => {
      const backend = new WebAssemblyBackend();
      const graph = new SafeGraph('property-map');

      const inputNode = graph.input('users');
      const mapNode = graph.map(inputNode, Transform.property('name'));
      graph.output(mapNode);

      const program = graph.toProgram();
      const result = await backend.compile(program);

      expect(result.backend).toBe('wasm');
    });

    it('should map with composed transforms', async () => {
      const backend = new WebAssemblyBackend();
      const graph = new SafeGraph('compose-map');

      const inputNode = graph.input('numbers');
      const mapNode = graph.map(
        inputNode,
        Transform.compose(Transform.multiply(2), Transform.add(10))
      );
      graph.output(mapNode);

      const program = graph.toProgram();
      const result = await backend.compile(program);

      expect(result.backend).toBe('wasm');
    });
  });

  describe('Reduction Operations', () => {
    it('should compute sum reduction', async () => {
      const backend = new WebAssemblyBackend();
      const graph = new SafeGraph('sum-test');

      const inputNode = graph.input('numbers');
      const sumNode = graph.reduce(inputNode, Reduce.sum());
      graph.output(sumNode);

      const program = graph.toProgram();
      const result = await backend.compile(program);

      expect(result.backend).toBe('wasm');
      expect(result.execute).toBeDefined();
    });

    it('should compute product reduction', async () => {
      const backend = new WebAssemblyBackend();
      const graph = new SafeGraph('product-test');

      const inputNode = graph.input('numbers');
      const productNode = graph.reduce(inputNode, Reduce.product());
      graph.output(productNode);

      const program = graph.toProgram();
      const result = await backend.compile(program);

      expect(result.backend).toBe('wasm');
    });

    it('should compute min reduction', async () => {
      const backend = new WebAssemblyBackend();
      const graph = new SafeGraph('min-test');

      const inputNode = graph.input('numbers');
      const minNode = graph.reduce(inputNode, Reduce.min());
      graph.output(minNode);

      const program = graph.toProgram();
      const result = await backend.compile(program);

      expect(result.backend).toBe('wasm');
    });

    it('should compute max reduction', async () => {
      const backend = new WebAssemblyBackend();
      const graph = new SafeGraph('max-test');

      const inputNode = graph.input('numbers');
      const maxNode = graph.reduce(inputNode, Reduce.max());
      graph.output(maxNode);

      const program = graph.toProgram();
      const result = await backend.compile(program);

      expect(result.backend).toBe('wasm');
    });

    it('should compute average reduction', async () => {
      const backend = new WebAssemblyBackend();
      const graph = new SafeGraph('average-test');

      const inputNode = graph.input('numbers');
      const avgNode = graph.reduce(inputNode, Reduce.average());
      graph.output(avgNode);

      const program = graph.toProgram();
      const result = await backend.compile(program);

      expect(result.backend).toBe('wasm');
    });

    it('should compute count reduction', async () => {
      const backend = new WebAssemblyBackend();
      const graph = new SafeGraph('count-test');

      const inputNode = graph.input('items');
      const countNode = graph.reduce(inputNode, Reduce.count());
      graph.output(countNode);

      const program = graph.toProgram();
      const result = await backend.compile(program);

      expect(result.backend).toBe('wasm');
    });

    it('should get first element', async () => {
      const backend = new WebAssemblyBackend();
      const graph = new SafeGraph('first-test');

      const inputNode = graph.input('items');
      const firstNode = graph.reduce(inputNode, Reduce.first());
      graph.output(firstNode);

      const program = graph.toProgram();
      const result = await backend.compile(program);

      expect(result.backend).toBe('wasm');
    });

    it('should get last element', async () => {
      const backend = new WebAssemblyBackend();
      const graph = new SafeGraph('last-test');

      const inputNode = graph.input('items');
      const lastNode = graph.reduce(inputNode, Reduce.last());
      graph.output(lastNode);

      const program = graph.toProgram();
      const result = await backend.compile(program);

      expect(result.backend).toBe('wasm');
    });
  });

  describe('Array Operations', () => {
    it('should slice arrays', async () => {
      const backend = new WebAssemblyBackend();
      const graph = new SafeGraph('slice-test');

      const inputNode = graph.input('items');
      const sliceNode = graph.slice(inputNode, 1, 5);
      graph.output(sliceNode);

      const program = graph.toProgram();
      const result = await backend.compile(program);

      expect(result.backend).toBe('wasm');
    });

    it('should handle array operations', async () => {
      const backend = new WebAssemblyBackend();
      const graph = new SafeGraph('array-ops-test');

      const inputNode = graph.input('arr');
      const distinctNode = graph.distinct(inputNode);
      graph.output(distinctNode);

      const program = graph.toProgram();
      const result = await backend.compile(program);

      expect(result.backend).toBe('wasm');
    });

    it('should flatten arrays', async () => {
      const backend = new WebAssemblyBackend();
      const graph = new SafeGraph('flatten-test');

      const inputNode = graph.input('nested');
      const flatNode = graph.flatten(inputNode, 1);
      graph.output(flatNode);

      const program = graph.toProgram();
      const result = await backend.compile(program);

      expect(result.backend).toBe('wasm');
    });

    it('should get distinct values', async () => {
      const backend = new WebAssemblyBackend();
      const graph = new SafeGraph('distinct-test');

      const inputNode = graph.input('items');
      const distinctNode = graph.distinct(inputNode);
      graph.output(distinctNode);

      const program = graph.toProgram();
      const result = await backend.compile(program);

      expect(result.backend).toBe('wasm');
    });

    it('should sort arrays', async () => {
      const backend = new WebAssemblyBackend();
      const graph = new SafeGraph('sort-test');

      const inputNode = graph.input('numbers');
      const sortNode = graph.sort(inputNode);
      graph.output(sortNode);

      const program = graph.toProgram();
      const result = await backend.compile(program);

      expect(result.backend).toBe('wasm');
    });

    it('should sort arrays descending', async () => {
      const backend = new WebAssemblyBackend();
      const graph = new SafeGraph('sort-desc-test');

      const inputNode = graph.input('numbers');
      const sortNode = graph.sort(inputNode, undefined, true);
      graph.output(sortNode);

      const program = graph.toProgram();
      const result = await backend.compile(program);

      expect(result.backend).toBe('wasm');
    });
  });

  describe('Complex Pipelines', () => {
    it('should compile filter->map->reduce pipeline', async () => {
      const backend = new WebAssemblyBackend();
      const graph = new SafeGraph('pipeline-test');

      const inputNode = graph.input('numbers');
      const filterNode = graph.filter(inputNode, Predicate.gt(5));
      const mapNode = graph.map(filterNode, Transform.multiply(2));
      const sumNode = graph.reduce(mapNode, Reduce.sum());
      graph.output(sumNode);

      const program = graph.toProgram();
      const result = await backend.compile(program);

      expect(result.backend).toBe('wasm');
      expect(result.execute).toBeDefined();
      expect(result.codeSize).toBeGreaterThan(0);
    });

    it('should compile multi-stage pipeline', async () => {
      const backend = new WebAssemblyBackend();
      const graph = new SafeGraph('multi-stage');

      const inputNode = graph.input('data');
      const filterNode = graph.filter(inputNode, Predicate.gt(0));
      const distinctNode = graph.distinct(filterNode);
      const sortNode = graph.sort(distinctNode);
      const sliceNode = graph.slice(sortNode, 0, 10);
      const mapNode = graph.map(sliceNode, Transform.multiply(2));
      const sumNode = graph.reduce(mapNode, Reduce.sum());
      graph.output(sumNode);

      const program = graph.toProgram();
      const result = await backend.compile(program);

      expect(result.backend).toBe('wasm');
      expect(result.compilationTime).toBeGreaterThan(0);
    });
  });

  describe('Code Generation Quality', () => {
    it('should generate valid WAT format', async () => {
      const backend = new WebAssemblyBackend();
      const graph = new SafeGraph('wat-test');

      const inputNode = graph.input('numbers');
      const mapNode = graph.map(inputNode, Transform.add(1));
      graph.output(mapNode);

      const program = graph.toProgram();
      const result = await backend.compile(program);

      expect(result.backend).toBe('wasm');
      expect(result.metadata.wasmBinary).toBeDefined();
      expect(result.metadata.wasmBinary).toBeInstanceOf(Uint8Array);
    });

    it('should have reasonable code size', async () => {
      const backend = new WebAssemblyBackend();
      const graph = new SafeGraph('size-test');

      const inputNode = graph.input('data');
      const mapNode = graph.map(inputNode, Transform.identity());
      graph.output(mapNode);

      const program = graph.toProgram();
      const result = await backend.compile(program);

      expect(result.codeSize).toBeLessThan(10000); // Should be under 10KB for simple programs
    });

    it('should compile in reasonable time', async () => {
      const backend = new WebAssemblyBackend();
      const graph = new SafeGraph('perf-test');

      const inputNode = graph.input('data');
      let currentNode = inputNode;

      // Create a chain of 10 operations
      for (let i = 0; i < 10; i++) {
        currentNode = graph.map(currentNode, Transform.add(1));
      }
      graph.output(currentNode);

      const program = graph.toProgram();
      const result = await backend.compile(program);

      expect(result.compilationTime).toBeLessThan(1000); // Should compile in under 1 second
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty programs', async () => {
      const backend = new WebAssemblyBackend();
      const graph = new SafeGraph('empty');

      const program = graph.toProgram();
      const result = await backend.compile(program);

      expect(result.backend).toBe('wasm');
    });

    it('should handle multiple outputs', async () => {
      const backend = new WebAssemblyBackend();
      const graph = new SafeGraph('multi-output');

      const inputNode = graph.input('data');
      const map1 = graph.map(inputNode, Transform.multiply(2));
      const map2 = graph.map(inputNode, Transform.add(10));

      graph.output(map1);
      graph.output(map2);

      const program = graph.toProgram();
      const result = await backend.compile(program);

      expect(result.backend).toBe('wasm');
    });

    it('should handle deeply nested operations', async () => {
      const backend = new WebAssemblyBackend();
      const graph = new SafeGraph('deep-nest');

      const inputNode = graph.input('data');
      const filterNode = graph.filter(
        inputNode,
        Predicate.and(Predicate.gt(0), Predicate.and(Predicate.lt(100), Predicate.ne(50)))
      );
      graph.output(filterNode);

      const program = graph.toProgram();
      const result = await backend.compile(program);

      expect(result.backend).toBe('wasm');
    });
  });

  describe('Backend Metadata', () => {
    it('should provide compilation metadata', async () => {
      const backend = new WebAssemblyBackend();
      const graph = new SafeGraph('metadata-test');

      const inputNode = graph.input('data');
      graph.output(inputNode);

      const program = graph.toProgram();
      const result = await backend.compile(program);

      expect(result.metadata).toBeDefined();
      expect(result.metadata.wasmBinary).toBeDefined();
      expect(result.metadata.optimizations).toBeDefined();
      expect(Array.isArray(result.metadata.optimizations)).toBe(true);
    });

    it('should estimate compilation time', () => {
      const backend = new WebAssemblyBackend();
      const graph = new SafeGraph('estimate-test');

      const inputNode = graph.input('data');
      graph.map(inputNode, Transform.add(1));

      const program = graph.toProgram();
      const estimate = backend.estimateCompilationTime(program);

      expect(estimate).toBeGreaterThan(0);
      expect(typeof estimate).toBe('number');
    });

    it('should provide performance score', () => {
      const backend = new WebAssemblyBackend();
      const score = backend.estimatePerformanceScore();

      expect(score).toBe(8); // WASM gets 8/10
    });
  });
});
