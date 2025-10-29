// Differential Testing - Compare different execution strategies

import { Graph } from './graph';

export interface ExecutionResult {
  strategyName: string;
  result: any;
  executionTime: number;
  nodeCount: number;
  error?: Error;
  metadata: Record<string, any>;
}

export interface DifferentialTestResult {
  executions: ExecutionResult[];
  baselineName: string;
  allMatch: boolean;
  mismatches: Array<[string, string]>;
  performanceComparison: Record<string, number>;
}

export class DifferentialTester {
  private graph: Graph;

  constructor(graph: Graph) {
    this.graph = graph;
  }

  /**
   * Test the graph with multiple execution strategies
   */
  testAllStrategies(
    data: Record<string, any>,
    strategies?: string[]
  ): DifferentialTestResult {
    const strategyNames = strategies || ['naive', 'optimized'];
    const executions: ExecutionResult[] = [];
    const baselineName = 'naive';

    // Execute with each strategy
    for (const strategyName of strategyNames) {
      const result = this.executeWithStrategy(strategyName, data);
      executions.push(result);
    }

    // Compare results
    const baseline = executions.find(e => e.strategyName === baselineName);
    if (!baseline) {
      throw new Error(`Baseline strategy '${baselineName}' not found`);
    }

    let allMatch = true;
    const mismatches: Array<[string, string]> = [];

    for (const exec of executions) {
      if (exec.strategyName === baselineName) continue;

      // Compare results
      if (exec.error === undefined && baseline.error === undefined) {
        if (!this.resultsEqual(baseline.result, exec.result)) {
          allMatch = false;
          mismatches.push([baselineName, exec.strategyName]);
        }
      } else if ((exec.error === undefined) !== (baseline.error === undefined)) {
        allMatch = false;
        mismatches.push([baselineName, exec.strategyName]);
      }
    }

    // Calculate performance comparison
    const performanceComparison: Record<string, number> = {};
    if (baseline.error === undefined && baseline.executionTime > 0) {
      for (const exec of executions) {
        if (exec.error === undefined) {
          const speedup = baseline.executionTime / exec.executionTime;
          performanceComparison[exec.strategyName] = speedup;
        }
      }
    }

    return {
      executions,
      baselineName,
      allMatch,
      mismatches,
      performanceComparison,
    };
  }

  /**
   * Compare execution with and without optimizations
   */
  testWithOptimizations(
    data: Record<string, any>,
    optimizationPasses?: string[]
  ): DifferentialTestResult {
    const executions: ExecutionResult[] = [];

    // Execute without optimization
    const unoptimized = this.executeGraph(
      this.graph,
      data,
      'unoptimized'
    );
    executions.push(unoptimized);

    // Execute with optimization
    const optimizedGraph = this.graph.clone();
    if (optimizationPasses) {
      optimizedGraph.optimize(optimizationPasses);
    } else {
      optimizedGraph.optimize();
    }

    const optimized = this.executeGraph(
      optimizedGraph,
      data,
      'optimized'
    );
    executions.push(optimized);

    // Compare
    const baseline = executions[0];
    const opt = executions[1];

    let allMatch = true;
    const mismatches: Array<[string, string]> = [];

    if (baseline && opt) {
      if (baseline.error === undefined && opt.error === undefined) {
        if (!this.resultsEqual(baseline.result, opt.result)) {
          allMatch = false;
          mismatches.push(['unoptimized', 'optimized']);
        }
      } else if ((baseline.error === undefined) !== (opt.error === undefined)) {
        allMatch = false;
        mismatches.push(['unoptimized', 'optimized']);
      }
    }

    // Performance comparison
    const performanceComparison: Record<string, number> = {};
    if (baseline && opt && baseline.error === undefined && baseline.executionTime > 0) {
      if (opt.error === undefined) {
        const speedup = baseline.executionTime / opt.executionTime;
        performanceComparison['optimized'] = speedup;
      }
    }

    return {
      executions,
      baselineName: 'unoptimized',
      allMatch,
      mismatches,
      performanceComparison,
    };
  }

  /**
   * Execute graph with a specific strategy
   */
  private executeWithStrategy(
    strategyName: string,
    _data: Record<string, any>
  ): ExecutionResult {
    const start = performance.now();
    let result: any;
    let error: Error | undefined;

    try {
      // TODO: Actually execute with specific strategy
      // For now, just execute normally
      result = null;
    } catch (e) {
      error = e as Error;
    }

    const executionTime = performance.now() - start;

    return {
      strategyName,
      result,
      executionTime,
      nodeCount: this.graph.nodes.size,
      error,
      metadata: {},
    };
  }

  /**
   * Execute a graph and return result
   */
  private executeGraph(
    graph: Graph,
    _data: Record<string, any>,
    label: string
  ): ExecutionResult {
    const start = performance.now();
    let result: any;
    let error: Error | undefined;

    try {
      // TODO: Actually execute the graph
      result = null;
    } catch (e) {
      error = e as Error;
    }

    const executionTime = performance.now() - start;

    return {
      strategyName: label,
      result,
      executionTime,
      nodeCount: graph.nodes.size,
      error,
      metadata: {},
    };
  }

  /**
   * Compare two results for equality
   */
  private resultsEqual(result1: any, result2: any): boolean {
    try {
      return JSON.stringify(result1) === JSON.stringify(result2);
    } catch {
      return result1 === result2;
    }
  }

  /**
   * Format test result as human-readable report
   */
  formatReport(testResult: DifferentialTestResult): string {
    const lines: string[] = [
      'Differential Testing Report:',
      '='.repeat(60),
    ];

    // Overall status
    if (testResult.allMatch) {
      lines.push('Status: PASS - All executions produced identical results');
    } else {
      lines.push('Status: FAIL - Results differ between executions');
      lines.push(`Mismatches: ${JSON.stringify(testResult.mismatches)}`);
    }

    lines.push('');

    // Execution details
    lines.push('Executions:');
    for (const exec of testResult.executions) {
      const status = exec.error === undefined ? 'SUCCESS' : 'ERROR';
      lines.push(`  [${status}] ${exec.strategyName}`);
      lines.push(`    Time: ${exec.executionTime.toFixed(2)}ms`);
      lines.push(`    Nodes: ${exec.nodeCount}`);

      if (exec.error) {
        lines.push(`    Error: ${exec.error.message}`);
      } else {
        const resultStr = JSON.stringify(exec.result);
        const preview = resultStr.length > 100 
          ? resultStr.substring(0, 97) + '...' 
          : resultStr;
        lines.push(`    Result: ${preview}`);
      }
    }

    lines.push('');

    // Performance comparison
    if (Object.keys(testResult.performanceComparison).length > 0) {
      lines.push('Performance Comparison (vs baseline):');
      const sorted = Object.entries(testResult.performanceComparison).sort(
        ([, a], [, b]) => b - a
      );
      for (const [name, speedup] of sorted) {
        lines.push(`  ${name}: ${speedup.toFixed(2)}x`);
      }
    }

    // Fastest
    const successful = testResult.executions.filter(e => e.error === undefined);
    if (successful.length > 0) {
      const fastest = successful.reduce((best, current) =>
        current.executionTime < best.executionTime ? current : best
      );
      lines.push('');
      lines.push(
        `Fastest: ${fastest.strategyName} (${fastest.executionTime.toFixed(2)}ms)`
      );
    }

    return lines.join('\n');
  }
}

/**
 * Run differential tests on multiple test cases
 */
export function createTestSuite(
  graph: Graph,
  testCases: Array<Record<string, any>>
): DifferentialTestResult[] {
  const tester = new DifferentialTester(graph);
  const results: DifferentialTestResult[] = [];

  for (let i = 0; i < testCases.length; i++) {
    console.log(`Running test case ${i + 1}/${testCases.length}...`);
    const testCase = testCases[i];
    if (testCase) {
      const result = tester.testWithOptimizations(testCase);
      results.push(result);
    }
  }

  return results;
}
