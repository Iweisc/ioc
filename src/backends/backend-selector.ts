/**
 * Backend Selector
 *
 * Intelligently selects the best compilation backend based on:
 * - Platform capabilities
 * - Performance requirements
 * - Compilation time constraints
 */

import type { IOCProgram } from '../dsl/ioc-format';
import type {
  CompilationBackend,
  BackendSelectorConfig,
  CompilationOptions,
  CompilationResult,
} from './types';
import { BackendType, BackendStrategy } from './types';
import { JavaScriptBackend } from './javascript-backend';
import { WebAssemblyBackend } from './wasm-backend';
import { LLVMBackend } from './llvm-backend';

/**
 * Manages and selects compilation backends
 */
export class BackendSelector {
  private backends: Map<BackendType, CompilationBackend> = new Map();
  private availableBackends: BackendType[] = [];
  private initialized = false;

  constructor() {
    // Register all backends
    this.backends.set(BackendType.JAVASCRIPT, new JavaScriptBackend());
    this.backends.set(BackendType.WASM, new WebAssemblyBackend());
    this.backends.set(BackendType.LLVM, new LLVMBackend());
  }

  /**
   * Initialize and detect available backends
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    this.availableBackends = [];

    for (const [type, backend] of this.backends.entries()) {
      if (await backend.isAvailable()) {
        this.availableBackends.push(type);
      }
    }

    this.initialized = true;
  }

  /**
   * Get list of available backends on current platform
   */
  async getAvailableBackends(): Promise<BackendType[]> {
    await this.initialize();
    return [...this.availableBackends];
  }

  /**
   * Select best backend based on strategy
   */
  async selectBackend(
    program: IOCProgram,
    config: BackendSelectorConfig
  ): Promise<CompilationBackend> {
    await this.initialize();

    // Handle explicit backend selection
    if (config.strategy === BackendStrategy.EXPLICIT && config.explicitBackend) {
      const backend = this.backends.get(config.explicitBackend);
      if (!backend) {
        throw new Error(`Unknown backend: ${config.explicitBackend}`);
      }
      if (!(await backend.isAvailable())) {
        throw new Error(`Backend ${config.explicitBackend} is not available on this platform`);
      }
      return backend;
    }

    // Filter available backends
    const candidates = Array.from(this.backends.entries())
      .filter(([type]) => this.availableBackends.includes(type))
      .map(([, backend]) => backend);

    if (candidates.length === 0) {
      throw new Error('No compilation backends available');
    }

    // Select based on strategy
    switch (config.strategy) {
      case BackendStrategy.FASTEST_COMPILE:
        return this.selectFastestCompile(program, candidates);

      case BackendStrategy.FASTEST_RUNTIME:
        return this.selectFastestRuntime(program, candidates);

      case BackendStrategy.MOST_PORTABLE:
        return this.selectMostPortable(candidates);

      case BackendStrategy.BALANCED:
      default:
        return this.selectBalanced(program, candidates);
    }
  }

  /**
   * Compile using selected or best backend
   */
  async compile(
    program: IOCProgram,
    options: Partial<CompilationOptions> = {}
  ): Promise<CompilationResult> {
    const strategy = options.backend ? BackendStrategy.EXPLICIT : BackendStrategy.BALANCED;

    const backend = await this.selectBackend(program, {
      strategy,
      explicitBackend: options.backend,
    });

    return backend.compile(program, options);
  }

  /**
   * Select backend with fastest compilation time
   */
  private selectFastestCompile(
    program: IOCProgram,
    candidates: CompilationBackend[]
  ): CompilationBackend {
    return candidates.reduce((fastest, backend) => {
      const time = backend.estimateCompilationTime(program);
      const fastestTime = fastest.estimateCompilationTime(program);
      return time < fastestTime ? backend : fastest;
    });
  }

  /**
   * Select backend with best runtime performance
   */
  private selectFastestRuntime(
    program: IOCProgram,
    candidates: CompilationBackend[]
  ): CompilationBackend {
    return candidates.reduce((fastest, backend) => {
      const score = backend.estimatePerformanceScore();
      const fastestScore = fastest.estimatePerformanceScore();
      return score > fastestScore ? backend : fastest;
    });
  }

  /**
   * Select most portable backend (usually WebAssembly or JavaScript)
   */
  private selectMostPortable(candidates: CompilationBackend[]): CompilationBackend {
    // Preference order: WebAssembly > JavaScript > LLVM
    const preferredOrder: BackendType[] = [
      BackendType.WASM,
      BackendType.JAVASCRIPT,
      BackendType.LLVM,
    ];

    for (const type of preferredOrder) {
      const backend = candidates.find((b) => b.type === type);
      if (backend) return backend;
    }

    // This should never happen since we check candidates.length > 0 earlier
    throw new Error('No backends available in candidates list');
  }

  /**
   * Select balanced backend (good compile time and runtime performance)
   */
  private selectBalanced(
    program: IOCProgram,
    candidates: CompilationBackend[]
  ): CompilationBackend {
    // Score each backend based on balance of compile time and performance
    interface ScoredBackend {
      backend: CompilationBackend;
      score: number;
    }

    const scored: ScoredBackend[] = candidates.map((backend) => {
      const compileTime = backend.estimateCompilationTime(program);
      const perfScore = backend.estimatePerformanceScore();

      // Normalize compile time (lower is better)
      const compileScore = Math.max(0, 10 - compileTime / 10);

      // Balanced score: 40% compile time, 60% performance
      const score = compileScore * 0.4 + perfScore * 0.6;

      return { backend, score };
    });

    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);

    return scored[0].backend;
  }

  /**
   * Get information about a specific backend
   */
  getBackendInfo(type: BackendType): CompilationBackend | undefined {
    return this.backends.get(type);
  }

  /**
   * Check if a specific backend is available
   */
  async isBackendAvailable(type: BackendType): Promise<boolean> {
    await this.initialize();
    return this.availableBackends.includes(type);
  }
}

/**
 * Global backend selector instance
 */
export const backendSelector = new BackendSelector();
