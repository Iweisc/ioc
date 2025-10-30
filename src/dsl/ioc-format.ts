/**
 * .ioc File Format - Serializable Intent-Oriented Computing Programs
 *
 * This module defines the file format for storing IOC programs as JSON.
 * Unlike the original graph format, .ioc files contain ONLY safe, serializable
 * constructs - no JavaScript functions!
 */

import {
  SafePredicate,
  SafeTransform,
  ReductionOp,
  SafeValue,
  ComplexityClass,
  getPredicateComplexity,
  getTransformComplexity,
} from './safe-types.js';

/**
 * Intent types in .ioc format
 */
export enum IOCIntentType {
  INPUT = 'input',
  OUTPUT = 'output',
  CONSTANT = 'constant',
  FILTER = 'filter',
  MAP = 'map',
  REDUCE = 'reduce',
  SORT = 'sort',
  DISTINCT = 'distinct',
  FLATTEN = 'flatten',
  GROUP_BY = 'group_by',
  JOIN = 'join',
  SLICE = 'slice',
  CONCAT = 'concat',
}

/**
 * Capability declaration for an intent node
 */
export interface IntentCapability {
  maxComplexity: ComplexityClass;
  terminationGuarantee: 'structural' | 'bounded' | 'empirical';
  sideEffects: 'pure' | 'io' | 'stateful';
  parallelizable: boolean;
  memoryBound?: string;
}

/**
 * A node in an .ioc program
 */
export interface IOCNode {
  id: string;
  type: IOCIntentType;
  inputs: string[];
  params: IOCNodeParams;
  capability: IntentCapability;
  metadata?: {
    description?: string;
    tags?: string[];
    [key: string]: any;
  };
}

/**
 * Parameters for different intent types
 */
export type IOCNodeParams =
  | { intent: 'input'; name: string; typeHint?: string }
  | { intent: 'constant'; value: SafeValue }
  | { intent: 'filter'; predicate: SafePredicate }
  | { intent: 'map'; transform: SafeTransform }
  | { intent: 'reduce'; operation: ReductionOp; initial?: SafeValue }
  | { intent: 'sort'; keyTransform?: SafeTransform; descending?: boolean }
  | { intent: 'distinct'; keyTransform?: SafeTransform }
  | { intent: 'flatten'; depth?: number }
  | { intent: 'group_by'; keyTransform: SafeTransform }
  | {
      intent: 'join';
      leftKey: SafeTransform;
      rightKey: SafeTransform;
      joinType?: 'inner' | 'left' | 'right' | 'outer';
    }
  | { intent: 'slice'; start?: number; end?: number }
  | { intent: 'concat' };

/**
 * Complete .ioc program file structure
 */
export interface IOCProgram {
  version: string;
  metadata: {
    name?: string;
    description?: string;
    author?: string;
    created?: string;
    modified?: string;
    tags?: string[];
  };
  nodes: IOCNode[];
  outputs: string[];
  options?: {
    optimizationLevel?: 'none' | 'basic' | 'aggressive';
    targetRuntime?: 'javascript' | 'wasm' | 'native';
    maxMemory?: number;
    timeout?: number;
  };
}

/**
 * Converts an IOCProgram to a pretty-printed JSON string.
 *
 * @returns The JSON string representation of `program` formatted with two-space indentation.
 */
export function serializeIOC(program: IOCProgram): string {
  return JSON.stringify(program, null, 2);
}

/**
 * Parse and validate a JSON string into an IOCProgram.
 *
 * SECURITY: Validates input size and structure before parsing.
 *
 * @param json - The JSON string containing a serialized .ioc program
 * @returns The deserialized IOCProgram
 * @throws Error if the `version` is missing or does not start with `1.`, if the `nodes` field is not an array, or if the `outputs` field is not an array
 */
export function deserializeIOC(json: string): IOCProgram {
  // Security: Validate input size before parsing (DoS prevention)
  const MAX_INPUT_SIZE = 10 * 1024 * 1024; // 10 MB for .ioc JSON files
  const inputSize = Buffer.byteLength(json, 'utf-8');
  if (inputSize > MAX_INPUT_SIZE) {
    throw new Error(
      `IOC file too large: ${inputSize} bytes exceeds maximum of ${MAX_INPUT_SIZE} bytes`
    );
  }

  const parsed = JSON.parse(json);

  // Validate version (fail fast)
  if (!parsed.version || !parsed.version.startsWith('1.')) {
    throw new Error(`Unsupported .ioc version: ${parsed.version}`);
  }

  // Validate required fields (fail fast)
  if (!Array.isArray(parsed.nodes)) {
    throw new Error('Invalid .ioc file: missing nodes array');
  }

  if (!Array.isArray(parsed.outputs)) {
    throw new Error('Invalid .ioc file: missing outputs array');
  }

  // Security: Validate node count
  const MAX_NODES = 10000;
  if (parsed.nodes.length > MAX_NODES) {
    throw new Error(
      `IOC program too complex: ${parsed.nodes.length} nodes exceeds maximum of ${MAX_NODES}`
    );
  }

  return parsed as IOCProgram;
}

/**
 * Load and parse an IOCProgram from a file on disk.
 *
 * @param path - Filesystem path to the `.ioc` JSON file to read
 * @returns The deserialized IOCProgram represented by the file contents
 */
export async function loadIOCFile(path: string): Promise<IOCProgram> {
  const fs = await import('fs/promises');
  const content = await fs.readFile(path, 'utf-8');
  return deserializeIOC(content);
}

/**
 * Writes an IOCProgram to disk as a pretty-printed .ioc JSON file.
 *
 * @param program - The IOC program to serialize and save
 * @param path - Filesystem path where the JSON will be written
 */
export async function saveIOCFile(program: IOCProgram, path: string): Promise<void> {
  const fs = await import('fs/promises');
  const content = serializeIOC(program);
  await fs.writeFile(path, content, 'utf-8');
}

/**
 * Compute the execution and resource capability for a given IOC node.
 *
 * @param node - The IOC node to evaluate
 * @returns An IntentCapability describing maxComplexity, terminationGuarantee, sideEffects, parallelizable, and optional memoryBound
 * @throws Error if `node.type` is not a recognized IOCIntentType
 */
export function calculateNodeCapability(node: IOCNode): IntentCapability {
  switch (node.type) {
    case IOCIntentType.INPUT:
    case IOCIntentType.CONSTANT:
      return {
        maxComplexity: ComplexityClass.CONSTANT,
        terminationGuarantee: 'structural',
        sideEffects: 'pure',
        parallelizable: true,
        memoryBound: 'O(1)',
      };

    case IOCIntentType.FILTER: {
      const params = node.params as Extract<IOCNodeParams, { intent: 'filter' }>;
      const predComplexity = getPredicateComplexity(params.predicate);
      return {
        maxComplexity: predComplexity,
        terminationGuarantee: 'structural',
        sideEffects: 'pure',
        parallelizable: true,
        memoryBound: 'O(n)',
      };
    }

    case IOCIntentType.MAP: {
      const params = node.params as Extract<IOCNodeParams, { intent: 'map' }>;
      const transformComplexity = getTransformComplexity(params.transform);
      return {
        maxComplexity: transformComplexity,
        terminationGuarantee: 'structural',
        sideEffects: 'pure',
        parallelizable: true,
        memoryBound: 'O(n)',
      };
    }

    case IOCIntentType.REDUCE: {
      return {
        maxComplexity: ComplexityClass.LINEAR,
        terminationGuarantee: 'structural',
        sideEffects: 'pure',
        parallelizable: false,
        memoryBound: 'O(1)',
      };
    }

    case IOCIntentType.SORT: {
      return {
        maxComplexity: ComplexityClass.LINEARITHMIC,
        terminationGuarantee: 'bounded',
        sideEffects: 'pure',
        parallelizable: false,
        memoryBound: 'O(n)',
      };
    }

    case IOCIntentType.DISTINCT:
    case IOCIntentType.FLATTEN:
    case IOCIntentType.SLICE:
    case IOCIntentType.CONCAT: {
      return {
        maxComplexity: ComplexityClass.LINEAR,
        terminationGuarantee: 'structural',
        sideEffects: 'pure',
        parallelizable: true,
        memoryBound: 'O(n)',
      };
    }

    case IOCIntentType.GROUP_BY: {
      return {
        maxComplexity: ComplexityClass.LINEAR,
        terminationGuarantee: 'structural',
        sideEffects: 'pure',
        parallelizable: false,
        memoryBound: 'O(n)',
      };
    }

    case IOCIntentType.JOIN: {
      return {
        maxComplexity: ComplexityClass.QUADRATIC,
        terminationGuarantee: 'structural',
        sideEffects: 'pure',
        parallelizable: false,
        memoryBound: 'O(n²)',
      };
    }

    case IOCIntentType.OUTPUT: {
      return {
        maxComplexity: ComplexityClass.CONSTANT,
        terminationGuarantee: 'structural',
        sideEffects: 'pure',
        parallelizable: true,
        memoryBound: 'O(1)',
      };
    }

    default: {
      const _exhaustive: never = node.type;
      throw new Error(`Unknown intent type: ${_exhaustive}`);
    }
  }
}

/**
 * Validate structural correctness and capability consistency of an IOCProgram.
 *
 * @param program - The IOCProgram to validate.
 * @returns An object with `valid` set to `true` if no validation errors were found, and `errors` containing descriptive messages for each failure.
 */
export function validateIOCProgram(program: IOCProgram): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check all nodes exist
  const nodeIds = new Set(program.nodes.map((n) => n.id));

  // Validate outputs reference valid nodes
  for (const outputId of program.outputs) {
    if (!nodeIds.has(outputId)) {
      errors.push(`Output references non-existent node: ${outputId}`);
    }
  }

  // Validate all inputs reference valid nodes
  for (const node of program.nodes) {
    for (const inputId of node.inputs) {
      if (!nodeIds.has(inputId)) {
        errors.push(`Node ${node.id} references non-existent input: ${inputId}`);
      }
    }
  }

  // Check for cycles (DAG requirement)
  const hasCycle = detectCycle(program);
  if (hasCycle) {
    errors.push('Program contains a cycle - must be a DAG');
  }

  // Validate capabilities match actual operations
  for (const node of program.nodes) {
    const calculated = calculateNodeCapability(node);
    if (node.capability.maxComplexity !== calculated.maxComplexity) {
      errors.push(
        `Node ${node.id} declares complexity ${node.capability.maxComplexity} ` +
          `but calculated complexity is ${calculated.maxComplexity}`
      );
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Determines whether the IOCProgram's node graph contains a cycle.
 *
 * Missing or unknown referenced input node IDs are ignored when evaluating dependencies.
 *
 * @returns `true` if a cycle is present in the program's input dependencies, `false` otherwise.
 */
function detectCycle(program: IOCProgram): boolean {
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  const nodeMap = new Map(program.nodes.map((n) => [n.id, n]));

  /**
   * Perform a depth-first search from a node to detect a back-edge that indicates a cycle.
   *
   * Marks traversal state in the module-scoped `visited` and `recursionStack` sets while exploring.
   *
   * @param nodeId - The identifier of the node to start DFS from
   * @returns `true` if a cycle is reachable from `nodeId`, `false` otherwise
   */
  function dfs(nodeId: string): boolean {
    visited.add(nodeId);
    recursionStack.add(nodeId);

    const node = nodeMap.get(nodeId);
    if (!node) return false;

    for (const inputId of node.inputs) {
      if (!visited.has(inputId)) {
        if (dfs(inputId)) return true;
      } else if (recursionStack.has(inputId)) {
        return true; // Cycle detected
      }
    }

    recursionStack.delete(nodeId);
    return false;
  }

  for (const node of program.nodes) {
    if (!visited.has(node.id)) {
      if (dfs(node.id)) return true;
    }
  }

  return false;
}

/**
 * Compute a topological execution order where input dependencies appear before dependent nodes.
 *
 * @returns An array of node IDs ordered so each node appears after all of its input dependencies. Nodes referenced by inputs that are not present in `program.nodes` are skipped.
 */
export function getExecutionOrder(program: IOCProgram): string[] {
  const visited = new Set<string>();
  const order: string[] = [];
  const nodeMap = new Map(program.nodes.map((n) => [n.id, n]));

  /**
   * Visit a node and its input dependencies recursively, appending node ids to `order` in topological execution order.
   *
   * Visits each dependency before the node and does nothing for unknown or already-visited nodes.
   *
   * @param nodeId - The id of the node to visit within the current program graph
   */
  function visit(nodeId: string) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);

    const node = nodeMap.get(nodeId);
    if (!node) return;

    for (const inputId of node.inputs) {
      visit(inputId);
    }

    order.push(nodeId);
  }

  for (const outputId of program.outputs) {
    visit(outputId);
  }

  return order;
}
