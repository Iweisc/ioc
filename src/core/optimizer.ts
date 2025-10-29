// Graph Optimizer - Performs optimization passes on intent graphs

import { Graph, IntentNode, IntentType } from './graph';

export class GraphOptimizer {
  private graph: Graph;
  private optimizationsApplied: string[] = [];

  constructor(graph: Graph) {
    this.graph = graph;
  }

  /**
   * Apply optimization passes to the graph.
   * 
   * Available passes:
   * - dead_code_elimination: Remove unused nodes
   * - common_subexpression_elimination: Deduplicate identical computations
   * - filter_fusion: Combine adjacent filters
   * - map_fusion: Combine adjacent maps
   * - filter_before_map: Reorder filter before map when beneficial
   */
  optimize(passes?: string[]): Graph {
    const defaultPasses = [
      'dead_code_elimination',
      'common_subexpression_elimination',
      'filter_fusion',
      'map_fusion',
      'filter_before_map',
    ];

    const passesToRun = passes || defaultPasses;

    for (const passName of passesToRun) {
      switch (passName) {
        case 'dead_code_elimination':
          this.deadCodeElimination();
          break;
        case 'common_subexpression_elimination':
          this.commonSubexpressionElimination();
          break;
        case 'filter_fusion':
          this.filterFusion();
          break;
        case 'map_fusion':
          this.mapFusion();
          break;
        case 'filter_before_map':
          this.filterBeforeMap();
          break;
        default:
          throw new Error(`Unknown optimization pass: ${passName}`);
      }
    }

    return this.graph;
  }

  /**
   * Remove nodes that don't contribute to outputs
   */
  private deadCodeElimination(): void {
    const reachable = new Set<string>();

    const markReachable = (nodeId: string) => {
      if (reachable.has(nodeId)) return;
      reachable.add(nodeId);
      
      const node = this.graph.nodes.get(nodeId);
      if (node) {
        for (const inputId of node.inputs) {
          markReachable(inputId);
        }
      }
    };

    // Start from outputs
    for (const outputId of this.graph.outputs) {
      markReachable(outputId);
    }

    // Remove unreachable nodes
    const allNodes = new Set(this.graph.nodes.keys());
    const deadNodes = new Set([...allNodes].filter(id => !reachable.has(id)));

    if (deadNodes.size > 0) {
      for (const nodeId of deadNodes) {
        this.graph.nodes.delete(nodeId);
      }
      this.optimizationsApplied.push(
        `dead_code_elimination: removed ${deadNodes.size} nodes`
      );
    }
  }

  /**
   * Eliminate duplicate computations by reusing identical nodes
   */
  private commonSubexpressionElimination(): void {
    let changesMade = 0;
    const nodeToCanonical = new Map<string, string>();

    // Create a hashable signature for a node
    const getNodeSignature = (node: IntentNode): string => {
      const inputsTuple = JSON.stringify(node.inputs);
      
      // Sort params for consistent signature
      const paramSig: Array<[string, any]> = [];
      for (const key of Object.keys(node.params).sort()) {
        const value = node.params[key];
        if (typeof value === 'function') {
          // For functions, we use their string representation
          // This is conservative but safer than id comparison
          paramSig.push([key, value.toString()]);
        } else {
          paramSig.push([key, value]);
        }
      }

      return JSON.stringify([node.intentType, inputsTuple, paramSig]);
    };

    // Build signature map
    const signatureToNodes = new Map<string, string[]>();
    for (const [nodeId, node] of this.graph.nodes.entries()) {
      const sig = getNodeSignature(node);
      if (!signatureToNodes.has(sig)) {
        signatureToNodes.set(sig, []);
      }
      signatureToNodes.get(sig)!.push(nodeId);
    }

    // For each group with identical signatures, keep one and redirect others
    for (const [_sig, nodeIds] of signatureToNodes.entries()) {
      if (nodeIds.length > 1) {
        const canonicalId = nodeIds[0];
        if (!canonicalId) continue;
        const canonicalNode = this.graph.nodes.get(canonicalId)!;

        // For constant nodes, we can safely deduplicate
        if (canonicalNode.intentType === IntentType.CONSTANT) {
          const canonicalValue = canonicalNode.params['value'];
          for (const dupId of nodeIds.slice(1)) {
            if (!dupId) continue;
            const dupNode = this.graph.nodes.get(dupId)!;
            const dupValue = dupNode.params['value'];
            if (this.deepEqual(canonicalValue, dupValue)) {
              nodeToCanonical.set(dupId, canonicalId);
              changesMade++;
            }
          }
        } else {
          // For other nodes, check if params are truly identical
          const canonicalParams = canonicalNode.params;
          for (const dupId of nodeIds.slice(1)) {
            if (!dupId) continue;
            const dupNode = this.graph.nodes.get(dupId)!;
            if (this.paramsIdentical(canonicalParams, dupNode.params)) {
              nodeToCanonical.set(dupId, canonicalId);
              changesMade++;
            }
          }
        }
      }
    }

    if (changesMade > 0) {
      // Redirect all references from duplicate nodes to canonical nodes
      for (const [_nodeId, node] of this.graph.nodes.entries()) {
        node.inputs = node.inputs.map(inputId => 
          nodeToCanonical.get(inputId) || inputId
        );
      }

      // Update outputs
      const newOutputs: string[] = [];
      for (const outputId of this.graph.outputs) {
        const canonical = nodeToCanonical.get(outputId) || outputId;
        if (!newOutputs.includes(canonical)) {
          newOutputs.push(canonical);
        }
      }
      this.graph.outputs = newOutputs;

      this.optimizationsApplied.push(
        `common_subexpression_elimination: deduplicated ${changesMade} nodes`
      );

      // Run dead code elimination to remove unused duplicates
      this.deadCodeElimination();
    }
  }

  /**
   * Combine adjacent filter operations into a single filter
   */
  private filterFusion(): void {
    let changesMade = 0;
    const fusedNodes = new Set<string>();

    // Find filter -> filter chains
    for (const [nodeId, node] of Array.from(this.graph.nodes.entries())) {
      if (node.intentType !== IntentType.FILTER) continue;
      if (fusedNodes.has(nodeId)) continue;
      if (node.inputs.length === 0) continue;

      const inputId = node.inputs[0];
      if (!inputId) continue;
      
      const inputNode = this.graph.nodes.get(inputId);
      if (!inputNode || inputNode.intentType !== IntentType.FILTER) continue;
      if (fusedNodes.has(inputId)) continue;

      // Fuse the two filters
      const pred1 = inputNode.params['predicate'] as Function;
      const pred2 = node.params['predicate'] as Function;

      // Create combined predicate
      const combinedPred = (x: any) => pred1(x) && pred2(x);

      // Update current node to use combined predicate and skip input_node
      node.params['predicate'] = combinedPred;
      node.inputs = [...inputNode.inputs];

      fusedNodes.add(inputId);
      changesMade++;
    }

    if (changesMade > 0) {
      this.optimizationsApplied.push(
        `filter_fusion: fused ${changesMade} filter pairs`
      );
      this.deadCodeElimination();
    }
  }

  /**
   * Combine adjacent map operations into a single map
   */
  private mapFusion(): void {
    let changesMade = 0;
    const fusedNodes = new Set<string>();

    // Find map -> map chains
    for (const [nodeId, node] of Array.from(this.graph.nodes.entries())) {
      if (node.intentType !== IntentType.MAP) continue;
      if (fusedNodes.has(nodeId)) continue;
      if (node.inputs.length === 0) continue;

      const inputId = node.inputs[0];
      if (!inputId) continue;
      
      const inputNode = this.graph.nodes.get(inputId);
      if (!inputNode || inputNode.intentType !== IntentType.MAP) continue;
      if (fusedNodes.has(inputId)) continue;

      // Fuse the two maps
      const transform1 = inputNode.params['transform'] as Function;
      const transform2 = node.params['transform'] as Function;

      // Create composed transformation: f(g(x))
      const composedTransform = (x: any) => transform2(transform1(x));

      // Update current node to use composed transform and skip input_node
      node.params['transform'] = composedTransform;
      node.inputs = [...inputNode.inputs];

      fusedNodes.add(inputId);
      changesMade++;
    }

    if (changesMade > 0) {
      this.optimizationsApplied.push(
        `map_fusion: fused ${changesMade} map pairs`
      );
      this.deadCodeElimination();
    }
  }

  /**
   * Reorder operations to push filters before maps when beneficial
   */
  private filterBeforeMap(): void {
    let changesMade = 0;

    // Find map -> filter patterns
    for (const [filterId, filterNode] of Array.from(this.graph.nodes.entries())) {
      if (filterNode.intentType !== IntentType.FILTER) continue;
      if (filterNode.inputs.length !== 1) continue;

      const mapId = filterNode.inputs[0];
      if (!mapId) continue;
      
      const mapNode = this.graph.nodes.get(mapId);
      if (!mapNode || mapNode.intentType !== IntentType.MAP) continue;

      // Safety check: only optimize if map has exactly one consumer
      if (this.countConsumers(mapId) !== 1) continue;

      const transform = mapNode.params['transform'] as Function;
      const predicate = filterNode.params['predicate'] as Function;

      if (!transform || !predicate) continue;

      // Test if predicate is independent of transformation
      if (this.isPredicateIndependent(transform, predicate)) {
        // Reorder: source -> filter(p) -> map(f)
        
        // Update filter to take map's input
        filterNode.inputs = [...mapNode.inputs];
        
        // Update map to take filter's output
        mapNode.inputs = [filterId];
        
        // Update any consumers of filter to consume map instead
        for (const [nId, n] of this.graph.nodes.entries()) {
          if (nId === mapId) continue;
          n.inputs = n.inputs.map(inp => (inp === filterId ? mapId : inp)).filter((x): x is string => x !== undefined);
        }
        
        // Update outputs
        this.graph.outputs = this.graph.outputs.map(out => 
          out === filterId ? mapId : out
        ).filter((x): x is string => x !== undefined);
        
        changesMade++;
      }
    }

    if (changesMade > 0) {
      this.optimizationsApplied.push(
        `filter_before_map: reordered ${changesMade} operations`
      );
    }
  }

  /**
   * Test if a predicate is independent of a transformation
   */
  private isPredicateIndependent(transform: Function, predicate: Function): boolean {
    const testCases = [
      [1, 2, 3, 4, 5, 10, 20, 30, -1, -5, 0],
      ['a', 'ab', 'abc', 'hello', 'world', 'test', 'x', ''],
      [0, 1, -1, 100, -100, 42, 7, 13],
    ];

    for (const testData of testCases) {
      try {
        // Method 1: map then filter
        const mapped = testData.map(x => transform(x));
        const result1 = mapped.filter(m => predicate(m));

        // Method 2: filter then map
        try {
          const filtered = testData.filter(x => predicate(x));
          const result2 = filtered.map(x => transform(x));

          // If both methods give same result, predicate is independent
          if (JSON.stringify(result1) === JSON.stringify(result2)) {
            continue;
          } else {
            return false;
          }
        } catch (e) {
          // Predicate can't operate on original data = not independent
          return false;
        }
      } catch (e) {
        // Transform or predicate failed, try next test case
        continue;
      }
    }

    return true;
  }

  /**
   * Count how many nodes use this node as input
   */
  private countConsumers(nodeId: string): number {
    let count = 0;
    for (const node of this.graph.nodes.values()) {
      if (node.inputs.includes(nodeId)) {
        count++;
      }
    }
    // Also count if it's an output
    if (this.graph.outputs.includes(nodeId)) {
      count++;
    }
    return count;
  }

  /**
   * Deep equality check
   */
  private deepEqual(a: any, b: any): boolean {
    if (typeof a !== typeof b) return false;
    
    if (typeof a === 'object' && a !== null && b !== null) {
      if (Array.isArray(a) && Array.isArray(b)) {
        if (a.length !== b.length) return false;
        return a.every((val, idx) => this.deepEqual(val, b[idx]));
      }
      
      if (Array.isArray(a) !== Array.isArray(b)) return false;
      
      const keysA = Object.keys(a).sort();
      const keysB = Object.keys(b).sort();
      if (JSON.stringify(keysA) !== JSON.stringify(keysB)) return false;
      
      return keysA.every(key => this.deepEqual(a[key], b[key]));
    }
    
    return a === b;
  }

  /**
   * Check if two parameter dicts are identical
   */
  private paramsIdentical(params1: Record<string, any>, params2: Record<string, any>): boolean {
    const keys1 = Object.keys(params1).sort();
    const keys2 = Object.keys(params2).sort();
    
    if (JSON.stringify(keys1) !== JSON.stringify(keys2)) return false;

    for (const key of keys1) {
      const val1 = params1[key];
      const val2 = params2[key];

      if (typeof val1 === 'function' && typeof val2 === 'function') {
        // For functions, check if they're the same reference
        if (val1 !== val2) return false;
      } else {
        if (!this.deepEqual(val1, val2)) return false;
      }
    }

    return true;
  }

  /**
   * Get a report of optimizations applied
   */
  getOptimizationReport(): string {
    if (this.optimizationsApplied.length === 0) {
      return 'No optimizations applied';
    }

    return [
      'Optimization Report:',
      ...this.optimizationsApplied.map(opt => `  - ${opt}`),
    ].join('\n');
  }
}
