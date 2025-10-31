/**
 * IOC Compilation Backends
 *
 * Exports all compilation backends and utilities.
 *
 * ## Available Backends:
 *
 * ### JavaScript Backend
 * - Always available
 * - Fast compilation (~1ms/node)
 * - Moderate performance (6/10)
 * - Runs anywhere JavaScript runs
 *
 * ### WebAssembly Backend
 * - Available in modern browsers and Node.js
 * - Moderate compilation (~5ms/node)
 * - Good performance (8/10)
 * - Portable and sandboxed
 *
 * ### LLVM Backend
 * - Available in Node.js with llvm-bindings
 * - Slower compilation (~20ms/node)
 * - Maximum performance (10/10)
 * - Native machine code generation
 *
 * ## Usage:
 *
 * ```typescript
 * import { backendSelector, BackendType } from '@ioc/compiler/backends';
 *
 * // Automatic selection (balanced)
 * const result = await backendSelector.compile(program);
 *
 * // Explicit backend
 * const result = await backendSelector.compile(program, {
 *   backend: BackendType.LLVM
 * });
 *
 * // Get available backends
 * const available = await backendSelector.getAvailableBackends();
 * // Returns: ['javascript', 'wasm', 'llvm']
 * ```
 */

export * from './types';
export * from './javascript-backend';
export * from './wasm-backend';
export * from './llvm-backend';
export * from './backend-selector';

// Re-export singleton
export { backendSelector } from './backend-selector';
