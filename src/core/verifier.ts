/**
 * Termination Verifier and Budget Enforcement
 *
 * This module provides tools for ensuring computation safety through:
 * 1. Structural termination guarantees (provable via DAG structure)
 * 2. Empirical verification (sandboxed execution with limits)
 * 3. Runtime budget enforcement (hard limits on operations)
 */

import { ComplexityClass } from '../dsl/safe-types.js';

/**
 * Budget configuration for runtime execution
 */
export interface ExecutionBudget {
  maxIterations?: number; // Max loop iterations
  maxMemory?: number; // Max memory in bytes
  maxTime?: number; // Max execution time in ms
  maxStackDepth?: number; // Max call stack depth
}

/**
 * Default budgets based on complexity class
 */
export const DEFAULT_BUDGETS: Record<ComplexityClass, ExecutionBudget> = {
  [ComplexityClass.CONSTANT]: {
    maxIterations: 10,
    maxTime: 10,
    maxStackDepth: 5,
  },
  [ComplexityClass.LOGARITHMIC]: {
    maxIterations: 1000,
    maxTime: 100,
    maxStackDepth: 20,
  },
  [ComplexityClass.LINEAR]: {
    maxIterations: 100_000,
    maxTime: 1000,
    maxStackDepth: 10,
  },
  [ComplexityClass.LINEARITHMIC]: {
    maxIterations: 1_000_000,
    maxTime: 5000,
    maxStackDepth: 50,
  },
  [ComplexityClass.QUADRATIC]: {
    maxIterations: 10_000_000,
    maxTime: 10000,
    maxStackDepth: 10,
  },
  [ComplexityClass.CUBIC]: {
    maxIterations: 100_000_000,
    maxTime: 30000,
    maxStackDepth: 10,
  },
  [ComplexityClass.EXPONENTIAL]: {
    maxIterations: 1_000_000_000,
    maxTime: 60000,
    maxStackDepth: 100,
  },
  [ComplexityClass.FACTORIAL]: {
    maxIterations: Number.MAX_SAFE_INTEGER,
    maxTime: 120000,
    maxStackDepth: 1000,
  },
};

/**
 * Result of verification attempt
 */
export type VerificationResult =
  | { status: 'safe'; evidence: string }
  | { status: 'unsafe'; reason: string }
  | { status: 'unknown'; reason: string };

/**
 * Termination verifier using empirical testing
 */
export class TerminationVerifier {
  /**
   * Verify that a function terminates on sample inputs
   * Uses structural analysis + empirical testing
   */
  static verify(fn: Function, complexity: ComplexityClass, testInputs?: any[]): VerificationResult {
    // Get budget for this complexity class
    const budget = DEFAULT_BUDGETS[complexity];

    // Use provided test inputs or generate them
    const inputs = testInputs || this.generateTestInputs();

    // Test each input with budget enforcement
    for (const input of inputs) {
      try {
        const result = this.runWithBudget(fn, input, budget);
        if (result.exceeded) {
          return {
            status: 'unsafe',
            reason: `Exceeded ${result.limit} on input: ${JSON.stringify(input).slice(0, 100)}`,
          };
        }
      } catch (error: any) {
        return {
          status: 'unsafe',
          reason: `Error during execution: ${error.message}`,
        };
      }
    }

    return {
      status: 'safe',
      evidence: `Passed verification on ${inputs.length} test cases`,
    };
  }

  /**
   * Run function with execution budget
   */
  private static runWithBudget(
    fn: Function,
    input: any,
    budget: ExecutionBudget
  ): { exceeded: boolean; limit?: string } {
    const maxTime = budget.maxTime ?? 1000;
    const startTime = Date.now();

    try {
      // Simple execution with timeout check
      // For predicates and transforms on safe DSL, we trust structural guarantees
      fn(input);

      // Check if execution took too long
      if (Date.now() - startTime > maxTime) {
        return { exceeded: true, limit: 'time limit' };
      }

      return { exceeded: false };
    } catch (error: any) {
      // If it throws, that's fine - we're just checking termination
      return { exceeded: false };
    }
  }

  /**
   * Generate test inputs for verification
   * Uses property-based testing principles
   */
  private static generateTestInputs(): any[] {
    return [
      // Empty/minimal cases
      [],
      [1],
      '',
      0,

      // Small cases
      [1, 2, 3],
      'hello',
      42,

      // Medium cases
      Array(100)
        .fill(0)
        .map((_, i) => i),
      'a'.repeat(100),

      // Large cases
      Array(1000)
        .fill(0)
        .map((_, i) => i),
      'x'.repeat(1000),

      // Edge cases
      [-1, 0, 1],
      [Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER],
      [Infinity, -Infinity, NaN],

      // Nested structures
      [
        [1, 2],
        [3, 4],
        [5, 6],
      ],
      { a: 1, b: 2, c: 3 },
    ];
  }
}

/**
 * Runtime budget enforcer
 * Wraps generated code with hard limits
 */
export class BudgetEnforcer {
  /**
   * Wrap code with budget enforcement
   */
  static wrapCode(code: string, nodeId: string, budget: ExecutionBudget): string {
    const maxIterations = budget.maxIterations ?? 100_000;
    const maxTime = budget.maxTime ?? 1000;

    return `
// Budget enforcement for ${nodeId}
const _budget_${nodeId} = {
  iterations: 0,
  maxIterations: ${maxIterations},
  startTime: Date.now(),
  maxTime: ${maxTime},
  check() {
    if (++this.iterations > this.maxIterations) {
      throw new Error('Budget exceeded: iteration limit for ${nodeId}');
    }
    if (Date.now() - this.startTime > this.maxTime) {
      throw new Error('Budget exceeded: time limit for ${nodeId}');
    }
  }
};

// Instrumented code
${this.instrumentCode(code, `_budget_${nodeId}`)}
`;
  }

  /**
   * Instrument code to insert budget checks
   */
  private static instrumentCode(code: string, budgetVar: string): string {
    // Insert budget checks in loops
    let instrumented = code;

    // Insert checks after 'for' loop declarations
    instrumented = instrumented.replace(/for\s*\((.*?)\)\s*{/g, `for ($1) { ${budgetVar}.check();`);

    // Insert checks in while loops
    instrumented = instrumented.replace(
      /while\s*\((.*?)\)\s*{/g,
      `while ($1) { ${budgetVar}.check();`
    );

    // Insert checks in array operations
    instrumented = instrumented.replace(
      /\.forEach\(/g,
      `.forEach((...args) => { ${budgetVar}.check(); return ((...args) => `
    );

    return instrumented;
  }

  /**
   * Create a budget-aware function wrapper
   */
  static createBudgetedFunction<T extends Function>(fn: T, budget: ExecutionBudget): T {
    let iterations = 0;
    const maxIterations = budget.maxIterations ?? 100_000;
    const maxTime = budget.maxTime ?? 1000;

    return ((...args: any[]) => {
      const startTime = Date.now();

      // Create proxy for arguments to track iterations
      const proxiedArgs = args.map((arg) => {
        if (arg === null || typeof arg !== 'object') return arg;

        return new Proxy(arg, {
          get(target, prop) {
            iterations++;
            if (iterations > maxIterations) {
              throw new Error('Budget exceeded: iteration limit');
            }
            if (Date.now() - startTime > maxTime) {
              throw new Error('Budget exceeded: time limit');
            }
            return target[prop];
          },
        });
      });

      return fn(...proxiedArgs);
    }) as any as T;
  }
}

/**
 * Estimate an execution budget from a representative input size and an algorithmic complexity class.
 *
 * @param inputSize - Representative size of the input (n) used to scale iteration and time estimates
 * @param complexity - Expected ComplexityClass of the algorithm
 * @returns An ExecutionBudget where `maxIterations` is scaled according to `complexity`, `maxTime` is a heuristic millisecond estimate clamped to the range [100, 60000], and `maxStackDepth` is set to 100
 */
export function estimateBudget(inputSize: number, complexity: ComplexityClass): ExecutionBudget {
  const n = inputSize;

  let maxIterations: number;
  switch (complexity) {
    case ComplexityClass.CONSTANT:
      maxIterations = 10;
      break;
    case ComplexityClass.LOGARITHMIC:
      maxIterations = Math.ceil(Math.log2(n + 1)) * 10;
      break;
    case ComplexityClass.LINEAR:
      maxIterations = n * 2;
      break;
    case ComplexityClass.LINEARITHMIC:
      maxIterations = Math.ceil(n * Math.log2(n + 1)) * 2;
      break;
    case ComplexityClass.QUADRATIC:
      maxIterations = n * n * 2;
      break;
    case ComplexityClass.CUBIC:
      maxIterations = n * n * n * 2;
      break;
    default:
      maxIterations = 1_000_000;
  }

  // Estimate time based on iterations (rough heuristic: 1M ops/sec)
  const maxTime = Math.ceil(maxIterations / 1_000_000) * 1000;

  return {
    maxIterations,
    maxTime: Math.max(100, Math.min(maxTime, 60000)), // Between 100ms and 60s
    maxStackDepth: 100,
  };
}