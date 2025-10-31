# IOC - Intent-Oriented Computing

A **compiled language** for safe data processing with guaranteed termination and known complexity bounds.

## Overview

IOC is a pure compiled language (like C, Rust, or Go) for data transformation pipelines. Write `.ioc` files and compile them to JavaScript or WebAssembly using the IOC compiler.

**Key Philosophy**: IOC is NOT a framework or library embedded in TypeScript. It is a standalone language with its own syntax, parser, and compiler toolchain.

## Quick Example

Create a file `pipeline.ioc`:

```ioc
input numbers: number[]

filtered = filter numbers where x > 10
doubled = map filtered with x * 2
total = reduce doubled by sum

output total
```

Compile and run:

```bash
# Run directly (compiles internally)
ioc run pipeline.ioc --input '[5, 12, 8, 20]'
# Output: 64

# Or compile to JavaScript first
ioc compile pipeline.ioc --output pipeline.js --backend javascript

# Or compile to WebAssembly
ioc compile pipeline.ioc --backend wasm
```

## Installation

Install the IOC compiler:

```bash
npm install -g @ioc/compiler
```

Or use it as a dev dependency:

```bash
npm install --save-dev @ioc/compiler
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

## Compiler Architecture

IOC programs go through the following pipeline:

```
.ioc source → Lexer → Parser → AST → IOCProgram (IR) → Backend → Executable
                                                          ↓
                                               JavaScript / WASM / LLVM
```

### Available Backends

- **JavaScript** (default): Fast compilation, runs anywhere
- **WebAssembly**: Portable binaries, excellent performance
- **LLVM** (planned): Maximum performance via native code

### Programmatic Compilation

You can use the IOC compiler programmatically in TypeScript/JavaScript:

```typescript
import { Lexer, Parser, ASTToGraphConverter, JavaScriptBackend } from '@ioc/compiler';

// Parse .ioc source
const source = `
  input numbers: number[]
  doubled = map numbers with x * 2
  output doubled
`;

const lexer = new Lexer(source);
const parser = new Parser(lexer.tokenize());
const ast = parser.parse();

// Convert to IOCProgram (internal representation)
const converter = new ASTToGraphConverter();
const program = converter.convert(ast);

// Compile to executable
const backend = new JavaScriptBackend();
const result = await backend.compile(program);
const execute = result.execute;

// Run
const output = execute([1, 2, 3]); // [2, 4, 6]
```

## Features

### Language Properties

**Guaranteed Termination** - All programs terminate in bounded time. No infinite loops possible.

**Known Complexity** - Every operation declares its time complexity statically:

- Filter: O(n)
- Map: O(n)
- Reduce: O(n)
- Sort: O(n log n)
- Distinct: O(n)

**Serializable** - Programs are pure data (JSON internally). Can be:

- Saved to disk
- Sent over network
- Stored in databases
- Version controlled

**Safe by Design** - No arbitrary code execution. Only safe, pre-defined operations.

**Multiple Backends** - Compile to JavaScript, WebAssembly, or (planned) LLVM native code.

### Compilation Guarantees

- **Security Validation** - Built-in verification of all operations
- **Budget Enforcement** - Resource limits enforced at compile time
- **Type Checking** - Static type inference and validation
- **Memory Safety** - All operations have bounded memory usage

## Use Cases

IOC is ideal for scenarios requiring **safe execution of untrusted code**:

- **User-provided analytics** - Let users write custom data pipelines safely
- **Serverless functions** - Guaranteed termination and resource bounds
- **Data processing APIs** - Accept pipeline definitions as data
- **Educational platforms** - Safe code execution environments
- **CI/CD pipelines** - Serializable build/test transformations
- **Low-code platforms** - Visual pipeline builders that compile to IOC

## CLI Commands

The IOC compiler provides a full-featured CLI:

### Run Programs

```bash
# Run with inline input
ioc run pipeline.ioc --input '[1,2,3,4,5]'

# Run with debug output
ioc run pipeline.ioc --input '[1,2,3]' --debug

# Choose backend explicitly
ioc run pipeline.ioc --input '[1,2,3]' --backend javascript
ioc run pipeline.ioc --input '[1,2,3]' --backend wasm

# Skip security validation (use only with trusted code)
ioc run untrusted.ioc --input '[1,2,3]' --unsafe
```

### Compile Programs

```bash
# Compile to JavaScript module
ioc compile pipeline.ioc --output pipeline.js

# Compile with specific backend
ioc compile pipeline.ioc --backend wasm --output pipeline.wasm

# Print generated code to stdout
ioc compile pipeline.ioc
```

### Validate Programs

```bash
# Check syntax and safety properties
ioc validate pipeline.ioc
```

### List Backends

```bash
# Show available compilation backends
ioc backends
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
