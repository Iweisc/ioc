# IOC Quick Reference

## Basic Usage

### 1. Create a Graph
```python
from core.graph import Graph

g = Graph()
```

### 2. Define Inputs
```python
# Untyped input
data = g.input("data", list)

# Typed inputs
numbers = g.input("numbers", int)
prices = g.input("prices", float)
```

### 3. Core Intent Operations

#### Filter
Keep elements matching a predicate
```python
positive = g.filter(numbers, lambda x: x > 0)
adults = g.filter(ages, lambda age: age >= 18)
```

#### Map
Transform each element
```python
doubled = g.map(numbers, lambda x: x * 2)
squared = g.map(values, lambda v: v ** 2)
```

#### Reduce
Combine elements into a single value
```python
# With initial value
total = g.reduce(numbers, lambda a, b: a + b, 0)

# Without initial (uses first element)
product = g.reduce(numbers, lambda a, b: a * b)
```

### 4. Mark Outputs
```python
g.output(result)  # Single output

# Multiple outputs (future)
g.output(result1)
g.output(result2)
```

### 5. Compile and Execute
```python
# Compile with optimization mode
fn = g.compile(optimize_for="speed")  # or "memory" or "balanced"

# Execute
result = fn(data=[1, 2, 3, 4, 5])
print(result)
```

## Advanced Features

### Inspect Generated Code
```python
fn = g.compile(optimize_for="speed")
print(fn._ioc_code)  # See generated Python code
```

### Visualize Graph
```python
print(g.visualize())  # ASCII visualization
```

### Get Execution Order
```python
order = g.get_execution_order()
print(order)  # List of node IDs in execution order
```

### Graph Introspection
```python
# All nodes
for node_id, node in g.nodes.items():
    print(node.intent_type, node.params)

# Output nodes
print(g.outputs)
```

## Type System

### Basic Types
```python
from core.types import IntType, FloatType, BoolType, ListType

# Integer with constraints
age_type = IntType(min_value=0, max_value=120)

# Float with range
price_type = FloatType(min_value=0.0)

# List of specific type
numbers_type = ListType(IntType())

# List with length constraints
batch_type = ListType(AnyType(), min_length=1, max_length=100)
```

### Type Inference
```python
from core.types import infer_type

# Automatically infer from values
t = infer_type([1, 2, 3])  # Returns ListType(IntType())
```

## Common Patterns

### Pipeline Pattern
Chain multiple operations
```python
g = Graph()
data = g.input("data", list)
step1 = g.filter(data, predicate1)
step2 = g.map(step1, transform)
step3 = g.filter(step2, predicate2)
result = g.reduce(step3, combiner, init)
g.output(result)
```

### Multiple Independent Operations
Process different aspects of same data
```python
g = Graph()
data = g.input("data", list)

# Branch 1
positive = g.filter(data, lambda x: x > 0)
pos_sum = g.reduce(positive, lambda a, b: a + b, 0)

# Branch 2
negative = g.filter(data, lambda x: x < 0)
neg_sum = g.reduce(negative, lambda a, b: a + b, 0)

g.output(pos_sum)
g.output(neg_sum)
```

### Constants
Use constant values in graph
```python
g = Graph()
data = g.input("data", list)

# Constant factor
factor = g.constant(2.5)

# Note: Currently need to use lambda with closure
scaled = g.map(data, lambda x: x * 2.5)
```

## Optimization Modes

### Speed
Maximize execution speed
```python
fn = g.compile(optimize_for="speed")
```
- Uses Python built-ins (filter, map, functools.reduce)
- List comprehensions
- Optimized for throughput
- Best for: Large datasets, production workloads

### Memory
Minimize memory usage
```python
fn = g.compile(optimize_for="memory")
```
- Uses simple loops
- Minimal intermediate allocations
- Best for: Memory-constrained environments, small datasets

### Balanced
Balance speed and memory
```python
fn = g.compile(optimize_for="balanced")
```
- Default mode
- Reasonable compromise
- Best for: General-purpose use

## Serialization

### Save Graph
```python
import json

def serialize_graph(graph):
    serialized = {
        "version": "0.1.0",
        "nodes": {},
        "outputs": graph.outputs
    }
    for node_id, node in graph.nodes.items():
        # ... serialize node data
    return serialized

# Save to file
with open("program.iog", "w") as f:
    json.dump(serialize_graph(g), f, indent=2)
```

### Graph Metadata
```python
# Check node metadata
for node in g.nodes.values():
    if node.metadata.get("parallelizable"):
        print(f"{node.id} can be parallelized")
```

## Debugging Tips

### 1. Visualize First
```python
print(g.visualize())  # Understand graph structure
```

### 2. Check Generated Code
```python
fn = g.compile()
print(fn._ioc_code)  # See what's being executed
```

### 3. Test with Small Data
```python
# Test with small input first
result = fn(data=[1, 2, 3])
print(result)
```

### 4. Compare Strategies
```python
# Compare different optimization modes
speed_fn = g.compile(optimize_for="speed")
memory_fn = g.compile(optimize_for="memory")

print("Speed version:")
print(speed_fn._ioc_code)

print("\nMemory version:")
print(memory_fn._ioc_code)
```

## Complete Example

```python
import sys
sys.path.insert(0, '.')

from core.graph import Graph

# Problem: Find sum of squares of even numbers
g = Graph()

# Define computation
numbers = g.input("numbers", list)
evens = g.filter(numbers, lambda x: x % 2 == 0)
squares = g.map(evens, lambda x: x * x)
total = g.reduce(squares, lambda a, b: a + b, 0)
g.output(total)

# Visualize
print("Graph:")
print(g.visualize())

# Compile
fn = g.compile(optimize_for="speed")

# Show generated code
print("\nGenerated code:")
print(fn._ioc_code)

# Execute
result = fn(numbers=[1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
print(f"\nResult: {result}")  # 220 (4 + 16 + 36 + 64 + 100)

# Verify
expected = sum(x*x for x in [1,2,3,4,5,6,7,8,9,10] if x % 2 == 0)
print(f"Expected: {expected}")
print(f"Match: {result == expected}")
```

## Common Errors

### Import Error
```
ERROR: Import "core.graph" could not be resolved
```
**Fix**: Add project root to Python path:
```python
import sys
sys.path.insert(0, '/path/to/ioc')
```

### Node Not Found
```
ValueError: Node xyz not found in graph
```
**Fix**: Use node IDs returned from graph operations:
```python
# Correct
data = g.input("data", list)
result = g.filter(data, lambda x: x > 0)  # Use 'data' variable

# Wrong
result = g.filter("data", lambda x: x > 0)  # Don't use string
```

### No Outputs Defined
Graph compiles but returns None
**Fix**: Mark output nodes:
```python
g.output(result)  # Don't forget this!
```

## Next Steps

1. Run `python3 demo.py` for interactive tour
2. Study `examples/` directory for patterns
3. Read `ARCHITECTURE.md` for internals
4. Check `ROADMAP.md` for future features

## Need Help?

- Check examples in `examples/` directory
- Read detailed docs in `ARCHITECTURE.md`
- Look at generated code for debugging
- Visualize your graph to understand structure
