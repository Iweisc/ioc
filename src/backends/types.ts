/**
 * IOC Backend Types
 *
 * Defines the common interface for compilation backends (LLVM, WebAssembly, JavaScript).
 */

import type { IOCProgram } from '../dsl/ioc-format';

/**
 * Supported compilation backends
 */
export enum BackendType {
  /**
   * JavaScript backend - default, runs in any JS environment
   * Fast to compile, moderate performance
   */
  JAVASCRIPT = 'javascript',

  /**
   * LLVM backend - maximum performance via native code generation
   * Slower to compile, maximum performance
   * Ideal for: Server-side, long-running processes, Solver Kernel
   */
  LLVM = 'llvm',

  /**
   * WebAssembly backend - portable binary format
   * Moderate compile time, good performance, universal compatibility
   * Ideal for: Browsers, edge computing, sandboxed execution
   */
  WASM = 'wasm',
}

/**
 * Compilation options for all backends
 */
export interface CompilationOptions {
  /** Target backend */
  backend: BackendType;

  /** Optimization level: 0 (none) to 3 (aggressive) */
  optimizationLevel?: 0 | 1 | 2 | 3;

  /** Enable debug symbols and source maps */
  debug?: boolean;

  /** Target architecture (for LLVM) */
  targetArch?: 'x86_64' | 'arm64' | 'wasm32';

  /** Maximum memory usage in bytes */
  maxMemory?: number;

  /** Timeout in milliseconds */
  timeout?: number;

  /** Enable bounds checking (affects performance) */
  boundsChecking?: boolean;
}

/**
 * Result of compilation
 */
export interface CompilationResult {
  /** The backend that produced this result */
  backend: BackendType;

  /** Compiled executable function */
  execute: (input: any) => any;

  /** Size of compiled code in bytes */
  codeSize: number;

  /** Compilation time in milliseconds */
  compilationTime: number;

  /** Additional backend-specific metadata */
  metadata: {
    /** LLVM-specific: LLVM IR code */
    llvmIR?: string;

    /** WASM-specific: WebAssembly binary */
    wasmBinary?: Uint8Array;

    /** JavaScript-specific: Generated JS code */
    jsCode?: string;

    /** Optimization passes applied */
    optimizations?: string[];
  };
}

/**
 * Common interface that all compilation backends must implement
 */
export interface CompilationBackend {
  /** Backend identifier */
  readonly type: BackendType;

  /** Human-readable backend name */
  readonly name: string;

  /** Whether this backend is available on the current platform */
  isAvailable(): Promise<boolean>;

  /**
   * Compile an IOC program to executable form
   */
  compile(program: IOCProgram, options?: Partial<CompilationOptions>): Promise<CompilationResult>;

  /**
   * Estimate compilation time for given program (for backend selection)
   */
  estimateCompilationTime(program: IOCProgram): number;

  /**
   * Estimate runtime performance score (higher is better)
   */
  estimatePerformanceScore(): number;
}

/**
 * Backend selection strategy
 */
export enum BackendStrategy {
  /** Fastest to compile (usually JavaScript) */
  FASTEST_COMPILE = 'fastest_compile',

  /** Best runtime performance (usually LLVM) */
  FASTEST_RUNTIME = 'fastest_runtime',

  /** Most portable (usually WebAssembly) */
  MOST_PORTABLE = 'most_portable',

  /** Balanced compilation time and performance */
  BALANCED = 'balanced',

  /** Explicit backend choice */
  EXPLICIT = 'explicit',
}

/**
 * Backend selector configuration
 */
export interface BackendSelectorConfig {
  strategy: BackendStrategy;
  explicitBackend?: BackendType;
  availableBackends?: BackendType[];
}
