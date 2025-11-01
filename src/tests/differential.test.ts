import { describe, it, expect } from 'vitest';
import { Graph } from '../core/graph';
import { DifferentialTester, createTestSuite } from '../core/differential';

describe('DifferentialTester', () => {
  it('should create tester with graph', () => {
    const graph = new Graph();
    const tester = new DifferentialTester(graph);
    expect(tester).toBeDefined();
  });

  it('should test all strategies', () => {
    const graph = new Graph();
    const input = graph.input('data');
    graph.output(input);

    const tester = new DifferentialTester(graph);
    const result = tester.testAllStrategies({ data: [1, 2, 3] });

    expect(result.executions.length).toBeGreaterThan(0);
    expect(result).toHaveProperty('allMatch');
    expect(result).toHaveProperty('mismatches');
  });

  it('should test with specific strategies', () => {
    const graph = new Graph();
    const input = graph.input('data');
    graph.output(input);

    const tester = new DifferentialTester(graph);
    const result = tester.testAllStrategies({ data: [1, 2, 3] }, ['naive']);

    expect(result.executions.length).toBe(1);
  });

  it('should throw error when baseline not found', () => {
    const graph = new Graph();
    const input = graph.input('data');
    graph.output(input);

    const tester = new DifferentialTester(graph);

    expect(() => tester.testAllStrategies({ data: [] }, ['optimized'])).toThrow();
  });

  it.skip('should test with optimizations', () => {
    const graph = new Graph();
    const input = graph.input('data');
    const filtered = graph.filter(input, (x: any) => x > 0);
    graph.output(filtered);

    const tester = new DifferentialTester(graph);
    const result = tester.testWithOptimizations({ data: [1, 2, 3] });

    expect(result.executions.length).toBe(2);
    expect(result.baselineName).toBe('unoptimized');
  });

  it.skip('should test with specific optimization passes', () => {
    const graph = new Graph();
    const input = graph.input('data');
    const filter1 = graph.filter(input, (x: any) => x > 0);
    const filter2 = graph.filter(filter1, (x: any) => x < 100);
    graph.output(filter2);

    const tester = new DifferentialTester(graph);
    const result = tester.testWithOptimizations({ data: [1, 2, 3] }, ['filter_fusion']);

    expect(result.executions.length).toBe(2);
  });

  it.skip('should test with specific optimization passes', () => {
    const graph = new Graph();
    const input = graph.input('data');
    const filter1 = graph.filter(input, (x: any) => x > 0);
    const filter2 = graph.filter(filter1, (x: any) => x < 100);
    graph.output(filter2);

    const tester = new DifferentialTester(graph);
    const result = tester.testWithOptimizations({ data: [1, 2, 3] }, ['filter_fusion']);

    expect(result.executions.length).toBe(2);
  });

  it('should format test report', () => {
    const graph = new Graph();
    const input = graph.input('data');
    graph.output(input);

    const tester = new DifferentialTester(graph);
    const result = tester.testAllStrategies({ data: [1, 2, 3] });
    const report = tester.formatReport(result);

    expect(report).toContain('Differential Testing Report');
    expect(report).toContain('Status:');
    expect(report).toContain('Executions:');
  });

  it('should show mismatches in report', () => {
    const graph = new Graph();
    const input = graph.input('data');
    graph.output(input);

    const tester = new DifferentialTester(graph);
    const result = tester.testAllStrategies({ data: [1, 2, 3] });

    // Manually set up a mismatch for testing
    result.allMatch = false;
    result.mismatches.push(['naive', 'optimized']);

    const report = tester.formatReport(result);
    expect(report).toContain('FAIL');
    expect(report).toContain('Mismatches');
  });

  it('should show performance comparison in report', () => {
    const graph = new Graph();
    const input = graph.input('data');
    graph.output(input);

    const tester = new DifferentialTester(graph);
    const result = tester.testAllStrategies({ data: [1, 2, 3] });

    const report = tester.formatReport(result);
    expect(report).toContain('Executions:');
  });

  it('should identify fastest execution', () => {
    const graph = new Graph();
    const input = graph.input('data');
    graph.output(input);

    const tester = new DifferentialTester(graph);
    const result = tester.testAllStrategies({ data: [1, 2, 3] });
    const report = tester.formatReport(result);

    expect(report).toContain('Fastest:');
  });
});

describe('createTestSuite', () => {
  it.skip('should run multiple test cases', () => {
    const graph = new Graph();
    const input = graph.input('data');
    graph.output(input);

    const testCases = [{ data: [1, 2, 3] }, { data: [4, 5, 6] }];

    const results = createTestSuite(graph, testCases);

    expect(results.length).toBe(2);
  });

  it.skip('should handle empty test suite', () => {
    const graph = new Graph();
    const input = graph.input('data');
    graph.output(input);

    const results = createTestSuite(graph, []);

    expect(results.length).toBe(0);
  });

  it.skip('should handle single test case', () => {
    const graph = new Graph();
    const input = graph.input('data');
    graph.output(input);

    const results = createTestSuite(graph, [{ data: [1, 2, 3] }]);

    expect(results.length).toBe(1);
  });
});
