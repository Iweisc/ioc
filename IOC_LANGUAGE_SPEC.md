# IOC Language Specification

## Overview

The `.ioc` language is a safe, serializable DSL for expressing data transformations with guaranteed termination.

## Syntax

### Comments

```ioc
# This is a comment
```

### Input Declaration

```ioc
input <name>: <type>
```

Declares an input parameter.

**Examples:**

```ioc
input numbers: number[]
input users: object[]
input text: string
```

### Filter Statement

```ioc
<target> = filter <source> where <predicate>
```

Filters elements based on a predicate.

**Examples:**

```ioc
positive = filter numbers where x > 0
adults = filter users where x.age >= 18
valid = filter items where x.status == "active"
```

### Map Statement

```ioc
<target> = map <source> with <transform>
```

Transforms each element.

**Examples:**

```ioc
doubled = map numbers with x * 2
names = map users with x.name
upper = map strings with uppercase(x)
```

### Reduce Statement

```ioc
<target> = reduce <source> by <operation>
```

Reduces a collection to a single value.

**Examples:**

```ioc
total = reduce numbers by sum
maximum = reduce scores by max
first_item = reduce collection by first
```

### Output Statement

```ioc
output <variable>
```

Marks a variable as the program output.

**Example:**

```ioc
output result
```

## Predicates

Used in `where` clauses for filtering.

### Comparison Operators

- `x > value` - Greater than
- `x < value` - Less than
- `x >= value` - Greater than or equal
- `x <= value` - Less than or equal
- `x == value` - Equal to
- `x != value` - Not equal to

**Examples:**

```ioc
filter numbers where x > 10
filter scores where x >= 50
filter names where x == "admin"
```

### Property Access

```ioc
x.property <operator> value
```

**Examples:**

```ioc
filter users where x.age >= 18
filter products where x.price < 100
filter items where x.status == "active"
```

### Logical Operators

- `<pred1> and <pred2>` - Logical AND
- `<pred1> or <pred2>` - Logical OR
- `not <pred>` - Logical NOT

**Examples:**

```ioc
filter numbers where x > 0 and x < 100
filter users where x.role == "admin" or x.role == "moderator"
filter items where not x.deleted
```

## Transforms

Used in `with` clauses for mapping.

### Arithmetic Operations

- `x * value` - Multiplication
- `x + value` - Addition
- `x - value` - Subtraction
- `x / value` - Division
- `x % value` - Modulo

**Examples:**

```ioc
map numbers with x * 2
map prices with x + 10
map scores with x / 100
```

### Property Access

```ioc
x.property
```

**Examples:**

```ioc
map users with x.name
map products with x.price
map items with x.id
```

### String Operations

- `uppercase(x)` - Convert to uppercase
- `lowercase(x)` - Convert to lowercase
- `trim(x)` - Remove whitespace

**Examples:**

```ioc
map names with uppercase(x)
map emails with lowercase(x)
map inputs with trim(x)
```

## Reduction Operations

Used in `by` clauses for reducing.

### Numeric Reductions

- `sum` - Sum all elements (returns 0 for empty arrays)
- `product` - Multiply all elements (returns 1 for empty arrays)
- `average` - Calculate average (throws error on empty arrays)
- `max` - Find maximum (throws error on empty arrays)
- `min` - Find minimum (throws error on empty arrays)

**Examples:**

```ioc
reduce numbers by sum
reduce scores by average
reduce prices by max
```

**Empty Array Behavior:**

Most reduction operations handle empty arrays gracefully:

- `sum` returns `0` for empty arrays
- `product` returns `1` for empty arrays
- `count` returns `0` for empty arrays

However, some operations throw errors on empty arrays to prevent undefined behavior:

- `min`, `max`, `average` - throw clear error messages
- `first`, `last` - throw clear error messages

When using these operations, ensure your pipeline validates that arrays are non-empty before reduction, or handle the error appropriately.

```ioc
# Example: Using count to check before max
filtered = filter items where x.score > 50
scores = map filtered with x.score
# If filtered is empty, max will throw an error
max_score = reduce scores by max
```

### Collection Reductions

- `count` - Count elements (returns 0 for empty arrays)
- `first` - Get first element (throws error on empty arrays)
- `last` - Get last element (throws error on empty arrays)
- `join` - Join into string (returns empty string for empty arrays)

**Examples:**

```ioc
reduce items by count
reduce queue by first
reduce names by join
```

## Type Annotations

Optional type hints for input declarations:

- `number` - Number type
- `string` - String type
- `boolean` - Boolean type
- `object` - Object type
- `number[]` - Array of numbers
- `string[]` - Array of strings
- `object[]` - Array of objects

**Examples:**

```ioc
input count: number
input name: string
input users: object[]
```

## Complete Example

```ioc
# Data processing pipeline
# Filters positive numbers, doubles them, and calculates sum

input data: number[]

# Step 1: Filter positive numbers only
positive = filter data where x > 0

# Step 2: Double each number
doubled = map positive with x * 2

# Step 3: Calculate total
total = reduce doubled by sum

# Output the result
output total
```

## Running Programs

### CLI Usage

```bash
# Run with input
ioc run program.ioc --input '[1, -2, 3, 4, -5]'

# Validate program
ioc validate program.ioc

# Compile to JavaScript
ioc compile program.ioc --output program.js
```

### Programmatic Usage

```typescript
import { Lexer, Parser, ASTToGraphConverter } from '@ioc/compiler';
import * as fs from 'fs';

// Load and parse .ioc file
const source = fs.readFileSync('program.ioc', 'utf-8');
const lexer = new Lexer(source);
const tokens = lexer.tokenize();

const parser = new Parser(tokens);
const ast = parser.parse();

// Convert to executable graph
const converter = new ASTToGraphConverter();
const graph = converter.convert(ast);

// Compile and execute
const compiled = graph.compile();
const result = compiled([1, -2, 3, 4, -5]); // 16
```

## Safety Guarantees

All `.ioc` programs have:

1. **Guaranteed Termination** - No infinite loops possible
2. **Known Complexity** - Every operation has O(n) bounds
3. **Memory Safety** - No unbounded memory allocation
4. **Type Safety** - Compile-time type checking
5. **Serializable** - Can be saved/loaded as JSON

## Limitations

The following are **not** supported (by design):

- Arbitrary JavaScript functions
- Loops or recursion
- Side effects or I/O
- Dynamic code generation
- Unbounded operations

These restrictions enable the safety guarantees while maintaining expressiveness for common data transformation tasks.
