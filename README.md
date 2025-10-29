# IOC - Intent-Oriented Computing

A compiler framework that transforms high-level semantic intents into optimized executable code.

## What is IOC?

IOC (Intent-Oriented Computing) is a programming paradigm where you express **what you want to compute** (the intent) rather than **how to compute it**. The compiler automatically generates optimized code, applies graph-level optimizations, and selects the best execution strategy.

### Key Features

- 🎯 **Intent-Based Programming**: Express operations as semantic intents (filter, map, reduce, etc.)
- ⚡ **Automatic Optimization**: Graph-level optimizations (fusion, reordering, dead code elimination)
- 🔄 **Strategy Selection**: Automatically chooses between naive loops and optimized native methods
- 📊 **Performance Profiling**: Learns optimal execution strategies over time
- 🐛 **Rich Debugging**: Execution tracing, provenance tracking, differential testing
- 💪 **Type Safe**: Full TypeScript type system with static checking

## Quick Start

### Installation

```bash
npm install @ioc/compiler
```

### Basic Example

```typescript
import { Graph } from '@ioc/compiler';

// Create a graph
const graph = new Graph();

// Define input
const data = graph.input('data');

// Build pipeline
const positive = graph.filter(data, x => x > 0);
const squared = graph.map(positive, x => x * x);
const sum = graph.reduce(squared, (acc, x) => acc + x, 0);

// Mark output
graph.output(sum);

// Compile and execute
const compiled = graph.compile();
const result = compiled([1, -2, 3, -4, 5]); // Returns 35 (1² + 3² + 5²)
```

## Architecture

### Intent Graph

IOC programs are represented as directed acyclic graphs (DAGs) where:
- **Nodes** represent semantic intents (operations)
- **Edges** represent data dependencies
- **Types** track data types through the graph

### Supported Intents

| Intent | Description | Example |
|--------|-------------|---------|
| `input` | Define input parameter | `graph.input('data')` |
| `constant` | Literal value | `graph.constant(42)` |
| `filter` | Keep elements matching predicate | `graph.filter(data, x => x > 0)` |
| `map` | Transform each element | `graph.map(data, x => x * 2)` |
| `reduce` | Aggregate to single value | `graph.reduce(data, (a, b) => a + b, 0)` |
| `sort` | Sort elements | `graph.sort(data, (a, b) => a - b)` |
| `groupBy` | Group by key function | `graph.groupBy(data, x => x.type)` |
| `join` | Combine two collections | `graph.join(left, right, keyL, keyR)` |
| `flatten` | Flatten nested arrays | `graph.flatten(nested)` |
| `distinct` | Remove duplicates | `graph.distinct(data)` |

## Optimization

IOC applies several graph-level optimizations:

### 1. Dead Code Elimination
Removes nodes that don't contribute to outputs.

### 2. Common Subexpression Elimination
Deduplicates identical computations.

### 3. Filter Fusion
```typescript
// Before:
filter(filter(data, p1), p2)

// After:
filter(data, x => p1(x) && p2(x))
```

### 4. Map Fusion
```typescript
// Before:
map(map(data, f), g)

// After:
map(data, x => g(f(x)))
```

### 5. Filter-Before-Map Reordering
```typescript
// Before:
filter(map(data, expensiveTransform), predicate)

// After (if predicate is independent):
map(filter(data, predicate), expensiveTransform)
```

## Compilation

IOC compiles intent graphs to optimized JavaScript:

```typescript
import { Graph, GraphOptimizer, SolverKernel } from '@ioc/compiler';

const graph = new Graph();
// ... build graph ...

// Apply optimizations
const optimizer = new GraphOptimizer(graph);
optimizer.optimize();

// Compile with strategy selection
const kernel = new SolverKernel(graph);
const compiled = kernel.compile('speed'); // or 'memory', 'balanced'

// Execute
const result = compiled(inputData);

// Inspect generated code
console.log(kernel.getGeneratedCode());
```

### Generated Code Example

```javascript
function _ioc_compiled_fn(data) {
  // filter: node_abc
  node_abc = data.filter(pred_node_abc)
  
  // map: node_def
  node_def = node_abc.map(transform_node_def)
  
  // reduce: node_ghi
  node_ghi = node_def.reduce(op_node_ghi, 0)
  
  return node_ghi
}
```

## Strategies

IOC supports multiple execution strategies:

### NaiveStrategy
Simple loops - readable but not optimized.

```javascript
result = []
for (item of input) {
  if (predicate(item)) {
    result.push(item)
  }
}
```

### OptimizedStrategy (Default)
Uses native array methods for better performance.

```javascript
result = input.filter(predicate)
```

### VectorizedStrategy (Future)
SIMD/WebAssembly for numerical operations.

## Performance Profiling

IOC learns optimal execution strategies over time:

```typescript
import { getProfiler } from '@ioc/compiler';

const profiler = getProfiler();

// Profiler automatically tracks execution times
// and selects the fastest strategy for each intent

// View performance report
console.log(profiler.getReport());

// Save profiles for future runs
profiler.saveProfiles();
```

## Debugging

### Execution Tracing

```typescript
import { IOCDebugger } from '@ioc/compiler';

const debugger = new IOCDebugger(graph);
const traces = debugger.trace(inputData, verbose: true);

console.log(debugger.debugMode.getTraceSummary());
```

### Provenance Tracking

```typescript
import { ProvenanceTracker } from '@ioc/compiler';

const provenance = new ProvenanceTracker();
provenance.trackNodeCreation(nodeId, captureStack: true);

// Later, if an error occurs:
const report = provenance.generateErrorReport(nodeId, error);
console.log(report); // Shows transformation history and source location
```

### Differential Testing

```typescript
import { DifferentialTester } from '@ioc/compiler';

const tester = new DifferentialTester(graph);

// Compare optimized vs unoptimized execution
const result = tester.testWithOptimizations(inputData);

console.log(tester.formatReport(result));
// Shows: correctness, speedup, node reduction
```

## API Reference

### Graph

```typescript
class Graph {
  // Input/Output
  input(name: string, typeHint?: IOCType): string
  output(nodeId: string): string
  constant(value: any): string
  
  // Transformations
  filter(input: string, predicate: (x: any) => boolean): string
  map(input: string, transform: (x: any) => any): string
  reduce(input: string, operation: (acc: any, x: any) => any, initial?: any): string
  sort(input: string, compareFn?: (a: any, b: any) => number): string
  groupBy(input: string, keyFn: (x: any) => any): string
  join(left: string, right: string, leftKey: Function, rightKey: Function): string
  flatten(input: string, depth?: number): string
  distinct(input: string, keyFn?: (x: any) => any): string
  
  // Utilities
  getExecutionOrder(): string[]
  visualize(): string
  clone(): Graph
  optimize(passes?: string[]): void
}
```

### SolverKernel

```typescript
class SolverKernel {
  constructor(graph: Graph, profiler?: PerformanceProfiler)
  
  compile(optimizeFor?: 'speed' | 'memory' | 'balanced', saveProfile?: boolean): Function
  setSizeHint(nodeId: string, size: number): void
  getGeneratedCode(): string
  getStrategyReport(): string
}
```

## Examples

See `src/examples/` for:
- `basic.ts` - Simple filter/map/reduce pipeline
- `comprehensive.ts` - Full feature demonstration with optimization

## Testing

```bash
# Run all tests
npm test

# Type checking
npm run typecheck

# Build
npm run build

# Run examples
npx tsx src/examples/basic.ts
npx tsx src/examples/comprehensive.ts
```

## Project Structure

```
src/
├── core/
│   ├── types.ts           # Type system
│   ├── graph.ts           # Intent graph
│   ├── optimizer.ts       # Graph optimizations
│   ├── provenance.ts      # Provenance tracking
│   ├── debugger.ts        # Debugging tools
│   └── differential.ts    # Differential testing
├── solvers/
│   ├── strategies.ts      # Execution strategies
│   ├── kernel.ts          # Code generator
│   └── profiler.ts        # Performance profiling
├── examples/
│   ├── basic.ts
│   └── comprehensive.ts
└── tests/
    └── types.test.ts
```

## Python Implementation

The original Python implementation is preserved in the `prototype` branch. The TypeScript port achieves 100% feature parity with improvements in:
- Type safety
- IDE support
- Build system
- Package ecosystem

## Contributing

This is a research project exploring intent-oriented computing.

## License

All Rights Reserved - Proprietary License

This software is proprietary and confidential. Unauthorized copying, modification, distribution, or use of this software, via any medium, is strictly prohibited without explicit written permission from the copyright holder.

## Links

- **Repository**: https://github.com/Iweisc/ioc
- **Python Prototype**: `prototype` branch
- **TypeScript Port**: `ioc-ts` branch (current)

---

**Status**: Production-ready ✅
- All tests passing
- Clean builds (ESM + CJS + types)
- Full feature parity with Python
