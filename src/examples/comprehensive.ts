// Comprehensive Example - Demonstrates full IOC capabilities

import { Graph, GraphOptimizer, SolverKernel, IOCDebugger } from '../index';

/**
 * Example: Advanced data processing pipeline with optimization
 */
function main() {
  console.log('='.repeat(70));
  console.log('IOC Comprehensive Example - TypeScript Implementation');
  console.log('='.repeat(70));
  console.log('');

  // Create a graph
  const graph = new Graph();

  // Define inputs
  const data = graph.input('data');

  // Build a complex pipeline:
  // 1. Filter positive numbers
  // 2. Square them
  // 3. Filter squares > 100
  // 4. Sort descending
  // 5. Take sum

  const positive = graph.filter(data, (x: any) => x > 0);
  const squared = graph.map(positive, (x: any) => x * x);
  const large = graph.filter(squared, (x: any) => x > 100);
  const sorted = graph.sort(large, (a: any, b: any) => b - a);
  const sum = graph.reduce(sorted, (acc: any, x: any) => acc + x, 0);

  // Mark as output
  graph.output(sum);

  console.log('Original Graph:');
  console.log(graph.visualize());
  console.log('');
  console.log(`Node count: ${graph.nodes.size}`);
  console.log('');

  // Apply optimizations
  console.log('Applying optimizations...');
  const optimizer = new GraphOptimizer(graph);
  optimizer.optimize();
  console.log('');
  console.log(optimizer.getOptimizationReport());
  console.log('');

  console.log('Optimized Graph:');
  console.log(graph.visualize());
  console.log('');
  console.log(`Node count after optimization: ${graph.nodes.size}`);
  console.log('');

  // Compile the graph
  console.log('Compiling graph...');
  const kernel = new SolverKernel(graph);
  const compiled = kernel.compile('speed');
  console.log('');

  console.log('Generated Code:');
  console.log('-'.repeat(70));
  console.log(kernel.getGeneratedCode());
  console.log('-'.repeat(70));
  console.log('');

  // Execute with test data
  const testData = [-5, 3, 12, -2, 15, 8, -10, 20, 4];
  console.log(`Test data: [${testData.join(', ')}]`);
  console.log('');

  try {
    const result = compiled(testData);
    console.log(`Result: ${result}`);
    console.log('');

    // Manual calculation for verification:
    // Positive: [3, 12, 15, 8, 20, 4]
    // Squared: [9, 144, 225, 64, 400, 16]
    // Large (>100): [144, 225, 400]
    // Sorted desc: [400, 225, 144]
    // Sum: 769
    const expected = 769;
    console.log(`Expected: ${expected}`);
    console.log(`Match: ${result === expected ? '✓' : '✗'}`);
    console.log('');

    // Show strategy report
    console.log(kernel.getStrategyReport());
    console.log('');

    // Demonstrate debugging capabilities
    console.log('Debugging Information:');
    console.log('-'.repeat(70));
    const debugger = new IOCDebugger(graph);
    const nodeId = graph.getExecutionOrder()[0];
    console.log(debugger.explainNode(nodeId));
    console.log('');

    console.log('='.repeat(70));
    console.log('✓ Example completed successfully!');
    console.log('='.repeat(70));
  } catch (error) {
    console.error('Error during execution:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { main };
