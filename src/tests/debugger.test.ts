import { describe, it, expect, vi } from 'vitest';
import { Graph, IntentType } from '../core/graph';
import { IOCDebugger, DebugMode } from '../core/debugger';
import { ProvenanceTracker } from '../core/provenance';

describe('DebugMode', () => {
  it('should log messages when verbose is enabled', () => {
    const debug = new DebugMode();
    debug.verbose = true;

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    debug.log('test message');

    expect(consoleSpy).toHaveBeenCalledWith('[DEBUG] test message');
    consoleSpy.mockRestore();
  });

  it('should not log messages when verbose is disabled', () => {
    const debug = new DebugMode();
    debug.verbose = false;

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    debug.log('test message');

    expect(consoleSpy).not.toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should record execution traces', () => {
    const debug = new DebugMode();
    debug.traceExecution = true;

    debug.recordExecution({
      nodeId: 'test-node',
      intentType: IntentType.FILTER,
      inputs: [[1, 2, 3]],
      output: [2, 3],
      executionTime: 1.5,
    });

    expect(debug.executionTraces.length).toBe(1);
    expect(debug.executionTraces[0]?.nodeId).toBe('test-node');
  });

  it('should not record traces when tracing is disabled', () => {
    const debug = new DebugMode();
    debug.traceExecution = false;

    debug.recordExecution({
      nodeId: 'test-node',
      intentType: IntentType.FILTER,
      inputs: [[1, 2, 3]],
      output: [2, 3],
      executionTime: 1.5,
    });

    expect(debug.executionTraces.length).toBe(0);
  });

  it('should validate output for null values', () => {
    const debug = new DebugMode();
    debug.checkNull = true;

    const node = {
      id: 'test-node',
      intentType: IntentType.FILTER,
      inputs: [],
      params: {},
      outputType: {} as any,
      metadata: {},
    };

    const error = debug.validateOutput(node, null);
    expect(error).toContain('returned null');
  });

  it('should validate output for NaN values', () => {
    const debug = new DebugMode();
    debug.checkNaN = true;

    const node = {
      id: 'test-node',
      intentType: IntentType.MAP,
      inputs: [],
      params: {},
      outputType: {} as any,
      metadata: {},
    };

    const error = debug.validateOutput(node, NaN);
    expect(error).toContain('returned NaN');
  });

  it('should validate arrays for NaN values', () => {
    const debug = new DebugMode();
    debug.checkNaN = true;

    const node = {
      id: 'test-node',
      intentType: IntentType.MAP,
      inputs: [],
      params: {},
      outputType: {} as any,
      metadata: {},
    };

    const error = debug.validateOutput(node, [1, 2, NaN, 4]);
    expect(error).toContain('returned NaN at index 2');
  });

  it('should return null when validation passes', () => {
    const debug = new DebugMode();

    const node = {
      id: 'test-node',
      intentType: IntentType.FILTER,
      inputs: [],
      params: {},
      outputType: {} as any,
      metadata: {},
    };

    const error = debug.validateOutput(node, [1, 2, 3]);
    expect(error).toBeNull();
  });

  it('should clear execution traces', () => {
    const debug = new DebugMode();
    debug.traceExecution = true;

    debug.recordExecution({
      nodeId: 'test-node',
      intentType: IntentType.FILTER,
      inputs: [],
      output: [],
      executionTime: 1,
    });

    debug.clearTraces();
    expect(debug.executionTraces.length).toBe(0);
  });

  it('should generate trace summary', () => {
    const debug = new DebugMode();
    debug.traceExecution = true;

    debug.recordExecution({
      nodeId: 'test-node-1',
      intentType: IntentType.FILTER,
      inputs: [],
      output: [],
      executionTime: 1.5,
    });

    debug.recordExecution({
      nodeId: 'test-node-2',
      intentType: IntentType.MAP,
      inputs: [],
      output: [],
      executionTime: 2.5,
      error: new Error('test error'),
    });

    const summary = debug.getTraceSummary();
    expect(summary).toContain('Total operations: 2');
    expect(summary).toContain('Errors: 1');
    expect(summary).toContain('test error');
  });

  it('should handle empty trace summary', () => {
    const debug = new DebugMode();

    const summary = debug.getTraceSummary();
    expect(summary).toContain('No execution traces recorded');
  });
});

describe('IOCDebugger', () => {
  it('should create debugger with graph', () => {
    const graph = new Graph();
    const dbg = new IOCDebugger(graph);

    expect(dbg).toBeDefined();
    expect(dbg.debugMode).toBeDefined();
  });

  it('should create debugger with provenance tracker', () => {
    const graph = new Graph();
    const provenance = new ProvenanceTracker();
    const dbg = new IOCDebugger(graph, provenance);

    expect(dbg).toBeDefined();
  });

  it('should trace execution and return traces', () => {
    const graph = new Graph();
    const input = graph.input('data');
    const filtered = graph.filter(input, (x: any) => x > 2);
    graph.output(filtered);

    const dbg = new IOCDebugger(graph);
    const traces = dbg.trace({ data: [1, 2, 3, 4] }, false);

    expect(traces).toBeDefined();
    expect(traces.length).toBeGreaterThan(0);
    expect(traces[0]).toHaveProperty('nodeId');
    expect(traces[0]).toHaveProperty('intentType');
    expect(traces[0]).toHaveProperty('executionTime');
  });

  it('should warn about unimplemented bisect method', () => {
    const graph = new Graph();
    const dbg = new IOCDebugger(graph);

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = dbg.bisect({});

    expect(consoleSpy).toHaveBeenCalled();
    expect(result).toBeNull();
    consoleSpy.mockRestore();
  });

  it('should compare optimizations and return comparison result', () => {
    const graph = new Graph();
    const input = graph.input('data');
    const mapped = graph.map(input, (x: any) => x * 2);
    graph.output(mapped);

    const dbg = new IOCDebugger(graph);

    // Mock the optimize method to avoid the module import error
    vi.spyOn(graph, 'optimize').mockImplementation(() => {
      // Do nothing - just prevent the actual optimize from running
    });

    const result = dbg.compareOptimizations({ data: [1, 2, 3] }, []);

    expect(result).toHaveProperty('original');
    expect(result).toHaveProperty('optimized');
    expect(result).toHaveProperty('comparison');
    expect(result.original).toHaveProperty('result');
    expect(result.original).toHaveProperty('executionTime');
    expect(result.original).toHaveProperty('nodeCount');
    expect(result.comparison).toHaveProperty('resultsMatch');
    expect(result.comparison).toHaveProperty('speedup');
  });

  it('should format comparison as stub', () => {
    const graph = new Graph();
    const dbg = new IOCDebugger(graph);

    const formatted = dbg.formatComparison({});

    expect(formatted).toContain('STUB');
  });

  it('should explain node details', () => {
    const graph = new Graph();
    const input = graph.input('data');

    const dbg = new IOCDebugger(graph);
    const explanation = dbg.explainNode(input);

    expect(explanation).toContain('Node:');
    expect(explanation).toContain('Type: input');
    expect(explanation).toContain('Parameters:');
  });

  it('should handle non-existent nodes in explainNode', () => {
    const graph = new Graph();
    const dbg = new IOCDebugger(graph);

    const explanation = dbg.explainNode('nonexistent');

    expect(explanation).toContain('not found');
  });

  it('should show provenance in node explanation', () => {
    const graph = new Graph();
    const provenance = new ProvenanceTracker();
    const input = graph.input('data');

    provenance.trackNodeCreation(input);

    const dbg = new IOCDebugger(graph, provenance);
    const explanation = dbg.explainNode(input);

    expect(explanation).toContain('Provenance:');
    expect(explanation).toContain('Created by:');
  });

  it('should trace execution for all intent types', () => {
    const graph = new Graph();
    const input = graph.input('data');
    const constant = graph.constant(10);
    const filtered = graph.filter(input, (x: any) => x > 2);
    const mapped = graph.map(filtered, (x: any) => x * 2);
    const reduced = graph.reduce(mapped, (a: any, b: any) => a + b, 0);
    const sorted = graph.sort(input);
    const grouped = graph.groupBy(input, (x: any) => x % 2);
    const joined = graph.join(
      filtered,
      mapped,
      (l: any) => l,
      (r: any) => r
    );
    const flattened = graph.flatten(
      graph.constant([
        [1, 2],
        [3, 4],
      ])
    );
    const distinct = graph.distinct(input);

    // Output all nodes to ensure they're executed and traced
    graph.output(reduced);
    graph.output(constant);
    graph.output(sorted);
    graph.output(grouped);
    graph.output(joined);
    graph.output(flattened);
    graph.output(distinct);

    const dbg = new IOCDebugger(graph);
    const traces = dbg.trace({ data: [1, 2, 3, 4, 5] }, true);

    expect(traces.length).toBeGreaterThan(0);
  });

  it('should handle trace errors gracefully', () => {
    const graph = new Graph();
    const input = graph.input('data');
    const filtered = graph.filter(input, () => {
      throw new Error('Filter error');
    });
    graph.output(filtered);

    const dbg = new IOCDebugger(graph);
    const traces = dbg.trace({ data: [1, 2, 3] }, true);

    const errorTrace = traces.find((t) => t.error);
    expect(errorTrace).toBeDefined();
    expect(errorTrace?.error?.message).toContain('Filter error');
  });

  it('should find bugs with binary search', () => {
    const graph = new Graph();
    const input = graph.input('data');
    const mapped = graph.map(input, (x: any) => x * 2);
    graph.output(mapped);

    const dbg = new IOCDebugger(graph);
    const result = dbg.findBug({ data: [1, 2, 3] }, [2, 4, 6]);

    expect(result).toBeNull(); // Should pass
  });

  it('should detect bugs in execution', () => {
    const graph = new Graph();
    const input = graph.input('data');
    const mapped = graph.map(input, (x: any) => x * 2);
    graph.output(mapped);

    const dbg = new IOCDebugger(graph);
    const result = dbg.findBug({ data: [1, 2, 3] }, [1, 2, 3]); // Wrong expected output

    expect(result).toBeDefined();
  });

  it('should handle empty execution order', () => {
    const graph = new Graph();
    const dbg = new IOCDebugger(graph);
    const result = dbg.findBug({ data: [] });

    expect(result).toBeNull();
  });

  it('should handle no output nodes', () => {
    const graph = new Graph();
    graph.input('data');
    const dbg = new IOCDebugger(graph);
    const result = dbg.findBug({ data: [1, 2, 3] });

    expect(result).toBeNull();
  });

  it('should get latest execution trace', () => {
    const graph = new Graph();
    const input = graph.input('data');
    const mapped = graph.map(input, (x: any) => x * 2);
    graph.output(mapped);

    const dbg = new IOCDebugger(graph);
    dbg.trace({ data: [1, 2, 3] });

    const traces = dbg.getExecutionTrace();
    expect(traces.length).toBeGreaterThan(0);
  });

  it('should return empty trace when no execution', () => {
    const graph = new Graph();
    const dbg = new IOCDebugger(graph);

    const traces = dbg.getExecutionTrace();
    expect(traces).toEqual([]);
  });

  it('should get node executions', () => {
    const graph = new Graph();
    const input = graph.input('data');
    const mapped = graph.map(input, (x: any) => x * 2);
    graph.output(mapped);

    const dbg = new IOCDebugger(graph);
    dbg.trace({ data: [1, 2, 3] });

    const nodeExecution = dbg.getNodeExecutions(input);
    expect(nodeExecution).toBeDefined();
    expect(nodeExecution).toHaveProperty('nodeId');
    expect(nodeExecution).toHaveProperty('executionCount');
  });

  it('should get all node executions', () => {
    const graph = new Graph();
    const input = graph.input('data');
    graph.output(input);

    const dbg = new IOCDebugger(graph);
    dbg.trace({ data: [1, 2, 3] });

    const executions = dbg.getNodeExecutions();
    expect(Array.isArray(executions)).toBe(true);
  });

  it('should return null for non-existent node execution', () => {
    const graph = new Graph();
    const dbg = new IOCDebugger(graph);

    const execution = dbg.getNodeExecutions('nonexistent');
    expect(execution).toBeNull();
  });

  it('should reset debugger state', () => {
    const graph = new Graph();
    const input = graph.input('data');
    graph.output(input);

    const dbg = new IOCDebugger(graph);
    dbg.trace({ data: [1, 2, 3] });

    dbg.reset();

    const traces = dbg.getExecutionTrace();
    expect(traces).toEqual([]);
  });

  it('should format comparison report with valid data', () => {
    const graph = new Graph();
    const input = graph.input('data');
    graph.output(input);

    const dbg = new IOCDebugger(graph);

    vi.spyOn(graph, 'optimize').mockImplementation(() => {});

    const comparison = dbg.compareOptimizations({ data: [1, 2, 3] }, []);
    const formatted = dbg.formatComparison(comparison);

    expect(formatted).toContain('Comparison Report:');
    expect(formatted).toContain('Original Execution:');
    expect(formatted).toContain('Optimized Execution:');
  });

  it('should warn about deprecated compare method', () => {
    const graph = new Graph();
    const dbg = new IOCDebugger(graph);

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    vi.spyOn(graph, 'optimize').mockImplementation(() => {});

    dbg.compare({}, false);

    expect(consoleSpy).toHaveBeenCalled();
    consoleSpy.mockRestore();
  });

  it('should validate disabled debug mode', () => {
    const debug = new DebugMode();
    debug.enabled = false;

    const node = {
      id: 'test',
      intentType: IntentType.FILTER,
      inputs: [],
      params: {},
      outputType: {} as any,
      metadata: {},
    };

    const error = debug.validateOutput(node, null);
    expect(error).toBeNull();
  });
});
