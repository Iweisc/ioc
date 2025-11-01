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

  it('should warn about unimplemented trace method', () => {
    const graph = new Graph();
    const dbg = new IOCDebugger(graph);

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const traces = dbg.trace({}, false);

    expect(consoleSpy).toHaveBeenCalled();
    expect(traces).toEqual([]);
    consoleSpy.mockRestore();
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

  it('should warn about unimplemented compare method', () => {
    const graph = new Graph();
    const dbg = new IOCDebugger(graph);

    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const result = dbg.compare({});

    expect(consoleSpy).toHaveBeenCalled();
    expect(result).toHaveProperty('original');
    expect(result).toHaveProperty('optimized');
    consoleSpy.mockRestore();
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
});
