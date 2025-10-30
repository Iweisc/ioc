/**
 * Example: Safe IOC Language
 *
 * Demonstrates the new .ioc language with:
 * - Serializable programs (no JavaScript functions!)
 * - Termination guarantees
 * - Complexity bounds
 * - .ioc file format
 */

import { SafeGraph } from '../dsl/safe-graph.js';
import { Predicate, Transform, Reduce } from '../dsl/safe-types.js';
import { saveIOCFile, loadIOCFile } from '../dsl/ioc-format.js';
import * as path from 'path';

/**
 * Demonstrates the Safe IOC workflow by constructing, validating, serializing, saving/loading, compiling, and executing example SafeGraph pipelines.
 *
 * Builds three example pipelines (numeric processing with filter/map/sort/reduce, complex object transforms, and conditional transforms),
 * validates and serializes them to the IOC format, attempts to save/load a .ioc file, compiles the graphs with termination verification,
 * executes test inputs, and prints diagnostic output and verification results to the console.
 *
 * Side effects: writes diagnostic messages to stdout and may attempt to save a .ioc file to disk.
 */
async function main() {
  console.log('='.repeat(70));
  console.log('IOC Safe Language Example');
  console.log('='.repeat(70));
  console.log('');

  // Create a safe graph
  const graph = new SafeGraph('DataProcessingPipeline');

  // Define input
  const data = graph.input('data', 'number[]');

  // Pipeline using ONLY safe constructs (no JavaScript functions!)

  // 1. Filter: keep numbers > 10
  const filtered = graph.filter(data, Predicate.gt(10));

  // 2. Map: multiply by 2
  const doubled = graph.map(filtered, Transform.multiply(2));

  // 3. Map: add 5
  const added = graph.map(doubled, Transform.add(5));

  // 4. Filter: keep numbers < 50
  const bounded = graph.filter(added, Predicate.lt(50));

  // 5. Sort descending
  const sorted = graph.sort(bounded, undefined, true);

  // 6. Sum all values
  const sum = graph.reduce(sorted, Reduce.sum());

  // Mark as output
  graph.output(sum);

  console.log('Graph constructed with safe operations only!\n');

  // Validate the graph
  const validation = graph.validate();
  console.log('Validation:', validation.valid ? '✓ PASS' : '✗ FAIL');
  if (!validation.valid) {
    console.log('Errors:', validation.errors);
    return;
  }
  console.log('');

  // Show the .ioc file format
  const iocCode = graph.toIOC();
  console.log('Serialized .ioc program:');
  console.log('-'.repeat(70));
  console.log(iocCode);
  console.log('-'.repeat(70));
  console.log('');

  // Save to file
  const filePath = path.join(process.cwd(), 'examples', 'pipeline.ioc');
  try {
    await saveIOCFile(graph.toProgram(), filePath);
    console.log(`Saved to: ${filePath}\n`);

    // Load it back
    const loaded = await loadIOCFile(filePath);
    console.log(`Loaded program: ${loaded.metadata.name}`);
    console.log(`Nodes: ${loaded.nodes.length}`);
    console.log(`Outputs: ${loaded.outputs.length}\n`);
  } catch (error: any) {
    console.log(`Note: Could not save file (${error.message})\n`);
  }

  // Compile and execute
  console.log('Compiling...');
  const compiled = graph.compile();
  console.log('✓ Compilation successful with termination verification\n');

  // Test data
  const testData = [5, 12, 8, 20, 3, 15, 25, 30, 1, 18];
  console.log(`Input: [${testData.join(', ')}]`);

  // Execute
  try {
    const result = compiled(testData);
    console.log(`Output: ${result}\n`);

    // Manual verification:
    // Filtered > 10: [12, 20, 15, 25, 30, 18]
    // Doubled: [24, 40, 30, 50, 60, 36]
    // Added 5: [29, 45, 35, 55, 65, 41]
    // Bounded < 50: [29, 45, 35, 41]
    // Sorted desc: [45, 41, 35, 29]
    // Sum: 150
    const expected = 150;
    console.log(`Expected: ${expected}`);
    console.log(`Match: ${result === expected ? '✓' : '✗'}\n`);
  } catch (error: any) {
    console.error('Execution error:', error.message);
  }

  // Example 2: Complex transforms
  console.log('='.repeat(70));
  console.log('Example 2: Complex Safe Transforms');
  console.log('='.repeat(70));
  console.log('');

  const graph2 = new SafeGraph('ComplexPipeline');
  const input2 = graph2.input('records', 'object[]');

  // Filter records where property 'age' > 18
  const adults = graph2.filter(input2, Predicate.property.gt('age', 18));

  // Extract name property
  const names = graph2.map(adults, Transform.property('name'));

  // Convert to uppercase
  const upperNames = graph2.map(names, Transform.uppercase());

  // Sort alphabetically
  const sortedNames = graph2.sort(upperNames);

  graph2.output(sortedNames);

  const compiled2 = graph2.compile();

  const records = [
    { name: 'Alice', age: 25 },
    { name: 'Bob', age: 17 },
    { name: 'Charlie', age: 30 },
    { name: 'Diana', age: 16 },
    { name: 'Eve', age: 22 },
  ];

  console.log('Input records:', JSON.stringify(records, null, 2));
  console.log('');

  const result2 = compiled2(records);
  console.log('Output (adults, uppercase, sorted):');
  console.log(JSON.stringify(result2, null, 2));
  console.log('');

  // Example 3: Conditional transforms
  console.log('='.repeat(70));
  console.log('Example 3: Conditional Logic (Safe!)');
  console.log('='.repeat(70));
  console.log('');

  const graph3 = new SafeGraph('ConditionalPipeline');
  const nums3 = graph3.input('numbers');

  // Conditional transform: if x > 0 then x * 2 else x + 100
  const conditional = graph3.map(
    nums3,
    Transform.ifThenElse(Predicate.gt(0), Transform.multiply(2), Transform.add(100))
  );

  graph3.output(conditional);

  const compiled3 = graph3.compile();
  const testData3 = [-5, 10, -3, 20, 0, -1];

  console.log(`Input: [${testData3.join(', ')}]`);
  const result3 = compiled3(testData3);
  console.log(`Output: [${result3.join(', ')}]`);
  console.log('(positive numbers doubled, negative/zero numbers +100)');
  console.log('');

  // Show .ioc representation
  console.log('This conditional logic is FULLY SERIALIZABLE:');
  console.log('-'.repeat(70));
  const program3 = graph3.toProgram();
  const mapNode = program3.nodes.find((n) => n.type === 'map');
  if (mapNode) {
    console.log(JSON.stringify(mapNode.params, null, 2));
  }
  console.log('-'.repeat(70));
  console.log('');

  console.log('='.repeat(70));
  console.log('✓ All examples completed successfully!');
  console.log('');
  console.log('Key achievements:');
  console.log('  • No JavaScript functions in the graph');
  console.log('  • Everything is serializable to .ioc files');
  console.log('  • Termination is guaranteed by construction');
  console.log('  • Complexity bounds are known statically');
  console.log('  • Can save/load programs as pure data');
  console.log('='.repeat(70));
}

// Run if called directly
// if (import.meta.url === `file://${process.argv[1]}`) {
main().catch(console.error);
// }

export { main };