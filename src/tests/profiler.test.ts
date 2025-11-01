import { describe, it, expect, afterEach } from 'vitest';
import { PerformanceProfiler, getProfiler } from '../solvers/profiler';
import * as fs from 'fs';

describe('PerformanceProfiler', () => {
  const testProfileFile = '.test_profile.json';

  afterEach(() => {
    // Clean up test file
    if (fs.existsSync(testProfileFile)) {
      fs.unlinkSync(testProfileFile);
    }
  });

  it('should create profiler', () => {
    const profiler = new PerformanceProfiler(testProfileFile);
    expect(profiler).toBeDefined();
  });

  it('should record execution', () => {
    const profiler = new PerformanceProfiler(testProfileFile);
    profiler.recordExecution('filter', 'NaiveStrategy', 100, 10.5);

    const cost = profiler.getCostEstimate('filter', 'NaiveStrategy', 100);
    expect(cost).toBeCloseTo(10.5, 1);
  });

  it('should update execution with moving average', () => {
    const profiler = new PerformanceProfiler(testProfileFile);
    profiler.recordExecution('filter', 'NaiveStrategy', 100, 10);
    profiler.recordExecution('filter', 'NaiveStrategy', 100, 20);

    const cost = profiler.getCostEstimate('filter', 'NaiveStrategy', 100);
    expect(cost).toBeGreaterThan(10);
    expect(cost).toBeLessThan(20);
  });

  it('should bucket sizes correctly', () => {
    const profiler = new PerformanceProfiler(testProfileFile);

    expect(profiler.bucketSize(5)).toBe(5);
    expect(profiler.bucketSize(15)).toBe(10);
    expect(profiler.bucketSize(150)).toBe(100);
    expect(profiler.bucketSize(1500)).toBe(1000);
  });

  it('should return default cost for unknown operations', () => {
    const profiler = new PerformanceProfiler(testProfileFile);

    const cost = profiler.getCostEstimate('unknown', 'Strategy', 100);
    expect(cost).toBeGreaterThan(0);
  });

  it('should scale costs for similar sizes', () => {
    const profiler = new PerformanceProfiler(testProfileFile);
    profiler.recordExecution('filter', 'Strategy', 100, 10);

    const cost = profiler.getCostEstimate('filter', 'Strategy', 200);
    expect(cost).toBeGreaterThan(10);
  });

  it('should generate performance report', () => {
    const profiler = new PerformanceProfiler(testProfileFile);
    profiler.recordExecution('filter', 'NaiveStrategy', 100, 10);
    profiler.recordExecution('map', 'OptimizedStrategy', 200, 5);

    const report = profiler.getReport();
    expect(report).toContain('filter');
    expect(report).toContain('map');
  });

  it('should return message for empty profile', () => {
    const profiler = new PerformanceProfiler(testProfileFile);

    const report = profiler.getReport();
    expect(report).toContain('No profiling data');
  });

  it('should save and load profiles', () => {
    const profiler1 = new PerformanceProfiler(testProfileFile);
    profiler1.recordExecution('filter', 'Strategy', 100, 15);
    profiler1.saveProfiles();

    const profiler2 = new PerformanceProfiler(testProfileFile);
    const cost = profiler2.getCostEstimate('filter', 'Strategy', 100);
    expect(cost).toBeCloseTo(15, 1);
  });

  it('should handle corrupted profile file', () => {
    fs.writeFileSync(testProfileFile, 'invalid json', 'utf-8');

    const profiler = new PerformanceProfiler(testProfileFile);
    expect(profiler).toBeDefined();
  });

  it('should handle missing profile file', () => {
    const profiler = new PerformanceProfiler(testProfileFile);
    expect(profiler).toBeDefined();
  });

  describe('Default cost estimates', () => {
    it('should have cost estimates for common operations', () => {
      const profiler = new PerformanceProfiler(testProfileFile);

      const filterCost = profiler.getCostEstimate('filter', 'unknown', 100);
      const mapCost = profiler.getCostEstimate('map', 'unknown', 100);
      const reduceCost = profiler.getCostEstimate('reduce', 'unknown', 100);

      expect(filterCost).toBeGreaterThan(0);
      expect(mapCost).toBeGreaterThan(0);
      expect(reduceCost).toBeGreaterThan(0);
    });
  });
});

describe('getProfiler', () => {
  it('should return global profiler instance', () => {
    const profiler1 = getProfiler();
    const profiler2 = getProfiler();

    expect(profiler1).toBe(profiler2);
  });
});
