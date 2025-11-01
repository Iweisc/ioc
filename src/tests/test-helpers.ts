/**
 * Test helper functions for creating test data
 */
import type { IOCProgram, IOCNode, IntentCapability } from '../dsl/ioc-format';
import { IOCIntentType, calculateNodeCapability } from '../dsl/ioc-format';
import { ComplexityClass } from '../dsl/safe-types';

/**
 * Create a default capability for testing
 */
function createDefaultCapability(): IntentCapability {
  return {
    maxComplexity: ComplexityClass.CONSTANT,
    terminationGuarantee: 'structural',
    sideEffects: 'pure',
    parallelizable: true,
    memoryBound: 'O(1)',
  };
}

/**
 * Create a simple test IOC program
 */
export function createSimpleProgram(): IOCProgram {
  const inputNode: IOCNode = {
    id: 'input',
    type: IOCIntentType.INPUT,
    inputs: [],
    params: { intent: 'input', name: 'data' },
    capability: createDefaultCapability(),
  };

  const outputNode: IOCNode = {
    id: 'output',
    type: IOCIntentType.CONSTANT,
    inputs: ['input'],
    params: { intent: 'constant', value: 42 },
    capability: createDefaultCapability(),
  };

  const program: IOCProgram = {
    version: '1.0.0',
    nodes: [inputNode, outputNode],
    outputs: ['output'],
    metadata: { name: 'test' },
  };

  // Calculate capabilities properly after nodes are created
  program.nodes[0]!.capability = calculateNodeCapability(program.nodes[0]!);
  program.nodes[1]!.capability = calculateNodeCapability(program.nodes[1]!);

  return program;
}

/**
 * Create a large test IOC program
 */
export function createLargeProgram(nodeCount: number): IOCProgram {
  const nodes: IOCNode[] = [];

  for (let i = 0; i < nodeCount; i++) {
    const node: IOCNode = {
      id: `node${i}`,
      type: IOCIntentType.CONSTANT,
      inputs: i > 0 ? [`node${i - 1}`] : [],
      params: { intent: 'constant', value: i },
      capability: createDefaultCapability(),
    };
    nodes.push(node);
  }

  const program: IOCProgram = {
    version: '1.0.0',
    nodes,
    outputs: [`node${nodeCount - 1}`],
    metadata: { name: 'large' },
  };

  // Calculate capabilities properly
  for (const node of program.nodes) {
    node.capability = calculateNodeCapability(node);
  }

  return program;
}

/**
 * Create an empty test IOC program
 */
export function createEmptyProgram(): IOCProgram {
  return {
    version: '1.0.0',
    nodes: [],
    outputs: [],
    metadata: { name: 'empty' },
  };
}
