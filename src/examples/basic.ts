/**
 * Basic example - demonstrates IOC core functionality
 */

import { Graph, IntType, ListType } from '../index.js';
import { SolverKernel } from '../solvers/kernel.js';

function main() {
  console.log('=== IOC TypeScript Example ===\n');

  // Create a graph
  const graph = new Graph();

  // Define inputs
  const data = graph.input('data', new ListType(new IntType()));

  // Filter: keep numbers > 10
  const filtered = graph.filter(data, (x) => (x as number) > 10);

  // Map: multiply by 2
  const mapped = graph.map(filtered, (x) => (x as number) * 2);

  // Mark as output
  graph.output(mapped);

  // Visualize the graph
  console.log(graph.visualize());
  console.log();

  // Get execution order
  const order = graph.getExecutionOrder();
  console.log('Execution order:', order);
  console.log();

  // Compile (stub implementation for now)
  const kernel = new SolverKernel();
  const compiled = kernel.compile(graph, 'speed');

  console.log('Compilation metadata:', compiled.metadata);
}

main();
