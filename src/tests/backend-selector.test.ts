/**
 * Tests for BackendSelector
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { BackendSelector } from '../backends/backend-selector';
import { BackendType, BackendStrategy } from '../backends/types';
import type { IOCProgram } from '../dsl/ioc-format';
import { createSimpleProgram, createLargeProgram, createEmptyProgram } from './test-helpers';

describe('BackendSelector', () => {
  let selector: BackendSelector;
  let simpleProgram: IOCProgram;

  beforeEach(() => {
    selector = new BackendSelector();
    simpleProgram = createSimpleProgram();
  });

  describe('initialization', () => {
    it('should create a BackendSelector instance', () => {
      expect(selector).toBeInstanceOf(BackendSelector);
    });

    it('should initialize and detect available backends', async () => {
      await selector.initialize();
      const backends = await selector.getAvailableBackends();
      expect(Array.isArray(backends)).toBe(true);
      // JavaScript backend should always be available
      expect(backends).toContain(BackendType.JAVASCRIPT);
    });

    it('should not re-initialize if already initialized', async () => {
      await selector.initialize();
      const backends1 = await selector.getAvailableBackends();

      await selector.initialize();
      const backends2 = await selector.getAvailableBackends();

      expect(backends1).toEqual(backends2);
    });
  });

  describe('getAvailableBackends', () => {
    it('should return an array of available backends', async () => {
      const backends = await selector.getAvailableBackends();
      expect(Array.isArray(backends)).toBe(true);
      expect(backends.length).toBeGreaterThan(0);
    });

    it('should include JavaScript backend', async () => {
      const backends = await selector.getAvailableBackends();
      expect(backends).toContain(BackendType.JAVASCRIPT);
    });
  });

  describe('selectBackend', () => {
    it('should select explicit backend when specified', async () => {
      const backend = await selector.selectBackend(simpleProgram, {
        strategy: BackendStrategy.EXPLICIT,
        explicitBackend: BackendType.JAVASCRIPT,
      });

      expect(backend.type).toBe(BackendType.JAVASCRIPT);
    });

    it('should throw error for unknown explicit backend', async () => {
      await expect(
        selector.selectBackend(simpleProgram, {
          strategy: BackendStrategy.EXPLICIT,
          explicitBackend: 'UNKNOWN' as any,
        })
      ).rejects.toThrow('Unknown backend');
    });

    it('should throw error for unavailable explicit backend', async () => {
      // Assuming LLVM might not be available in test environment
      const backends = await selector.getAvailableBackends();
      if (!backends.includes(BackendType.LLVM)) {
        await expect(
          selector.selectBackend(simpleProgram, {
            strategy: BackendStrategy.EXPLICIT,
            explicitBackend: BackendType.LLVM,
          })
        ).rejects.toThrow('not available');
      }
    });

    it('should select backend with FASTEST_COMPILE strategy', async () => {
      const backend = await selector.selectBackend(simpleProgram, {
        strategy: BackendStrategy.FASTEST_COMPILE,
      });

      expect(backend).toBeDefined();
      expect(backend.type).toBeDefined();
    });

    it('should select backend with FASTEST_RUNTIME strategy', async () => {
      const backend = await selector.selectBackend(simpleProgram, {
        strategy: BackendStrategy.FASTEST_RUNTIME,
      });

      expect(backend).toBeDefined();
      expect(backend.type).toBeDefined();
    });

    it('should select backend with MOST_PORTABLE strategy', async () => {
      const backend = await selector.selectBackend(simpleProgram, {
        strategy: BackendStrategy.MOST_PORTABLE,
      });

      expect(backend).toBeDefined();
      expect(backend.type).toBeDefined();
    });

    it('should select backend with BALANCED strategy', async () => {
      const backend = await selector.selectBackend(simpleProgram, {
        strategy: BackendStrategy.BALANCED,
      });

      expect(backend).toBeDefined();
      expect(backend.type).toBeDefined();
    });

    it('should default to BALANCED strategy for unknown strategy', async () => {
      const backend = await selector.selectBackend(simpleProgram, {
        strategy: 'UNKNOWN' as any,
      });

      expect(backend).toBeDefined();
    });
  });

  describe('compile', () => {
    it('should compile with default options', async () => {
      const result = await selector.compile(simpleProgram);

      expect(result).toBeDefined();
      expect(result.backend).toBeDefined();
      expect(typeof result.execute).toBe('function');
      expect(typeof result.codeSize).toBe('number');
      expect(typeof result.compilationTime).toBe('number');
    });

    it('should compile with explicit backend', async () => {
      const result = await selector.compile(simpleProgram, {
        backend: BackendType.JAVASCRIPT,
      });

      expect(result.backend).toBe(BackendType.JAVASCRIPT);
    });

    it('should compile and execute a simple program', async () => {
      const result = await selector.compile(simpleProgram);
      const output = result.execute([1, 2, 3]);

      expect(output).toBeDefined();
    });

    it('should handle optimization level', async () => {
      const result = await selector.compile(simpleProgram, {
        optimizationLevel: 2,
      });

      expect(result).toBeDefined();
    });

    it('should handle debug mode', async () => {
      const result = await selector.compile(simpleProgram, {
        debug: true,
      });

      expect(result).toBeDefined();
      expect(result.metadata).toBeDefined();
    });
  });

  describe('getBackendInfo', () => {
    it('should return backend info for valid type', () => {
      const info = selector.getBackendInfo(BackendType.JAVASCRIPT);
      expect(info).toBeDefined();
      expect(info?.type).toBe(BackendType.JAVASCRIPT);
    });

    it('should return undefined for invalid type', () => {
      const info = selector.getBackendInfo('INVALID' as any);
      expect(info).toBeUndefined();
    });

    it('should return backend with correct name', () => {
      const info = selector.getBackendInfo(BackendType.JAVASCRIPT);
      expect(info?.name).toBeDefined();
      expect(typeof info?.name).toBe('string');
    });
  });

  describe('isBackendAvailable', () => {
    it('should return true for JavaScript backend', async () => {
      const available = await selector.isBackendAvailable(BackendType.JAVASCRIPT);
      expect(available).toBe(true);
    });

    it('should initialize if not already initialized', async () => {
      const newSelector = new BackendSelector();
      const available = await newSelector.isBackendAvailable(BackendType.JAVASCRIPT);
      expect(available).toBe(true);
    });
  });

  describe('strategy selection logic', () => {
    it('should prefer faster compile time for FASTEST_COMPILE', async () => {
      const backend = await selector.selectBackend(simpleProgram, {
        strategy: BackendStrategy.FASTEST_COMPILE,
      });

      // JavaScript typically has fastest compile time
      expect(backend.type).toBe(BackendType.JAVASCRIPT);
    });

    it('should handle large programs', async () => {
      const largeProgram = createLargeProgram(100);

      const backend = await selector.selectBackend(largeProgram, {
        strategy: BackendStrategy.BALANCED,
      });

      expect(backend).toBeDefined();
    });
  });

  describe('backend estimation methods', () => {
    it('should estimate compilation time', async () => {
      const backend = await selector.selectBackend(simpleProgram, {
        strategy: BackendStrategy.BALANCED,
      });

      const estimate = backend.estimateCompilationTime(simpleProgram);
      expect(typeof estimate).toBe('number');
      expect(estimate).toBeGreaterThanOrEqual(0);
    });

    it('should estimate performance score', async () => {
      const backend = await selector.selectBackend(simpleProgram, {
        strategy: BackendStrategy.BALANCED,
      });

      const score = backend.estimatePerformanceScore();
      expect(typeof score).toBe('number');
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(10);
    });
  });

  describe('error handling', () => {
    it('should handle empty nodes array', async () => {
      const emptyProgram = createEmptyProgram();

      const backend = await selector.selectBackend(emptyProgram, {
        strategy: BackendStrategy.BALANCED,
      });

      expect(backend).toBeDefined();
    });
  });
});
