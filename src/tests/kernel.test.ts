import { describe, it, expect } from 'vitest';
import { Graph } from '../core/graph';
import { SolverKernel } from '../solvers/kernel';

describe('SolverKernel', () => {
  describe('Basic compilation', () => {
    it('should create kernel with graph', () => {
      const graph = new Graph();
      const kernel = new SolverKernel(graph);
      expect(kernel).toBeDefined();
    });

    it('should compile simple input-output graph', () => {
      const graph = new Graph();
      const input = graph.input('data');
      graph.output(input);

      const kernel = new SolverKernel(graph);
      const compiled = kernel.compile('balanced');

      expect(compiled).toBeInstanceOf(Function);
    });

    it('should execute compiled function with data', () => {
      const graph = new Graph();
      const input = graph.input('data');
      graph.output(input);

      const kernel = new SolverKernel(graph);
      const compiled = kernel.compile();

      const result = compiled([1, 2, 3]);
      expect(result).toEqual([1, 2, 3]);
    });

    it('should compile filter operation', () => {
      const graph = new Graph();
      const input = graph.input('data');
      const filtered = graph.filter(input, (x: any) => x > 2);
      graph.output(filtered);

      const kernel = new SolverKernel(graph);
      const compiled = kernel.compile();

      const result = compiled([1, 2, 3, 4, 5]);
      expect(result).toEqual([3, 4, 5]);
    });

    it('should compile map operation', () => {
      const graph = new Graph();
      const input = graph.input('data');
      const mapped = graph.map(input, (x: any) => x * 2);
      graph.output(mapped);

      const kernel = new SolverKernel(graph);
      const compiled = kernel.compile();

      const result = compiled([1, 2, 3]);
      expect(result).toEqual([2, 4, 6]);
    });

    it('should compile reduce operation with initial value', () => {
      const graph = new Graph();
      const input = graph.input('data');
      const reduced = graph.reduce(input, (a: any, b: any) => a + b, 0);
      graph.output(reduced);

      const kernel = new SolverKernel(graph);
      const compiled = kernel.compile();

      const result = compiled([1, 2, 3, 4]);
      expect(result).toBe(10);
    });

    it('should compile pipeline with multiple operations', () => {
      const graph = new Graph();
      const input = graph.input('data');
      const filtered = graph.filter(input, (x: any) => x > 0);
      const mapped = graph.map(filtered, (x: any) => x * 2);
      const reduced = graph.reduce(mapped, (a: any, b: any) => a + b, 0);
      graph.output(reduced);

      const kernel = new SolverKernel(graph);
      const compiled = kernel.compile();

      const result = compiled([1, 2, 3, 4, 5]);
      expect(result).toBe(30);
    });
  });

  describe('Optimization modes', () => {
    it('should compile for speed', () => {
      const graph = new Graph();
      const input = graph.input('data');
      const mapped = graph.map(input, (x: any) => x * 2);
      graph.output(mapped);

      const kernel = new SolverKernel(graph);
      const compiled = kernel.compile('speed');

      expect(compiled([1, 2, 3])).toEqual([2, 4, 6]);
    });

    it('should compile for memory', () => {
      const graph = new Graph();
      const input = graph.input('data');
      const mapped = graph.map(input, (x: any) => x * 2);
      graph.output(mapped);

      const kernel = new SolverKernel(graph);
      const compiled = kernel.compile('memory');

      expect(compiled([1, 2, 3])).toEqual([2, 4, 6]);
    });

    it('should compile for balanced mode', () => {
      const graph = new Graph();
      const input = graph.input('data');
      const mapped = graph.map(input, (x: any) => x * 2);
      graph.output(mapped);

      const kernel = new SolverKernel(graph);
      const compiled = kernel.compile('balanced');

      expect(compiled([1, 2, 3])).toEqual([2, 4, 6]);
    });
  });

  describe('Size hints', () => {
    it('should set size hint for node', () => {
      const graph = new Graph();
      const input = graph.input('data');
      graph.output(input);

      const kernel = new SolverKernel(graph);
      kernel.setSizeHint(input, 1000);

      const compiled = kernel.compile();
      expect(compiled([1, 2, 3])).toEqual([1, 2, 3]);
    });

    it('should use size hints in strategy selection', () => {
      const graph = new Graph();
      const input = graph.input('data');
      const filtered = graph.filter(input, (x: any) => x > 0);
      graph.output(filtered);

      const kernel = new SolverKernel(graph);
      kernel.setSizeHint(input, 10000);

      const compiled = kernel.compile('speed');
      expect(compiled([1, 2, 3])).toEqual([1, 2, 3]);
    });
  });

  describe('Generated code', () => {
    it('should get generated code after compilation', () => {
      const graph = new Graph();
      const input = graph.input('data');
      graph.output(input);

      const kernel = new SolverKernel(graph);
      kernel.compile();

      const code = kernel.getGeneratedCode();
      expect(code).toContain('function');
    });

    it('should return message before compilation', () => {
      const graph = new Graph();
      const kernel = new SolverKernel(graph);

      const code = kernel.getGeneratedCode();
      expect(code).toContain('No code generated yet');
    });
  });

  describe('Strategy report', () => {
    it('should generate strategy report', () => {
      const graph = new Graph();
      const input = graph.input('data');
      const mapped = graph.map(input, (x: any) => x * 2);
      graph.output(mapped);

      const kernel = new SolverKernel(graph);
      kernel.compile();

      const report = kernel.getStrategyReport();
      expect(report).toContain('Strategy Selection Report');
    });

    it('should handle empty strategy cache', () => {
      const graph = new Graph();
      const kernel = new SolverKernel(graph);

      const report = kernel.getStrategyReport();
      expect(report).toContain('No strategy decisions');
    });
  });

  describe('Multiple outputs', () => {
    it('should handle graphs with multiple outputs', () => {
      const graph = new Graph();
      const input = graph.input('data');
      const filtered = graph.filter(input, (x: any) => x > 2);
      const mapped = graph.map(input, (x: any) => x * 2);
      graph.output(filtered);
      graph.output(mapped);

      const kernel = new SolverKernel(graph);
      const compiled = kernel.compile();

      const result = compiled([1, 2, 3, 4]);
      expect(Array.isArray(result)).toBe(true);
      expect(result).toHaveLength(2);
    });
  });

  describe('Complex operations', () => {
    it('should compile sort operation', () => {
      const graph = new Graph();
      const input = graph.input('data');
      const sorted = graph.sort(input);
      graph.output(sorted);

      const kernel = new SolverKernel(graph);
      const compiled = kernel.compile();

      const result = compiled([3, 1, 4, 1, 5]);
      expect(result).toEqual([1, 1, 3, 4, 5]);
    });

    it('should compile distinct operation', () => {
      const graph = new Graph();
      const input = graph.input('data');
      const distinct = graph.distinct(input);
      graph.output(distinct);

      const kernel = new SolverKernel(graph);
      const compiled = kernel.compile();

      const result = compiled([1, 2, 2, 3, 3, 3]);
      expect(result).toEqual([1, 2, 3]);
    });

    it('should compile flatten operation', () => {
      const graph = new Graph();
      const input = graph.input('data');
      const flattened = graph.flatten(input);
      graph.output(flattened);

      const kernel = new SolverKernel(graph);
      const compiled = kernel.compile();

      const result = compiled([[1, 2], [3, 4], [5]]);
      expect(result).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('Multiple inputs', () => {
    it('should handle multiple input parameters', () => {
      const graph = new Graph();
      const input1 = graph.input('a');
      const input2 = graph.input('b');
      const joined = graph.join(
        input1,
        input2,
        (x: any) => x.id,
        (x: any) => x.id
      );
      graph.output(joined);

      const kernel = new SolverKernel(graph);
      const compiled = kernel.compile();

      const result = compiled([{ id: 1, name: 'a' }], [{ id: 1, value: 10 }]);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('Profiling', () => {
    it('should save profile when requested', () => {
      const graph = new Graph();
      const input = graph.input('data');
      graph.output(input);

      const kernel = new SolverKernel(graph);
      const compiled = kernel.compile('balanced', true);

      expect(compiled).toBeInstanceOf(Function);
    });
  });

  describe('Metadata', () => {
    it('should attach metadata to compiled function', () => {
      const graph = new Graph();
      const input = graph.input('data');
      graph.output(input);

      const kernel = new SolverKernel(graph);
      const compiled: any = kernel.compile();

      expect(compiled._ioc_graph).toBe(graph);
      expect(compiled._ioc_optimize_for).toBeDefined();
    });
  });
});
