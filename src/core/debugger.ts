// IOC Debugger - Tools for debugging optimized execution

import { Graph, IntentNode, IntentType } from './graph';
import { ProvenanceTracker } from './provenance';

export interface ExecutionTrace {
  nodeId: string;
  intentType: IntentType;
  inputs: any[];
  output: any;
  executionTime: number;
  error?: Error;
}

export class DebugMode {
  enabled = true;
  traceExecution = false;
  validateInvariants = true;
  checkNaN = true;
  checkNull = true;
  verbose = false;
  executionTraces: ExecutionTrace[] = [];

  /**
   * Log a debug message if verbose mode is on
   */
  log(message: string): void {
    if (this.verbose) {
      console.error(`[DEBUG] ${message}`);
    }
  }

  /**
   * Record an execution trace
   */
  recordExecution(trace: ExecutionTrace): void {
    if (this.traceExecution) {
      this.executionTraces.push(trace);
      if (this.verbose) {
        const status = trace.error ? 'ERROR' : 'OK';
        console.error(
          `[TRACE] [${status}] ${trace.nodeId.substring(0, 8)}... ` +
            `(${trace.intentType}) - ${trace.executionTime.toFixed(2)}ms`
        );
      }
    }
  }

  /**
   * Validate node output for common issues
   */
  validateOutput(node: IntentNode, output: any): string | null {
    if (!this.enabled) return null;

    const errors: string[] = [];

    // Check for null if not expected
    if (this.checkNull && output === null) {
      errors.push(`Node ${node.id.substring(0, 8)}... returned null`);
    }

    // Check for NaN in numeric data
    if (this.checkNaN) {
      if (typeof output === 'number' && isNaN(output)) {
        errors.push(`Node ${node.id.substring(0, 8)}... returned NaN`);
      } else if (Array.isArray(output)) {
        for (let i = 0; i < output.length; i++) {
          if (typeof output[i] === 'number' && isNaN(output[i])) {
            errors.push(`Node ${node.id.substring(0, 8)}... returned NaN at index ${i}`);
            break;
          }
        }
      }
    }

    return errors.length > 0 ? errors.join('; ') : null;
  }

  /**
   * Clear execution traces
   */
  clearTraces(): void {
    this.executionTraces = [];
  }

  /**
   * Get summary of execution traces
   */
  getTraceSummary(): string {
    if (this.executionTraces.length === 0) {
      return 'No execution traces recorded';
    }

    const lines: string[] = ['Execution Trace Summary:', '='.repeat(60)];

    const totalTime = this.executionTraces.reduce((sum, t) => sum + t.executionTime, 0);
    const errors = this.executionTraces.filter((t) => t.error);

    lines.push(`Total operations: ${this.executionTraces.length}`);
    lines.push(`Total time: ${totalTime.toFixed(2)}ms`);
    lines.push(`Errors: ${errors.length}`);
    lines.push('');

    lines.push('Trace:');
    this.executionTraces.forEach((trace, i) => {
      const status = trace.error ? 'ERROR' : 'OK';
      lines.push(
        `  ${i + 1}. [${status}] ${trace.nodeId.substring(0, 8)}... ` +
          `(${trace.intentType}) - ${trace.executionTime.toFixed(2)}ms`
      );
      if (trace.error) {
        lines.push(`      Error: ${trace.error.message}`);
      }
    });

    return lines.join('\n');
  }
}

export class IOCDebugger {
  private graph: Graph;
  private provenance: ProvenanceTracker;
  debugMode: DebugMode;

  constructor(graph: Graph, provenance?: ProvenanceTracker) {
    this.graph = graph;
    this.provenance = provenance || new ProvenanceTracker();
    this.debugMode = new DebugMode();
  }

  /**
   * Trace execution step by step
   *
   * @deprecated STUB: Step-by-step execution tracing not yet implemented
   *
   * Future implementation will:
   * - Compile the graph with instrumentation
   * - Execute step-by-step, recording intermediate values
   * - Track execution time for each node
   * - Capture errors with full stack traces
   *
   * For now, use SolverKernel.getGeneratedCode() to inspect the generated code,
   * then manually debug the compiled function.
   */
  trace(_data: Record<string, any>, verbose = false): ExecutionTrace[] {
    this.debugMode.traceExecution = true;
    this.debugMode.verbose = verbose;
    this.debugMode.clearTraces();

    console.warn('[Debugger.trace] Step-by-step execution tracing not yet implemented');
    console.warn('Use SolverKernel.getGeneratedCode() to inspect generated code instead');

    return this.debugMode.executionTraces;
  }

  /**
   * Binary search for the node that causes incorrect output or error
   *
   * @deprecated STUB: Automated bisection not yet implemented
   *
   * Future implementation will:
   * - Binary search through execution order to find the first failing node
   * - Compile and execute partial graphs
   * - Compare intermediate results with expected values
   * - Return the node ID that introduces the bug
   *
   * For manual bisection:
   * 1. Use graph.getExecutionOrder() to see node sequence
   * 2. Use graph.visualize() to understand dependencies
   * 3. Inspect generated code with SolverKernel.getGeneratedCode()
   */
  bisect(_data: Record<string, any>, _expectedOutput?: any): string | null {
    const executionOrder = this.graph.getExecutionOrder();

    console.warn(`[Debugger.bisect] Would bisect ${executionOrder.length} nodes`);
    console.warn('[Debugger.bisect] Automated bisection not yet implemented');
    console.warn('Use graph.getExecutionOrder() and manual inspection instead');

    return null;
  }

  /**
   * Compare execution with and without optimizations
   *
   * @deprecated STUB: Optimization comparison not yet implemented
   *
   * Future implementation will:
   * - Clone the graph
   * - Apply optimization passes to one copy
   * - Execute both versions with the same data
   * - Compare results and performance
   * - Report any differences
   *
   * For manual comparison:
   * 1. Use DifferentialTester.testWithOptimizations() from differential.ts
   * 2. Compare graph.visualize() output before and after optimize()
   * 3. Use GraphOptimizer.getOptimizationReport() to see what changed
   */
  compare(
    _data: Record<string, any>,
    _optimized = true
  ): {
    original: any;
    optimized: any;
    comparison: any;
  } {
    console.warn('[Debugger.compare] Optimization comparison not yet implemented');
    console.warn('Use DifferentialTester.testWithOptimizations() instead');

    return {
      original: {},
      optimized: {},
      comparison: {},
    };
  }

  /**
   * Format comparison report as human-readable string
   *
   * @deprecated STUB: Report formatting depends on compare() implementation
   *
   * Once compare() is implemented, this will format the comparison results
   * into a readable report showing differences and performance metrics.
   *
   * For now, use DifferentialTester.formatReport() from differential.ts
   */
  formatComparison(_comparison: any): string {
    const lines: string[] = [
      'Comparison Report:',
      '='.repeat(60),
      '',
      'STUB: Formatting not yet implemented',
      '',
      'Use DifferentialTester.formatReport() for actual differential reports',
    ];

    return lines.join('\n');
  }

  /**
   * Generate detailed explanation of a node including provenance
   */
  explainNode(nodeId: string): string {
    const node = this.graph.nodes.get(nodeId);
    if (!node) {
      return `Node ${nodeId} not found in graph`;
    }

    const prov = this.provenance.getProvenance(nodeId);

    const lines: string[] = [
      `Node: ${nodeId}`,
      '='.repeat(60),
      `Type: ${node.intentType}`,
      `Inputs: ${node.inputs.map((i) => i.substring(0, 8) + '...').join(', ')}`,
      `Parameters: ${Object.keys(node.params).length}`,
    ];

    for (const [key, value] of Object.entries(node.params)) {
      if (typeof value === 'function') {
        lines.push(`  ${key}: <function>`);
      } else {
        lines.push(`  ${key}: ${JSON.stringify(value)}`);
      }
    }

    lines.push(`Output type: ${node.outputType}`);

    if (prov) {
      lines.push('');
      lines.push('Provenance:');
      lines.push(`  Created by: ${prov.createdBy}`);

      if (prov.sourceLocation) {
        lines.push(`  Source: ${prov.getOriginalSource()}`);
      }

      if (prov.isOptimized()) {
        lines.push(`  Optimized: Yes`);
        lines.push(`  Transformations: ${prov.transformations.length}`);
        for (const trans of prov.transformations) {
          lines.push(`    - ${trans.transformation}: ${trans.description}`);
        }
      }

      if (prov.parentNodes.length > 0) {
        lines.push(
          `  Derived from: ${prov.parentNodes.map((p) => p.substring(0, 8) + '...').join(', ')}`
        );
      }
    }

    return lines.join('\n');
  }
}
