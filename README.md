# Intent-Oriented Computing (IOC)

> **⚠️ ALPHA SOFTWARE**: Experimental research project. For viewing and evaluation only.

An experimental programming framework where programs are defined by **intent graphs** rather than imperative code. IOC separates what you want (intent) from how it's computed (execution strategy), enabling automatic optimization and hardware-agnostic code.

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
├── core/               # Core language implementation
│   ├── graph.py           # Intent graph & operations
│   ├── optimizer.py       # Graph optimization passes
│   ├── debugger.py        # Debugging utilities
│   ├── differential.py    # Correctness testing
│   └── provenance.py      # Source tracking
├── solvers/            # Compiler & code generation
│   ├── kernel.py          # Solver kernel (compiler)
│   └── strategies.py      # Execution strategies
├── examples/           # Example programs
│   ├── pure_ioc_*.py      # Programs written IN IOC
│   └── example*.py        # Feature demonstrations
├── ioc_cli.py          # Command-line tool
└── docs/               # Extended documentation
```

## Quick Start

### Installation
```bash
# This is proprietary software - viewing only
cd ioc

# No dependencies - pure Python!
```

### Hello World

```python
from core.graph import Graph

g = Graph()
numbers = g.input("numbers", list)
doubled = g.map(numbers, lambda x: x * 2)
g.output(doubled)

fn = g.compile()
print(fn(numbers=[1, 2, 3]))  # [2, 4, 6]
```

See [QUICKSTART.md](QUICKSTART.md) for more examples.

### Run Examples

```bash
# Pure IOC programs (100% declarative)
python3 examples/pure_ioc_simple.py
python3 examples/pure_ioc_program.py

# Advanced features
python3 examples/example5_debugging.py

# CLI tool
python3 ioc_cli.py analyze data/sales.csv --filter "price > 100"
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

### DONE: Completed (v0.3.0-alpha)
- **Core Language**: Intent graph with 10 operation types
- **Compiler**: Multi-strategy solver kernel
- **Optimization**: Dead code elimination, operation fusion
- **Debugging**: Provenance tracking, differential testing, execution tracing
- **Tools**: CLI for data analysis, benchmarking, visualization
- **Testing**: 41 tests, 100% passing
- **Documentation**: User guide, API reference, examples

### FUTURE: Next Steps
- **Phase 3**: LLVM/MLIR backend for native compilation
- **Advanced**: GPU strategies, distributed execution
- **Tooling**: Visual graph editor, profiler integration
- **Research**: Program synthesis, automatic parallelization

See [docs/ROADMAP.md](docs/ROADMAP.md) for details.

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

- **[QUICKSTART.md](QUICKSTART.md)**: Get started in 5 minutes
- **[USER_GUIDE.md](USER_GUIDE.md)**: Complete feature documentation
- **[docs/](docs/)**: Architecture, design, and extended docs
- **[examples/](examples/)**: Working programs and demonstrations

## Philosophy

Programming should be about **expressing intent**, not **micromanaging execution**. IOC separates the "what" from the "how", letting humans focus on problem-solving while machines handle optimization.

This is not just a new framework—it's a new way of thinking about computation.

## License

Proprietary - All rights reserved. See LICENSE file for details.

For viewing and evaluation purposes only. No copying, modification, or commercial use permitted without explicit written permission.

---

**Version**: v0.3.0-alpha  
**Status**: Experimental research prototype  
**License**: Proprietary
