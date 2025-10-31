# IOC - Intent-Oriented Computing

A framework for building data processing pipelines with guaranteed termination and known complexity bounds.

## Overview

IOC provides a domain-specific language where programs are composed of safe, serializable operations. All operations have bounded complexity and guaranteed termination.

## Quick Example

Traditional JavaScript:

```javascript
const result = data
  .filter((x) => x > 10)
  .map((x) => x * 2)
  .reduce((a, b) => a + b, 0);
```

IOC Language (`.ioc` files):

```ioc
input numbers: number[]

filtered = filter numbers where x > 10
doubled = map filtered with x * 2
total = reduce doubled by sum

output total
```

Run it:

```bash
ioc run pipeline.ioc --input '[5, 12, 8, 20]'
# Result: 64
```

## Installation

```bash
npm install @ioc/compiler
```

## Language Syntax

### Basic Operations

**Filter** - Select elements matching a predicate:

```ioc
filtered = filter data where x > 10
adults = filter users where x.age >= 18
evens = filter numbers where x % 2 == 0
```

**Map** - Transform each element:

```ioc
doubled = map numbers with x * 2
names = map users with x.name
upper = map words with uppercase(x)
```

**Reduce** - Aggregate to single value:

```ioc
total = reduce numbers by sum
maximum = reduce numbers by max
count = reduce items by count
```

### Supported Operators

**Comparisons**: `>`, `<`, `>=`, `<=`, `==`, `!=`

**Arithmetic**: `+`, `-`, `*`, `/`, `%`

**String functions**: `uppercase(x)`, `lowercase(x)`, `trim(x)`

**Reductions**: `sum`, `product`, `average`, `max`, `min`, `count`, `first`, `last`

### Complete Example

```ioc
input users: object[]

adults = filter users where x.age >= 18
names = map adults with x.name
uppercase_names = map names with uppercase(x)

output uppercase_names
```

## TypeScript API

```typescript
import { SafeGraph } from '@ioc/compiler';

const graph = new SafeGraph();
const input = graph.input('data');

const filtered = graph.filter(input, { type: 'compare', op: 'gt', value: 10 });
const doubled = graph.map(filtered, { type: 'arithmetic', op: 'multiply', operand: 2 });
const sum = graph.reduce(doubled, { type: 'sum' });

graph.output(sum);

const compiled = graph.compile();
const result = compiled([5, 12, 8, 20]); // 64
```

### Available Operations

**SafeGraph Methods**:

- `input(name: string, type?: string): string`
- `filter(input: string, predicate: SafePredicate): string`
- `map(input: string, transform: SafeTransform): string`
- `reduce(input: string, operation: ReductionOp): string`
- `sort(input: string, key?: SafeTransform, desc?: boolean): string`
- `distinct(input: string, key?: SafeTransform): string`
- `output(nodeId: string): string`
- `compile(): Function`
- `toJSON(): IOCProgram`

## Features

**Guaranteed Termination** - All operations terminate in bounded time.

**Serializable** - Programs can be saved as JSON `.ioc` files.

**Known Complexity** - Every operation declares its time complexity:

- Filter: O(n)
- Map: O(n)
- Reduce: O(n)
- Sort: O(n log n)
- Distinct: O(n)

**Type Safe** - TypeScript API with full type checking.

## Use Cases

- Safe execution of user-provided data transformations
- Serializable analytics pipelines
- Predictable serverless computations
- Cross-platform data processing

## CLI Commands

```bash
# Run a program
ioc run <file.ioc> --input '<json>'

# Validate syntax
ioc validate <file.ioc>

# Compile to JavaScript
ioc compile <file.ioc> --output <file.js>
```

## Examples

See `examples/` directory for sample programs:

- `pipeline.ioc` - Basic filter/map/reduce
- `analytics.ioc` - Data analysis pipeline
- `user-engagement.ioc` - User data processing

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development setup and guidelines.

## License

MIT License - see [LICENSE](LICENSE) for details.
