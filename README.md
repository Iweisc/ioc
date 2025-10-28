# Intent-Oriented Computing (IOC)

A revolutionary programming paradigm where programs are defined by **intent graphs** rather than imperative code. IOC eliminates syntax and manual optimization, replacing them with semantically constrained computation graphs interpreted by an adaptive solver kernel.

## The Big Idea

**Stop writing HOW. Start writing WHAT.**

Traditional programming forces you to specify every step:
```python
# Traditional: You specify HOW
result = []
for i in range(len(arr)):
    if arr[i] > 10:
        result.append(arr[i] * 2)
```

IOC lets you express WHAT you want:
```python
# IOC: You specify WHAT
g = Graph()
data = g.input("arr", list)
filtered = g.filter(data, lambda x: x > 10)
result = g.map(filtered, lambda x: x * 2)

fn = g.compile(optimize_for="speed")  # Automatic optimization!
```

The system automatically:
- Chooses the best execution strategy
- Optimizes for your target (speed/memory)
- Adapts to different hardware
- Can be upgraded with new optimizations without code changes

## Core Concepts

### Intent Graphs
Programs are **directed acyclic graphs (DAGs)** where each node represents a semantic goal:
- `filter`: Keep elements matching a condition
- `map`: Transform each element
- `reduce`: Combine elements into a single value
- `sort`: Order elements
- `group_by`: Group elements by key
- `join`: Combine two sequences
- `flatten`: Flatten nested lists
- `distinct`: Remove duplicates

### Solver Kernel
An intelligent compiler that:
1. Analyzes your intent graph
2. Selects optimal execution strategies
3. Generates and compiles code
4. Returns an executable function

### Multi-Strategy Execution
Each intent can be implemented multiple ways:
- **Naive**: Simple loops (readable, debuggable)
- **Optimized**: Built-ins and comprehensions (2x faster)
- **Future**: SIMD, GPU, distributed execution

## Project Structure

```
ioc/
├── core/
│   ├── graph.py        # Intent Graph implementation
│   └── types.py        # Type system with constraints
├── solvers/
│   ├── kernel.py       # Solver Kernel (compiler)
│   └── strategies.py   # Execution strategies
├── examples/
│   ├── example1_basic.py          # Filter & map basics
│   ├── example2_complex.py        # Data pipeline
│   └── example3_serialization.py  # Graph persistence
├── demo.py            # Interactive demonstration
└── ARCHITECTURE.md    # Detailed design docs
```

## Quick Start

### Installation
```bash
# Clone or download the project
cd ioc

# No dependencies needed - pure Python!
```

### Run Examples

```bash
# Basic example - filter and map
python3 examples/example1_basic.py

# Complex pipeline - multi-step data processing
python3 examples/example2_complex.py

# Serialization - save/load graphs
python3 examples/example3_serialization.py

# Interactive demo - see it all in action
python3 demo.py
```

### Your First IOC Program

```python
import sys
sys.path.insert(0, '.')  # If running from project root

from core.graph import Graph

# Create graph
g = Graph()

# Define computation
numbers = g.input("numbers", list)
evens = g.filter(numbers, lambda x: x % 2 == 0)
squared = g.map(evens, lambda x: x ** 2)
g.output(squared)

# Compile
fn = g.compile(optimize_for="speed")

# Execute
result = fn(numbers=[1, 2, 3, 4, 5, 6])
print(result)  # [4, 16, 36]

# Inspect generated code
print(fn._ioc_code)
```

## Key Features

### 1. Declarative
Express **goals**, not **algorithms**. The solver figures out the best way to achieve them.

### 2. Self-Optimizing
The same intent graph can be compiled with different optimization targets:
```python
fast_fn = g.compile(optimize_for="speed")
small_fn = g.compile(optimize_for="memory")
```

### 3. Portable
Intent graphs are data structures, not code:
- Store as JSON (.iog files)
- Version control friendly
- Language agnostic
- Can be manipulated by tools or AI

### 4. Future-Proof
Add new optimizations without changing user code:
- GPU support → Add GPU strategy
- SIMD vectorization → Automatic for compatible intents
- Distributed execution → Graph already knows what's parallelizable

### 5. Introspectable
See exactly what's happening:
```python
print(g.visualize())        # See graph structure
print(fn._ioc_code)         # See generated code
print(g.get_execution_order())  # See execution plan
```

## Example: Real-World Pipeline

```python
# E-commerce: Process bulk orders with discount
g = Graph()
orders = g.input("orders", list)

# Intent: filter high-value orders
bulk = g.filter(orders, lambda x: x > 50)

# Intent: apply discount
discounted = g.map(bulk, lambda x: x * 0.85)

# Intent: calculate total
total = g.reduce(discounted, lambda a, b: a + b, 0.0)

g.output(total)

# Compile and run
pipeline = g.compile(optimize_for="speed")
revenue = pipeline(orders=[25, 120, 45, 200, 35, 150])
print(f"Revenue: ${revenue:.2f}")
```

## Implementation Status

### Completed (v0.2.0 - Phase 2)
- ✓ Intent Graph data structure
- ✓ 10 intent types (filter, map, reduce, sort, group_by, join, flatten, distinct, etc.)
- ✓ Solver Kernel with strategy selection
- ✓ Two execution strategies (naive, optimized)
- ✓ Graph optimization passes (dead code elimination, fusion)
- ✓ Automatic graph optimization during compilation
- ✓ Performance profiler (foundation)
- ✓ Type system with constraints
- ✓ Graph serialization (.iog format)
- ✓ Comprehensive test suite (31 tests, 100% pass)
- ✓ Example programs and documentation

### Next Steps (Phase 3)
- [ ] LLVM/MLIR backend for native code
- [ ] Integrate profiler with strategy selection
- [ ] Multi-language views (Python ↔ C++ ↔ Rust)
- [ ] GPU strategy for parallel workloads
- [ ] Visual graph editor
- [ ] Legacy code "lifting" (imperative → intent)

## Why IOC Matters

### For Developers
- Write less boilerplate
- Focus on problem domain
- Automatic optimization
- Easier debugging (intent + generated code)

### For Performance
- Compiler chooses optimal strategies
- Hardware-specific optimizations transparent
- Can improve without code changes

### For AI/ML
- Graphs are machine-readable
- Can be learned and optimized by AI
- Program synthesis from examples
- Automatic parallelization

## Learn More

- **ARCHITECTURE.md**: Deep dive into design and implementation
- **examples/**: Working code demonstrating all features
- **demo.py**: Interactive walkthrough of IOC capabilities

## Philosophy

Programming should be about **expressing intent**, not **micromanaging execution**. IOC separates the "what" from the "how", letting humans focus on problem-solving while machines handle optimization.

This is not just a new framework—it's a new way of thinking about computation.

## License

MIT License - feel free to experiment and build upon this prototype!

---

**Status**: Prototype v0.1.0 - Proof of concept demonstrating core ideas

**Next**: Extend with more intents, better optimization, native compilation
