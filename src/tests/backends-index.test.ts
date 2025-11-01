/**
 * Tests for backends index exports
 */
import { describe, it, expect } from 'vitest';
import * as backends from '../backends';

describe('Backends module exports', () => {
  it('should export BackendType', () => {
    expect(backends.BackendType).toBeDefined();
  });

  it('should export BackendStrategy', () => {
    expect(backends.BackendStrategy).toBeDefined();
  });

  it('should export backend classes', () => {
    expect(backends.JavaScriptBackend).toBeDefined();
    expect(backends.WebAssemblyBackend).toBeDefined();
    expect(backends.LLVMBackend).toBeDefined();
    expect(backends.BackendSelector).toBeDefined();
  });

  it('should export backendSelector singleton', () => {
    expect(backends.backendSelector).toBeDefined();
    expect(backends.backendSelector).toBeInstanceOf(backends.BackendSelector);
  });
});
