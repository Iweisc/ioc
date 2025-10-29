// Provenance Tracking - Track origin and transformations of nodes

export interface SourceLocation {
  file: string;
  line: number;
  function: string;
  code?: string;
}

export interface TransformationRecord {
  transformation: string; // e.g., "filter_fusion", "map_fusion"
  originalNodes: string[]; // Node IDs that were combined/removed
  description: string;
  timestamp: number;
}

export class Provenance {
  nodeId: string;
  sourceLocation?: SourceLocation;
  createdBy?: 'user' | 'optimizer';
  parentNodes: string[] = [];
  transformations: TransformationRecord[] = [];
  userMetadata: Record<string, any> = {};

  constructor(nodeId: string) {
    this.nodeId = nodeId;
  }

  /**
   * Record a transformation applied to this node
   */
  addTransformation(transformation: TransformationRecord): void {
    this.transformations.push(transformation);
  }

  /**
   * Get the sequence of transformations that created this node
   */
  getTransformationChain(): string[] {
    return this.transformations.map(
      t => `${t.transformation}: ${t.description}`
    );
  }

  /**
   * Check if this node is a result of optimization
   */
  isOptimized(): boolean {
    return this.transformations.length > 0;
  }

  /**
   * Get the original source location as a string
   */
  getOriginalSource(): string | null {
    if (this.sourceLocation) {
      return `${this.sourceLocation.file}:${this.sourceLocation.line} in ${this.sourceLocation.function}`;
    }
    return null;
  }
}

export class ProvenanceTracker {
  private provenanceMap: Map<string, Provenance> = new Map();

  /**
   * Track creation of a new node
   */
  trackNodeCreation(nodeId: string, captureStack = false): Provenance {
    let sourceLocation: SourceLocation | undefined;

    if (captureStack) {
      // Capture call stack
      const stack = new Error().stack;
      if (stack) {
        const lines = stack.split('\n');
        // Skip first 3 lines (Error, trackNodeCreation, caller)
        for (let i = 3; i < lines.length; i++) {
          const line = lines[i];
          if (!line) continue;
          
          // Skip framework files
          if (
            !line.includes('graph.ts') &&
            !line.includes('provenance.ts') &&
            !line.includes('optimizer.ts') &&
            !line.includes('kernel.ts')
          ) {
            // Parse stack line
            const match = line.match(/at (.+) \((.+):(\d+):\d+\)/);
            if (match && match[1] && match[2] && match[3]) {
              sourceLocation = {
                function: match[1],
                file: match[2],
                line: parseInt(match[3]),
              };
              break;
            }
          }
        }
      }
    }

    const provenance = new Provenance(nodeId);
    provenance.sourceLocation = sourceLocation;
    provenance.createdBy = 'user';

    this.provenanceMap.set(nodeId, provenance);
    return provenance;
  }

  /**
   * Track an optimization that transforms/combines nodes
   */
  trackOptimization(
    resultNodeId: string,
    transformation: string,
    originalNodes: string[],
    description: string
  ): void {
    if (!this.provenanceMap.has(resultNodeId)) {
      const provenance = new Provenance(resultNodeId);
      provenance.createdBy = 'optimizer';
      this.provenanceMap.set(resultNodeId, provenance);
    }

    const provenance = this.provenanceMap.get(resultNodeId)!;

    // Record the transformation
    const record: TransformationRecord = {
      transformation,
      originalNodes,
      description,
      timestamp: Date.now(),
    };
    provenance.addTransformation(record);

    // Track parent relationships
    for (const origId of originalNodes) {
      if (!provenance.parentNodes.includes(origId)) {
        provenance.parentNodes.push(origId);
      }
    }
  }

  /**
   * Get provenance information for a node
   */
  getProvenance(nodeId: string): Provenance | null {
    return this.provenanceMap.get(nodeId) || null;
  }

  /**
   * Trace a node back to its original user-created source nodes
   */
  traceBackToSource(nodeId: string): Provenance[] {
    const chain: Provenance[] = [];
    const visited = new Set<string>();

    const trace = (nid: string) => {
      if (visited.has(nid)) return;
      visited.add(nid);

      const prov = this.getProvenance(nid);
      if (prov) {
        chain.push(prov);

        // Recursively trace parent nodes
        for (const parentId of prov.parentNodes) {
          trace(parentId);
        }
      }
    };

    trace(nodeId);
    return chain;
  }

  /**
   * Generate a detailed error report showing provenance chain
   */
  generateErrorReport(nodeId: string, error: Error): string {
    const lines: string[] = [];
    lines.push(`Error in node ${nodeId.substring(0, 8)}...`);
    lines.push(`Error: ${error.name}: ${error.message}`);
    lines.push('');

    const prov = this.getProvenance(nodeId);
    if (!prov) {
      lines.push('No provenance information available.');
      return lines.join('\n');
    }

    lines.push('Provenance Chain:');
    lines.push('-'.repeat(60));

    // Show transformation history
    if (prov.isOptimized()) {
      lines.push(`Node was created by optimizer: ${prov.createdBy}`);
      lines.push('Optimization history:');
      prov.getTransformationChain().forEach((trans, i) => {
        lines.push(`  ${i + 1}. ${trans}`);
      });
    } else {
      lines.push('Node was created by user code');
    }

    // Show original source
    if (prov.sourceLocation) {
      lines.push('');
      lines.push('Original source location:');
      lines.push(`  File: ${prov.sourceLocation.file}`);
      lines.push(`  Line: ${prov.sourceLocation.line}`);
      lines.push(`  Function: ${prov.sourceLocation.function}`);
      if (prov.sourceLocation.code) {
        lines.push(`  Code: ${prov.sourceLocation.code.trim()}`);
      }
    }

    // Show parent nodes
    if (prov.parentNodes.length > 0) {
      lines.push('');
      lines.push('Derived from nodes:');
      for (const parentId of prov.parentNodes) {
        const parentProv = this.getProvenance(parentId);
        if (parentProv && parentProv.sourceLocation) {
          lines.push(
            `  - ${parentId.substring(0, 8)}... from ${parentProv.getOriginalSource()}`
          );
        } else {
          lines.push(`  - ${parentId.substring(0, 8)}...`);
        }
      }
    }

    return lines.join('\n');
  }

  /**
   * Get statistics about tracked nodes
   */
  getStatistics(): {
    totalNodes: number;
    userCreated: number;
    optimizerCreated: number;
    optimizedNodes: number;
    transformations: Record<string, number>;
  } {
    const totalNodes = this.provenanceMap.size;
    let userCreated = 0;
    let optimizerCreated = 0;
    let optimizedNodes = 0;
    const transformations: Record<string, number> = {};

    for (const prov of this.provenanceMap.values()) {
      if (prov.createdBy === 'user') userCreated++;
      if (prov.createdBy === 'optimizer') optimizerCreated++;
      if (prov.isOptimized()) optimizedNodes++;

      for (const trans of prov.transformations) {
        transformations[trans.transformation] =
          (transformations[trans.transformation] || 0) + 1;
      }
    }

    return {
      totalNodes,
      userCreated,
      optimizerCreated,
      optimizedNodes,
      transformations,
    };
  }
}
