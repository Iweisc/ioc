/**
 * Intent Graph - Core data structure for IOC
 * Represents programs as DAGs of semantic intents
 */

import { randomUUID } from 'crypto';
import type { IOCType } from './types.js';
import { AnyType, inferType } from './types.js';

/**
 * Types of semantic intents
 */
export enum IntentType {
  INPUT = 'input',
  OUTPUT = 'output',
  FILTER = 'filter',
  MAP = 'map',
  REDUCE = 'reduce',
  COMPOSE = 'compose',
  PARALLEL = 'parallel',
  CONSTANT = 'constant',
  SORT = 'sort',
  GROUP_BY = 'group_by',
  JOIN = 'join',
  FLATTEN = 'flatten',
  DISTINCT = 'distinct',
  ASSERT = 'assert',
}

/**
 * Metadata for optimization hints
 */
export interface IntentMetadata {
  parallelizable?: boolean;
  vectorizable?: boolean;
  fusible?: boolean;
  [key: string]: unknown;
}

/**
 * Node in the intent graph representing a semantic goal
 */
export interface IntentNode {
  id: string;
  intentType: IntentType;
  inputs: string[];
  params: Record<string, unknown>;
  outputType: IOCType;
  metadata: IntentMetadata;
}

/**
 * Optimization mode for compilation
 */
export type OptimizationMode = 'speed' | 'memory' | 'balanced';

/**
 * Intent Graph - represents a program as a DAG
 */
export class Graph {
  private nodes: Map<string, IntentNode> = new Map();
  private outputNodes: string[] = [];

  /**
   * Generate unique node ID
   */
  private generateId(prefix: string = 'node'): string {
    return `${prefix}_${randomUUID().slice(0, 8)}`;
  }

  /**
   * Add a node to the graph
   */
  private addNode(node: IntentNode): string {
    this.nodes.set(node.id, node);
    return node.id;
  }

  /**
   * Get a node by ID
   */
  getNode(id: string): IntentNode | undefined {
    return this.nodes.get(id);
  }

  /**
   * Get all nodes
   */
  getAllNodes(): IntentNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Get output nodes
   */
  getOutputs(): string[] {
    return [...this.outputNodes];
  }

  /**
   * Define an input parameter
   */
  input(name: string, typeHint?: IOCType): string {
    const node: IntentNode = {
      id: this.generateId('input'),
      intentType: IntentType.INPUT,
      inputs: [],
      params: { name },
      outputType: typeHint || new AnyType(),
      metadata: {},
    };
    return this.addNode(node);
  }

  /**
   * Create a constant value node
   */
  constant(value: unknown): string {
    const node: IntentNode = {
      id: this.generateId('const'),
      intentType: IntentType.CONSTANT,
      inputs: [],
      params: { value },
      outputType: inferType(value),
      metadata: {},
    };
    return this.addNode(node);
  }

  /**
   * Filter elements using a predicate
   */
  filter(inputNode: string, predicate: (x: unknown) => boolean): string {
    const input = this.getNode(inputNode);
    if (!input) throw new Error(`Node not found: ${inputNode}`);

    const node: IntentNode = {
      id: this.generateId('filter'),
      intentType: IntentType.FILTER,
      inputs: [inputNode],
      params: { predicate },
      outputType: input.outputType,
      metadata: { parallelizable: true },
    };
    return this.addNode(node);
  }

  /**
   * Transform elements using a function
   */
  map(inputNode: string, transform: (x: unknown) => unknown): string {
    const input = this.getNode(inputNode);
    if (!input) throw new Error(`Node not found: ${inputNode}`);

    const node: IntentNode = {
      id: this.generateId('map'),
      intentType: IntentType.MAP,
      inputs: [inputNode],
      params: { transform },
      outputType: new AnyType(), // Could infer from transform
      metadata: { parallelizable: true, vectorizable: true },
    };
    return this.addNode(node);
  }

  /**
   * Reduce elements to a single value
   */
  reduce(inputNode: string, operation: (acc: unknown, x: unknown) => unknown, initial?: unknown): string {
    const input = this.getNode(inputNode);
    if (!input) throw new Error(`Node not found: ${inputNode}`);

    const node: IntentNode = {
      id: this.generateId('reduce'),
      intentType: IntentType.REDUCE,
      inputs: [inputNode],
      params: { operation, initial },
      outputType: new AnyType(),
      metadata: {},
    };
    return this.addNode(node);
  }

  /**
   * Sort elements
   */
  sort(inputNode: string, compareFn?: (a: unknown, b: unknown) => number): string {
    const input = this.getNode(inputNode);
    if (!input) throw new Error(`Node not found: ${inputNode}`);

    const node: IntentNode = {
      id: this.generateId('sort'),
      intentType: IntentType.SORT,
      inputs: [inputNode],
      params: { compareFn },
      outputType: input.outputType,
      metadata: {},
    };
    return this.addNode(node);
  }

  /**
   * Group elements by key
   */
  groupBy(inputNode: string, keyFn: (x: unknown) => unknown): string {
    const input = this.getNode(inputNode);
    if (!input) throw new Error(`Node not found: ${inputNode}`);

    const node: IntentNode = {
      id: this.generateId('groupby'),
      intentType: IntentType.GROUP_BY,
      inputs: [inputNode],
      params: { keyFn },
      outputType: new AnyType(), // Map<Key, List<Value>>
      metadata: {},
    };
    return this.addNode(node);
  }

  /**
   * Join two collections
   */
  join(
    leftNode: string,
    rightNode: string,
    leftKey: (x: unknown) => unknown,
    rightKey: (x: unknown) => unknown
  ): string {
    const left = this.getNode(leftNode);
    const right = this.getNode(rightNode);
    if (!left) throw new Error(`Node not found: ${leftNode}`);
    if (!right) throw new Error(`Node not found: ${rightNode}`);

    const node: IntentNode = {
      id: this.generateId('join'),
      intentType: IntentType.JOIN,
      inputs: [leftNode, rightNode],
      params: { leftKey, rightKey },
      outputType: new AnyType(),
      metadata: {},
    };
    return this.addNode(node);
  }

  /**
   * Flatten nested lists
   */
  flatten(inputNode: string, depth: number = 1): string {
    const input = this.getNode(inputNode);
    if (!input) throw new Error(`Node not found: ${inputNode}`);

    const node: IntentNode = {
      id: this.generateId('flatten'),
      intentType: IntentType.FLATTEN,
      inputs: [inputNode],
      params: { depth },
      outputType: new AnyType(),
      metadata: {},
    };
    return this.addNode(node);
  }

  /**
   * Remove duplicate elements
   */
  distinct(inputNode: string, keyFn?: (x: unknown) => unknown): string {
    const input = this.getNode(inputNode);
    if (!input) throw new Error(`Node not found: ${inputNode}`);

    const node: IntentNode = {
      id: this.generateId('distinct'),
      intentType: IntentType.DISTINCT,
      inputs: [inputNode],
      params: { keyFn },
      outputType: input.outputType,
      metadata: {},
    };
    return this.addNode(node);
  }

  /**
   * Mark node as output
   */
  output(nodeId: string): string {
    const node = this.getNode(nodeId);
    if (!node) throw new Error(`Node not found: ${nodeId}`);

    if (!this.outputNodes.includes(nodeId)) {
      this.outputNodes.push(nodeId);
    }
    return nodeId;
  }

  /**
   * Get topological execution order
   */
  getExecutionOrder(): string[] {
    const visited = new Set<string>();
    const order: string[] = [];

    const visit = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);

      const node = this.getNode(nodeId);
      if (!node) return;

      // Visit dependencies first
      for (const inputId of node.inputs) {
        visit(inputId);
      }

      order.push(nodeId);
    };

    // Start from outputs
    for (const outputId of this.outputNodes) {
      visit(outputId);
    }

    return order;
  }

  /**
   * Visualize graph as ASCII
   */
  visualize(): string {
    const lines: string[] = ['Intent Graph:'];
    const order = this.getExecutionOrder();

    for (const nodeId of order) {
      const node = this.getNode(nodeId);
      if (!node) continue;

      const shortId = nodeId.slice(0, 12);
      const inputs = node.inputs.map((id) => id.slice(0, 12)).join(', ');
      const inputsStr = inputs ? ` <- [${inputs}]` : '';

      lines.push(`  ${shortId}: ${node.intentType}${inputsStr}`);
    }

    lines.push(`Outputs: ${this.outputNodes.map((id) => id.slice(0, 12)).join(', ')}`);

    return lines.join('\n');
  }
}
