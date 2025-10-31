# IOC - Intent-Oriented Computing

A compiled language for safe data processing with guaranteed termination and known complexity bounds.

## What is IOC?

IOC is a standalone compiled language designed for data transformation pipelines. Programs are written in `.ioc` files and compiled to JavaScript or WebAssembly executables. The language guarantees termination, enforces resource bounds, and prevents arbitrary code execution.

This is not a JavaScript framework or library. IOC has its own syntax, parser, and compiler toolchain, similar to how Rust or Go work. You write source files in the IOC language and compile them to executable code.

## Quick Start

Create a file called `pipeline.ioc`:

```ioc
input numbers: number[]

positive = filter numbers where x > 0
doubled = map positive with x * 2
total = reduce doubled by sum

output total
```

Install the compiler:

```bash
npm install -g @ioc/compiler
```

Compile and run:

```bash
ioc run pipeline.ioc --input '[5, -3, 12, -8, 20]'
# Output: 74
```

## Language Syntax

### Input Declaration

Every program starts with an input declaration:

```ioc
input data: number[]
input users: object[]
input text: string
```

### Filter Operation

Select elements that match a condition:

```ioc
adults = filter users where x.age >= 18
evens = filter numbers where x % 2 == 0
active = filter accounts where x.status == "active"
```

### Map Operation

Transform each element:

```ioc
doubled = map numbers with x * 2
names = map users with x.name
upper = map words with uppercase(x)
```

### Reduce Operation

Aggregate values to a single result:

```ioc
total = reduce numbers by sum
maximum = reduce numbers by max
average = reduce numbers by average
```

Available reduction operations: `sum`, `product`, `average`, `max`, `min`, `count`, `first`, `last`

### Output Declaration

Every program ends with an output:

```ioc
output result
```

### Operators and Functions

**Comparison**: `>`, `<`, `>=`, `<=`, `==`, `!=`

**Arithmetic**: `+`, `-`, `*`, `/`, `%`

**String functions**: `uppercase(x)`, `lowercase(x)`, `trim(x)`, `length(x)`

**Logical**: `and`, `or`, `not`

### Complete Example

```ioc
input orders: object[]

# Filter orders from last month
recent = filter orders where x.timestamp > 1640000000

# Extract order totals
totals = map recent with x.amount

# Calculate average
avg = reduce totals by average

output avg
```

## CLI Usage

### Run Command

Execute a program with input data:

```bash
# Inline JSON input
ioc run program.ioc --input '[1,2,3,4,5]'

# Input from file
ioc run program.ioc --input-file data.json

# Choose backend
ioc run program.ioc --input '[1,2,3]' --backend javascript
ioc run program.ioc --input '[1,2,3]' --backend wasm

# Enable debug output
ioc run program.ioc --input '[1,2,3]' --debug
```

### Compile Command

Compile to an executable:

```bash
# Compile to JavaScript
ioc compile program.ioc --output program.js --backend javascript

# Compile to WebAssembly
ioc compile program.ioc --output program.wasm --backend wasm

# Print to stdout
ioc compile program.ioc
```

### Validate Command

Check syntax and safety properties:

```bash
ioc validate program.ioc
ioc validate examples/*.ioc
```

### Backends Command

List available compilation backends:

```bash
ioc backends
```

## Compilation Backends

IOC programs can be compiled to multiple target formats:

**JavaScript** - The default backend. Fast compilation, runs anywhere Node.js runs. Good for development and most production use cases.

**WebAssembly** - Compiles to portable WebAssembly binary format. Better performance than JavaScript for compute-intensive operations. Works in browsers and Node.js.

**LLVM** - Planned. Will compile to native machine code through LLVM for maximum performance.

## Programmatic Usage

You can use the IOC compiler as a library in TypeScript or JavaScript projects:

```typescript
import { Lexer, Parser, ASTToGraphConverter, JavaScriptBackend } from '@ioc/compiler';

const source = `
  input numbers: number[]
  doubled = map numbers with x * 2
  output doubled
`;

// Parse source code
const lexer = new Lexer(source);
const parser = new Parser(lexer.tokenize());
const ast = parser.parse();

// Convert to internal representation
const converter = new ASTToGraphConverter();
const program = converter.convert(ast);

// Compile to JavaScript
const backend = new JavaScriptBackend();
const result = await backend.compile(program);

// Execute
const output = result.execute([1, 2, 3]);
console.log(output); // [2, 4, 6]
```

## Compiler Architecture

Programs flow through the following pipeline:

```
Source Code (.ioc file)
    ↓
Lexer (tokenization)
    ↓
Parser (syntax analysis)
    ↓
AST (abstract syntax tree)
    ↓
IOCProgram (intermediate representation)
    ↓
Backend (code generation)
    ↓
Executable (JavaScript / WASM / LLVM)
```

Each stage validates the program and can reject invalid code before it ever executes.

## Language Properties

### Guaranteed Termination

All IOC programs terminate in bounded time. The language does not support loops, recursion, or any construct that could run indefinitely. Every operation has a known maximum execution time based on input size.

### Known Complexity

Every operation declares its computational complexity:

- `filter`: O(n)
- `map`: O(n)
- `reduce`: O(n)
- `sort`: O(n log n)
- `distinct`: O(n)

This allows you to analyze program performance before execution.

### Safe by Design

IOC programs cannot:

- Access the filesystem
- Make network requests
- Execute arbitrary code
- Create infinite loops
- Cause stack overflows
- Allocate unbounded memory

This makes IOC suitable for executing untrusted user-provided code safely.

### Serializable

IOC programs are represented internally as JSON-serializable data structures. This means you can:

- Store programs in databases
- Send programs over the network
- Version control programs as data
- Generate programs programmatically
- Cache compiled programs

## Use Cases

IOC is designed for scenarios where you need to safely execute untrusted or user-provided data transformations:

**User-defined analytics** - Let users write custom metrics and reports without security risks.

**Serverless functions** - Run user code with guaranteed termination and resource bounds.

**Data processing APIs** - Accept transformation logic as data instead of exposing direct database access.

**Educational platforms** - Provide safe code execution environments for students.

**Low-code platforms** - Visual pipeline builders can compile to IOC for execution.

**CI/CD systems** - Serializable build and test transformations.

## Examples

The `examples/` directory contains sample programs:

- `pipeline.ioc` - Basic filter, map, reduce operations
- `grade-calculator.ioc` - Grade processing and statistics
- `expense-tracker.ioc` - Personal finance calculations
- `sales-report.ioc` - Business data analysis
- `user-engagement.ioc` - User activity metrics
- `fraud-detection-pipeline.ioc` - Transaction filtering
- `recommendation-engine.ioc` - Recommendation scoring
- `log-analyzer.ioc` - Log file processing
- `analytics.ioc` - Web analytics calculations

Run any example:

```bash
ioc run examples/grade-calculator.ioc --input-file test-grades.json
```

## Development

### Prerequisites

- Node.js 18 or higher
- npm or yarn

### Build from Source

```bash
git clone https://github.com/Iweisc/ioc.git
cd ioc
npm install
npm run build
```

### Run Tests

```bash
npm test
```

### Type Checking

```bash
npm run typecheck
```

### Linting

```bash
npm run lint
```

### Format Code

```bash
npm run format
```

## Project Structure

```
src/
  parser/           # Lexer, parser, AST definitions
  dsl/              # IOC language core types and compiler
  backends/         # Code generation (JS, WASM, LLVM)
  core/             # Graph operations, optimizer, verifier
  solvers/          # Execution strategies and profiling
  cli/              # Command-line interface
  tests/            # Test suite

examples/           # Sample .ioc programs
```

## Current Status

**Stable**: JavaScript and WebAssembly backends are fully functional and tested across Node.js 18, 20, and 22 on Linux, macOS, and Windows.

**In Development**: LLVM backend is planned but not yet implemented.

**Test Coverage**: 256 tests covering parser, compiler, backends, and type system.

## Contributing

Contributions are welcome. Please read CONTRIBUTING.md for guidelines.

When submitting pull requests:

- Add tests for new features
- Update documentation as needed
- Follow existing code style
- Ensure all tests pass

## License

MIT License. See LICENSE file for details.
