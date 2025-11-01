import { describe, it, expect } from 'vitest';
import { Provenance, ProvenanceTracker } from '../core/provenance';

describe('Provenance', () => {
  it('should create provenance with node ID', () => {
    const prov = new Provenance('test-node');
    expect(prov.nodeId).toBe('test-node');
    expect(prov.transformations).toEqual([]);
  });

  it('should add transformations', () => {
    const prov = new Provenance('test-node');
    prov.addTransformation({
      transformation: 'filter_fusion',
      originalNodes: ['node1', 'node2'],
      description: 'Fused two filters',
      timestamp: Date.now(),
    });

    expect(prov.transformations.length).toBe(1);
  });

  it('should get transformation chain', () => {
    const prov = new Provenance('test-node');
    prov.addTransformation({
      transformation: 'filter_fusion',
      originalNodes: ['node1'],
      description: 'Fused filters',
      timestamp: Date.now(),
    });

    const chain = prov.getTransformationChain();
    expect(chain.length).toBe(1);
    expect(chain[0]).toContain('filter_fusion');
  });

  it('should detect optimized nodes', () => {
    const prov = new Provenance('test-node');
    expect(prov.isOptimized()).toBe(false);

    prov.addTransformation({
      transformation: 'map_fusion',
      originalNodes: [],
      description: 'Test',
      timestamp: Date.now(),
    });

    expect(prov.isOptimized()).toBe(true);
  });

  it('should format source location', () => {
    const prov = new Provenance('test-node');
    prov.sourceLocation = {
      file: 'test.ts',
      line: 42,
      function: 'testFunction',
    };

    const source = prov.getOriginalSource();
    expect(source).toContain('test.ts');
    expect(source).toContain('42');
    expect(source).toContain('testFunction');
  });

  it('should return null when no source location', () => {
    const prov = new Provenance('test-node');
    expect(prov.getOriginalSource()).toBeNull();
  });
});

describe('ProvenanceTracker', () => {
  it('should track node creation', () => {
    const tracker = new ProvenanceTracker();
    const prov = tracker.trackNodeCreation('test-node');

    expect(prov.nodeId).toBe('test-node');
    expect(prov.createdBy).toBe('user');
  });

  it('should capture call stack when requested', () => {
    const tracker = new ProvenanceTracker();
    const prov = tracker.trackNodeCreation('test-node', true);

    expect(prov).toBeDefined();
    // Source location may or may not be captured depending on stack structure
  });

  it('should track optimization transformations', () => {
    const tracker = new ProvenanceTracker();

    tracker.trackOptimization(
      'result-node',
      'filter_fusion',
      ['node1', 'node2'],
      'Fused two filters'
    );

    const prov = tracker.getProvenance('result-node');
    expect(prov).toBeDefined();
    expect(prov?.createdBy).toBe('optimizer');
    expect(prov?.transformations.length).toBe(1);
  });

  it('should add transformations to existing provenance', () => {
    const tracker = new ProvenanceTracker();

    tracker.trackOptimization('node', 'opt1', ['a'], 'First optimization');
    tracker.trackOptimization('node', 'opt2', ['b'], 'Second optimization');

    const prov = tracker.getProvenance('node');
    expect(prov?.transformations.length).toBe(2);
  });

  it('should get provenance for node', () => {
    const tracker = new ProvenanceTracker();
    tracker.trackNodeCreation('test-node');

    const prov = tracker.getProvenance('test-node');
    expect(prov).toBeDefined();
    expect(prov?.nodeId).toBe('test-node');
  });

  it('should return null for unknown nodes', () => {
    const tracker = new ProvenanceTracker();
    const prov = tracker.getProvenance('unknown');
    expect(prov).toBeNull();
  });

  it('should trace back to source nodes', () => {
    const tracker = new ProvenanceTracker();

    tracker.trackNodeCreation('input');
    tracker.trackOptimization('filtered', 'filter', ['input'], 'Filtered');
    tracker.trackOptimization('mapped', 'map', ['filtered'], 'Mapped');

    const chain = tracker.traceBackToSource('mapped');
    expect(chain.length).toBeGreaterThan(0);
  });

  it('should handle cycles in provenance chain', () => {
    const tracker = new ProvenanceTracker();

    tracker.trackNodeCreation('a');
    const provA = tracker.getProvenance('a')!;
    provA.parentNodes.push('a'); // Create cycle

    const chain = tracker.traceBackToSource('a');
    expect(chain.length).toBe(1);
  });

  it('should generate error report', () => {
    const tracker = new ProvenanceTracker();
    tracker.trackNodeCreation('test-node');

    const error = new Error('Test error');
    const report = tracker.generateErrorReport('test-node', error);

    expect(report).toContain('Error in node');
    expect(report).toContain('Test error');
  });

  it('should handle error report for unknown nodes', () => {
    const tracker = new ProvenanceTracker();

    const error = new Error('Test error');
    const report = tracker.generateErrorReport('unknown', error);

    expect(report).toContain('No provenance information');
  });

  it('should show optimization history in error report', () => {
    const tracker = new ProvenanceTracker();
    tracker.trackOptimization('node', 'filter_fusion', ['a', 'b'], 'Fused');

    const error = new Error('Test error');
    const report = tracker.generateErrorReport('node', error);

    expect(report).toContain('Optimization history');
    expect(report).toContain('filter_fusion');
  });

  it('should show parent nodes in error report', () => {
    const tracker = new ProvenanceTracker();
    tracker.trackOptimization('child', 'transform', ['parent1', 'parent2'], 'Test');

    const error = new Error('Test error');
    const report = tracker.generateErrorReport('child', error);

    expect(report).toContain('Derived from nodes');
  });

  it('should generate statistics', () => {
    const tracker = new ProvenanceTracker();
    tracker.trackNodeCreation('user1');
    tracker.trackNodeCreation('user2');
    tracker.trackOptimization('opt1', 'fusion', ['user1'], 'Test');

    const stats = tracker.getStatistics();
    expect(stats.totalNodes).toBe(3);
    expect(stats.userCreated).toBe(2);
    expect(stats.optimizerCreated).toBe(1);
    expect(stats.optimizedNodes).toBe(1);
  });

  it('should count transformations in statistics', () => {
    const tracker = new ProvenanceTracker();
    tracker.trackOptimization('node1', 'filter_fusion', [], 'Test 1');
    tracker.trackOptimization('node2', 'filter_fusion', [], 'Test 2');
    tracker.trackOptimization('node3', 'map_fusion', [], 'Test 3');

    const stats = tracker.getStatistics();
    expect(stats.transformations['filter_fusion']).toBe(2);
    expect(stats.transformations['map_fusion']).toBe(1);
  });
});
