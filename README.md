# IOC - Intent-Oriented Computing

**A revolutionary programming paradigm where you express WHAT you want to compute, not HOW to compute it.**

## 🚀 What Makes IOC Different?

Traditional programming requires you to write JavaScript functions with arbitrary logic. IOC replaces this with a **safe, serializable DSL** where:

- ✅ **Termination is guaranteed** - No infinite loops, ever
- ✅ **Fully serializable** - Save programs as JSON `.ioc` files
- ✅ **Known complexity bounds** - Every operation has documented complexity (O(n), O(n log n), etc.)
- ✅ **Reduced code execution risks** - Safer for serverless environments (with proper validation and limits)
- ✅ **Hardware portable** - Same program, optimized per platform
- ✅ **Auto-verifiable** - Empirical termination verification

## Quick Example

**Traditional JavaScript:**

```javascript
const result = data
  .filter((x) => x > 10)
  .map((x) => x * 2)
  .reduce((a, b) => a + b, 0);
```

**IOC Language (`.ioc` files):**

```ioc
# pipeline.ioc
input numbers: number[]

filtered = filter numbers where x > 10
doubled = map filtered with x * 2
total = reduce doubled by sum

output total
```

**Run it:**

```bash
ioc run pipeline.ioc --input '[5, 12, 8, 20]'
# Result: 64
```

**Or use the TypeScript API:**

```typescript
import { SafeGraph, Predicate, Transform, Reduce } from '@ioc/compiler';

const graph = new SafeGraph();
const input = graph.input('data');

const filtered = graph.filter(input, Predicate.gt(10));
const doubled = graph.map(filtered, Transform.multiply(2));
const sum = graph.reduce(doubled, Reduce.sum());

graph.output(sum);

// Compile with termination verification
const compiled = graph.compile();
const result = compiled([5, 12, 8, 20]); // 64
```

**The difference?** IOC programs have:

- No arbitrary JavaScript functions (fully serializable!)
- Guaranteed termination
- Known complexity bounds (documented for each operation)
- Can be saved/loaded as `.ioc` files

## Installation

```bash
npm install @ioc/compiler
```

## The .ioc Language

IOC has its own custom syntax for writing programs in `.ioc` files!

### Syntax Overview

```ioc
# Comments start with #
input <name>: <type>

<variable> = filter <source> where <predicate>
<variable> = map <source> with <transform>
<variable> = reduce <source> by <operation>

output <variable>
```

### Complete Example

```ioc
# Process user data
input users: object[]

# Filter adults only
adults = filter users where x.age >= 18

# Extract names
names = map adults with x.name

# Convert to uppercase
uppercase_names = map names with uppercase(x)

# Output result
output uppercase_names
```

Run it:

```bash
ioc run process_users.ioc --input '[{"name":"Alice","age":25},{"name":"Bob","age":17}]'
# Result: ["ALICE"]
```

### Language Reference

**Predicates** (for `filter` and `where`):

- `x > 10`, `x < 100`, `x >= 18`, `x <= 65`
- `x == "admin"`, `x != null`
- `x.property > 18` (property access)
- `x and y`, `x or y`, `not x` (logical operators)

**Transforms** (for `map` and `with`):

- `x * 2`, `x + 10`, `x - 5`, `x / 3` (arithmetic)
- `x.name`, `x.email` (property access)
- `uppercase(x)`, `lowercase(x)`, `trim(x)` (string operations)

**Reductions** (for `reduce` and `by`):

- `sum`, `product`, `average`
- `max`, `min`, `count`
- `first`, `last`, `join`

**Note on Empty Arrays:**

- `sum`, `product`, `count`, `join` handle empty arrays gracefully (return 0, 1, 0, "" respectively)
- `min`, `max`, `average`, `first`, `last` throw clear errors on empty arrays
- Always validate that arrays are non-empty before using operations that don't handle empty arrays

### CLI Commands

```bash
# Run a program
ioc run <file.ioc> --input '<json>'

# Validate syntax and safety
ioc validate <file.ioc>

# Compile to JavaScript
ioc compile <file.ioc> --output <file.js>
```

## TypeScript API

### Core Concepts

Every IOC program is a **directed acyclic graph (DAG)** of intents. Each intent has:

1. **Type** - What operation to perform (`filter`, `map`, `reduce`, etc.)
2. **Inputs** - Which nodes feed into this one
3. **Parameters** - Safe, serializable configuration
4. **Capability** - Complexity bounds and guarantees

### Example: Complete Pipeline

```typescript
import { SafeGraph, Predicate, Transform, Reduce } from '@ioc/compiler';

const graph = new SafeGraph('DataProcessing');

// Input
const data = graph.input('data', 'number[]');

// Pipeline using ONLY safe constructs
const filtered = graph.filter(data, Predicate.gt(10));
const doubled = graph.map(filtered, Transform.multiply(2));
const added = graph.map(doubled, Transform.add(5));
const bounded = graph.filter(added, Predicate.lt(50));
const sorted = graph.sort(bounded, undefined, true); // descending
const sum = graph.reduce(sorted, Reduce.sum());

graph.output(sum);

// Save to .ioc file
await saveIOCFile(graph.toProgram(), 'pipeline.ioc');

// Load and execute later
const loaded = await loadIOCFile('pipeline.ioc');
```

### Safe Predicates

```typescript
// Comparison
Predicate.gt(10); // x > 10
Predicate.lt(50); // x < 50
Predicate.eq('hello'); // x === 'hello'
Predicate.in([1, 2, 3]); // [1,2,3].includes(x)

// Property access
Predicate.property.gt('age', 18); // x.age > 18
Predicate.property.eq('status', 'active');

// Type checks
Predicate.isNumber();
Predicate.isString();
Predicate.isArray();

// Combinators
Predicate.and(Predicate.gt(0), Predicate.lt(100));
Predicate.or(Predicate.eq('admin'), Predicate.eq('moderator'));
Predicate.not(Predicate.eq(null));
```

### Safe Transforms

```typescript
// Arithmetic
Transform.add(5);
Transform.multiply(2);
Transform.divide(10);
Transform.negate();

// String operations
Transform.uppercase();
Transform.lowercase();
Transform.trim();

// Property access
Transform.property('name');
Transform.property('user', 'email'); // nested: x.user.email

// Conditionals (fully serializable!)
Transform.ifThenElse(
  Predicate.gt(0),
  Transform.multiply(2), // if true
  Transform.add(100) // if false
);

// Composition
Transform.compose(Transform.property('age'), Transform.multiply(12), Transform.add(5)); // (x.age * 12) + 5

// Object construction
Transform.construct({
  fullName: Transform.property('name'),
  isAdult: Transform.property('age'), // with implicit check
});
```

### Safe Reductions

```typescript
Reduce.sum(); // Sum all numbers
Reduce.product(); // Multiply all numbers
Reduce.min(); // Find minimum
Reduce.max(); // Find maximum
Reduce.count(); // Count elements
Reduce.average(); // Calculate mean
Reduce.first(); // Get first element
Reduce.last(); // Get last element
Reduce.any(Predicate.gt(10)); // Any element > 10?
Reduce.all(Predicate.isNumber()); // All numbers?
```

## Real-World Example

```typescript
import { SafeGraph, Predicate, Transform } from '@ioc/compiler';

const graph = new SafeGraph('UserProcessing');

// Input: array of user objects
const users = graph.input('users');

// Filter: adults only
const adults = graph.filter(users, Predicate.property.gt('age', 18));

// Transform: extract names
const names = graph.map(adults, Transform.property('name'));

// Transform: uppercase
const upperNames = graph.map(names, Transform.uppercase());

// Sort alphabetically
const sorted = graph.sort(upperNames);

graph.output(sorted);

// Compile
const process = graph.compile();

// Execute
const users = [
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 17 },
  { name: 'Charlie', age: 30 },
];

const result = process(users); // ['ALICE', 'CHARLIE']
```

## .ioc File Format

Programs are saved as JSON:

```json
{
  "version": "1.0.0",
  "metadata": {
    "name": "DataProcessing",
    "created": "2025-10-29T00:00:00.000Z"
  },
  "nodes": [
    {
      "id": "input_123",
      "type": "input",
      "inputs": [],
      "params": {
        "intent": "input",
        "name": "data"
      },
      "capability": {
        "maxComplexity": "O(1)",
        "terminationGuarantee": "structural",
        "sideEffects": "pure",
        "parallelizable": true
      }
    },
    {
      "id": "filter_456",
      "type": "filter",
      "inputs": ["input_123"],
      "params": {
        "intent": "filter",
        "predicate": {
          "type": "compare",
          "op": "gt",
          "value": 10
        }
      },
      "capability": {
        "maxComplexity": "O(1)",
        "terminationGuarantee": "structural"
      }
    }
  ],
  "outputs": ["filter_456"]
}
```

## Termination Verification

Every function is verified before execution:

```typescript
const graph = new SafeGraph();
const data = graph.input('data');

// This will pass verification
const safe = graph.filter(data, Predicate.gt(10));

// Compilation includes verification
const compiled = graph.compile(); // ✓ Verification passed

// If a user-provided function fails verification, compilation throws
```

## Complexity Guarantees

Every operation declares its complexity:

```typescript
IntentType.FILTER:    O(n)         // Linear scan
IntentType.MAP:       O(n)         // Linear transform
IntentType.REDUCE:    O(n)         // Linear aggregation
IntentType.SORT:      O(n log n)   // Comparison sort
IntentType.DISTINCT:  O(n)         // Hash-based dedup
IntentType.JOIN:      O(n²)        // Nested loop join
```

## Why Use IOC?

### 1. **Serverless Safety**

Deploy user-generated computation without DoS risk:

```typescript
// User submits a .ioc file
const program = await loadIOCFile(userUpload);

// Validate before running
const validation = validateIOCProgram(program);
if (!validation.valid) {
  return { error: validation.errors };
}

// Safe to execute - guaranteed termination
const result = compileAndRun(program, userData);
```

### 2. **Zero-Trust Compute**

Run untrusted code safely:

```typescript
// Each node has explicit capability bounds
node.capability = {
  maxComplexity: 'O(n)',
  terminationGuarantee: 'structural',
  sideEffects: 'pure',
};

// Runtime enforces these bounds
```

### 3. **Cross-Platform Optimization**

Same .ioc file, different backends:

```typescript
const program = loadIOCFile('pipeline.ioc');

// JavaScript execution
const jsCompiled = compileToJS(program);

// WebAssembly execution (future)
const wasmCompiled = compileToWASM(program);

// Distributed execution (future)
const distributedPlan = compileToDistributed(program);
```

## API Reference

### SafeGraph

```typescript
class SafeGraph {
  input(name: string, typeHint?: string): string;
  constant(value: SafeValue): string;

  filter(input: string, predicate: SafePredicate): string;
  map(input: string, transform: SafeTransform): string;
  reduce(input: string, operation: ReductionOp, initial?: SafeValue): string;

  sort(input: string, keyTransform?: SafeTransform, descending?: boolean): string;
  distinct(input: string, keyTransform?: SafeTransform): string;
  flatten(input: string, depth?: number): string;
  slice(input: string, start?: number, end?: number): string;

  output(nodeId: string): string;

  toProgram(): IOCProgram;
  toIOC(): string;
  validate(): { valid: boolean; errors: string[] };
  compile(): Function;
}
```

### File Operations

```typescript
// Save/load .ioc files
async function saveIOCFile(program: IOCProgram, path: string): Promise<void>;
async function loadIOCFile(path: string): Promise<IOCProgram>;

// Serialize/deserialize
function serializeIOC(program: IOCProgram): string;
function deserializeIOC(json: string): IOCProgram;

// Validation
function validateIOCProgram(program: IOCProgram): { valid: boolean; errors: string[] };
```

## Examples

See `src/examples/safe-ioc.ts` for comprehensive examples:

```bash
npx tsx src/examples/safe-ioc.ts
```

## Legacy API

The original Graph API (with JavaScript functions) is still available:

```typescript
import { Graph, SolverKernel } from '@ioc/compiler';

const graph = new Graph();
const data = graph.input('data');
const filtered = graph.filter(data, (x) => x > 10); // JavaScript function

const kernel = new SolverKernel(graph);
const compiled = kernel.compile();
```

However, this approach:

- ❌ Cannot serialize to `.ioc` files
- ❌ No termination guarantees
- ❌ Requires trust in user code

**We recommend using SafeGraph for new projects.**

## Roadmap

- [x] Safe DSL with guaranteed termination
- [x] .ioc file format
- [x] Empirical verification
- [x] JavaScript compilation
- [ ] WebAssembly backend
- [ ] Automatic parallelization
- [ ] Distributed execution
- [ ] GPU acceleration
- [ ] Visual graph editor
- [ ] Standard library of common patterns

## Philosophy

IOC is based on a simple principle:

**"Most programs don't need Turing completeness. They need safety, predictability, and portability."**

By constraining the language to decidable operations, we gain:

- Guaranteed termination
- Known complexity bounds
- Serializable programs
- Cross-platform optimization
- Safe sandboxing

This isn't "dumbing down" programming—it's **engineering discipline**.

## Contributing

This is a research project exploring constrained intent-oriented computing.

## License

All Rights Reserved - Proprietary License

---

**"Not magic. Better."**

Built with ❤️ for a safer, more predictable computing future.
