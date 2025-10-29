// Solver Kernel - translates intent graphs into executable code

import { Graph, IntentNode, IntentType } from '../core/graph';
import {
  Strategy,
  NaiveStrategy,
  OptimizedStrategy,
  ExecutionContext,
} from './strategies';
import { PerformanceProfiler, getProfiler } from './profiler';

export class SolverKernel {
  private graph: Graph;
  private strategies: Strategy[];
  private profiler: PerformanceProfiler;
  private strategyCache: Map<string, Strategy> = new Map();
  private sizeMetadata: Map<string, number> = new Map();
  private generatedCode?: string;

  constructor(graph: Graph, profiler?: PerformanceProfiler) {
    this.graph = graph;
    this.strategies = [
      new OptimizedStrategy(),
      new NaiveStrategy(),
    ];
    this.profiler = profiler || getProfiler();
  }

  /**
   * Provide a size hint for a specific node to improve strategy selection
   */
  setSizeHint(nodeId: string, size: number): void {
    this.sizeMetadata.set(nodeId, size);
  }

  /**
   * Estimate input size for a node by tracing back through the graph
   */
  private estimateInputSize(node: IntentNode): number {
    // Check if we have explicit metadata
    if (this.sizeMetadata.has(node.id)) {
      return this.sizeMetadata.get(node.id)!;
    }

    // If this is an input node, use default
    if (node.inputs.length === 0) {
      return 1000;
    }

    // Trace back through the graph
    const inputNodeId = node.inputs[0];
    if (!inputNodeId) return 1000;
    
    const inputNode = this.graph.nodes.get(inputNodeId);
    if (!inputNode) return 1000;

    const baseSize = this.estimateInputSize(inputNode);

    // Adjust size based on operation type
    switch (node.intentType) {
      case IntentType.FILTER:
        return Math.floor(baseSize / 2); // Assume 50% selectivity
      case IntentType.MAP:
        return baseSize; // Maintains size
      case IntentType.FLATTEN:
        return baseSize * 2; // Increases size
      case IntentType.DISTINCT:
        return Math.floor(baseSize / 2); // Assume 50% duplicates
      case IntentType.GROUP_BY:
        return Math.min(Math.floor(baseSize / 10), 100);
      case IntentType.REDUCE:
        return 1; // Single value
      default:
        return baseSize;
    }
  }

  /**
   * Select best strategy based on optimization goal and profiler data
   */
  private selectStrategy(
    node: IntentNode,
    optimizeFor: 'speed' | 'memory' | 'balanced' = 'speed',
    inputSize?: number
  ): Strategy {
    const { intentType } = node;

    // Filter strategies that can handle this intent type
    const capableStrategies = this.strategies.filter(s =>
      s.canHandle(intentType)
    );

    if (capableStrategies.length === 0) {
      throw new Error(`No strategy found for intent type: ${intentType}`);
    }

    // Estimate input size if not provided
    const size = inputSize ?? this.estimateInputSize(node);

    // Bucket the size
    const bucketedSize = this.profiler.bucketSize(size);

    // Check cache
    const cacheKey = `${node.id}:${bucketedSize}:${optimizeFor}`;
    if (this.strategyCache.has(cacheKey)) {
      return this.strategyCache.get(cacheKey)!;
    }

    let bestStrategy: Strategy;

    if (optimizeFor === 'speed') {
      // Use profiler data to pick the best strategy
      const strategyCosts = capableStrategies.map(strategy => {
        const strategyName = strategy.constructor.name;
        const cost = this.profiler.getCostEstimate(
          intentType,
          strategyName,
          bucketedSize
        );
        return { cost, strategy };
      });

      bestStrategy = strategyCosts.reduce((best, current) =>
        current.cost < best.cost ? current : best
      ).strategy;
    } else if (optimizeFor === 'memory') {
      // Prefer naive (smaller code)
      const naive = capableStrategies.find(s => s instanceof NaiveStrategy);
      bestStrategy = naive || capableStrategies[0]!;
    } else {
      // Balanced: use optimized if available
      bestStrategy = capableStrategies[0]!;
    }

    this.strategyCache.set(cacheKey, bestStrategy);
    return bestStrategy;
  }

  /**
   * Generate JavaScript code from intent graph
   */
  private generateCode(
    optimizeFor: 'speed' | 'memory' | 'balanced' = 'speed'
  ): { code: string; context: ExecutionContext } {
    const context: ExecutionContext = {
      variables: {},
      nodeResults: {},
    };
    const codeLines: string[] = [];

    // Get topological execution order
    const execOrder = this.graph.getExecutionOrder();

    // Generate code for each node
    for (const nodeId of execOrder) {
      const node = this.graph.nodes.get(nodeId);
      if (!node) continue;

      // Select strategy for this node
      const strategy = this.selectStrategy(node, optimizeFor);

      // Generate code using the strategy
      const nodeCode = strategy.generateCode(node, context);

      // Add comment for debugging
      codeLines.push(`// ${node.intentType}: ${node.id.substring(0, 8)}`);
      codeLines.push(nodeCode);
      codeLines.push('');
    }

    // Return the output(s)
    if (this.graph.outputs.length > 0) {
      if (this.graph.outputs.length === 1) {
        codeLines.push(`return ${this.graph.outputs[0]}`);
      } else {
        const outputs = this.graph.outputs.join(', ');
        codeLines.push(`return [${outputs}]`);
      }
    }

    const code = codeLines.join('\n');
    return { code, context };
  }

  /**
   * Compile intent graph into executable function
   */
  compile(
    optimizeFor: 'speed' | 'memory' | 'balanced' = 'speed',
    saveProfile = false
  ): Function {
    // Generate code
    const { code, context } = this.generateCode(optimizeFor);

    // Collect input parameter names
    const inputNodes = Array.from(this.graph.nodes.values()).filter(
      node => node.intentType === IntentType.INPUT
    );
    const paramNames = inputNodes
      .map(node => node.params['name'] as string)
      .filter((name): name is string => typeof name === 'string');

    // Build function
    const funcDef = `function _ioc_compiled_fn(${paramNames.join(', ')}) {`;
    const indentedCode = code
      .split('\n')
      .map(line => `  ${line}`)
      .join('\n');
    const fullCode = `${funcDef}\n${indentedCode}\n}`;

    // Store for debugging
    this.generatedCode = fullCode;

    // Compile the code
    const execGlobals = { ...context.variables };
    const compiledFn = new Function(
      ...Object.keys(execGlobals),
      ...paramNames,
      code
    ).bind(null, ...Object.values(execGlobals));

    // Attach metadata for debugging
    (compiledFn as any)._ioc_code = fullCode;
    (compiledFn as any)._ioc_graph = this.graph;
    (compiledFn as any)._ioc_optimize_for = optimizeFor;
    (compiledFn as any)._ioc_kernel = this;

    // Optionally save profiler data
    if (saveProfile) {
      this.profiler.saveProfiles();
    }

    return compiledFn;
  }

  /**
   * Get generated code for inspection
   */
  getGeneratedCode(): string {
    if (this.generatedCode) {
      return this.generatedCode;
    }
    return 'No code generated yet. Call compile() first.';
  }

  /**
   * Get a report of strategy decisions made
   */
  getStrategyReport(): string {
    if (this.strategyCache.size === 0) {
      return 'No strategy decisions cached yet';
    }

    const lines: string[] = [
      'Strategy Selection Report:',
      '='.repeat(60),
    ];

    // Group by node
    const byNode = new Map<string, Array<[number, string, Strategy]>>();
    for (const [cacheKey, strategy] of this.strategyCache.entries()) {
      const parts = cacheKey.split(':');
      const nodeId = parts[0];
      const sizeStr = parts[1];
      const optMode = parts[2];
      
      if (!nodeId || !sizeStr || !optMode) continue;
      const size = parseInt(sizeStr);
      
      if (!byNode.has(nodeId)) {
        byNode.set(nodeId, []);
      }
      byNode.get(nodeId)!.push([size, optMode, strategy]);
    }

    for (const [nodeId, decisions] of Array.from(byNode.entries()).sort()) {
      if (!nodeId) continue;
      const node = this.graph.nodes.get(nodeId);
      if (!node) continue;

      lines.push(`\n${node.intentType} (${nodeId.substring(0, 8)}):`);
      for (const [size, optMode, strategy] of decisions) {
        lines.push(
          `  size=${String(size).padStart(6)} ` +
          `opt=${optMode.padEnd(8)} → ${strategy.constructor.name}`
        );
      }
    }

    return lines.join('\n');
  }
}
