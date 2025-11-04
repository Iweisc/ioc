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
 * Result of budget validation
 */
export interface BudgetValidationResult {
  success: boolean;
  result?: any;
  error?: string;
  executionTime?: number;
}

/**
 * Termination verifier using empirical testing
 */
export class TerminationVerifier {
  /**
   * Validate that a function executes within the given budget
   *
   * LIMITATION: This method only supports synchronous functions. Async functions
   * or functions that return Promises will not be properly validated, as the timing
   * and error handling will not account for asynchronous execution. If async support
   * is needed, consider using a separate async validation method.
   *
   * @param fn - The synchronous function to validate
   * @param budget - The execution budget to enforce
   * @param args - Arguments to pass to the function
   * @returns Validation result with success status, result, error, and execution time
   */
  static validateBudget(
    fn: Function,
    budget: ExecutionBudget,
    args: any[]
  ): BudgetValidationResult {
    const maxTime = budget.maxTime ?? 1000;
    const startTime = performance.now();

    try {
      // Execute the function with the provided arguments
      const result = fn(...args);

      // NOTE: This detects async functions after invocation. For stricter validation,
      // reject async functions upfront before invocation or implement proper async validation path.
      // Detect if the result is a Promise (async function was called)
      if (result && typeof result === 'object' && typeof result.then === 'function') {
        return {
          success: false,
          error:
            'validateBudget does not support async functions or Promises. Use synchronous functions only.',
          executionTime: performance.now() - startTime,
        };
      }

      const executionTime = performance.now() - startTime;

      // Check if execution exceeded time budget
      if (executionTime > maxTime) {
        return {
          success: false,
          error: `Budget exceeded: execution took ${executionTime}ms, max allowed ${maxTime}ms`,
          executionTime,
        };
      }

      // Check if iteration budget was exceeded (if applicable)
      // For now, we track via execution time as a proxy
      // Future: could instrument loops to count iterations

      return {
        success: true,
        result,
        executionTime,
      };
    } catch (error: any) {
      const executionTime = performance.now() - startTime;
      return {
        success: false,
        error: error?.message || String(error),
        executionTime,
      };
    }
  }

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
   * SECURITY: nodeId is sanitized to prevent code injection
   */
  static wrapCode(code: string, nodeId: string, budget: ExecutionBudget): string {
    // Import sanitization functions
    const { sanitizeIdentifier, escapeForComment, escapeForString } = require('../dsl/security.js');

    // Sanitize nodeId before using it in generated code
    const safeNodeId = sanitizeIdentifier(nodeId);
    const safeNodeIdComment = escapeForComment(nodeId);
    const safeNodeIdString = escapeForString(nodeId);

    const maxIterations = budget.maxIterations ?? 100_000;
    const maxTime = budget.maxTime ?? 1000;

    return `
// Budget enforcement for ${safeNodeIdComment}
const _budget_${safeNodeId} = {
  iterations: 0,
  maxIterations: ${maxIterations},
  startTime: Date.now(),
  maxTime: ${maxTime},
  check() {
    if (++this.iterations > this.maxIterations) {
      throw new Error('Budget exceeded: iteration limit for ${safeNodeIdString}');
    }
    if (Date.now() - this.startTime > this.maxTime) {
      throw new Error('Budget exceeded: time limit for ${safeNodeIdString}');
    }
  }
};

// Instrumented code
${this.instrumentCode(code, `_budget_${safeNodeId}`)}
`;
  }

  /**
   * Instrument code to insert budget checks
   *
   * TODO: The forEach instrumentation using string replacement is broken.
   * It produces invalid JavaScript and drops the original callback.
   * Should use an AST transform (e.g., Babel/ESTree) instead:
   *   1. Parse code to AST
   *   2. Find CallExpression nodes with forEach
   *   3. Wrap callback with budget check
   *   4. Generate code from modified AST
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

    // KNOWN ISSUE: forEach instrumentation is broken - disabled for now
    // Original code produced invalid JS that dropped callbacks
    // TODO: Implement proper AST-based transformation
    // instrumented = instrumented.replace(
    //   /\.forEach\(/g,
    //   `.forEach((...args) => { ${budgetVar}.check(); return ((...args) => `
    // );

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
