# IOC Architecture

## Overview

Intent-Oriented Computing (IOC) is a revolutionary programming paradigm where programs are defined as **Intent Graphs** rather than imperative code. The system automatically translates these semantic intents into optimized executable code.

## Core Components

### 1. Intent Graph (`core/graph.py`)

The fundamental data structure representing a program.

**Key Concepts:**
- **IntentNode**: A semantic goal (filter, map, reduce, etc.)
- **DAG Structure**: Nodes are connected in a directed acyclic graph
- **Type System**: Each node has input/output type constraints
- **Metadata**: Hints for optimization (parallelizable, vectorizable, etc.)

**Example:**
```python
g = Graph()
data = g.input("numbers", list)
filtered = g.filter(data, lambda x: x > 0)
result = g.map(filtered, lambda x: x * 2)
g.output(result)
```

### 2. Type System (`core/types.py`)

A lightweight type system enabling static analysis and optimization.

**Types:**
- `IntType`, `FloatType`, `BoolType`: Primitive types with optional constraints
- `ListType`: Collections with element type constraints
- `AnyType`: Unconstrained type (fallback)

**Features:**
- Type inference from values
- Constraint validation (min/max values, length bounds)
- Future: Refinement types (sorted, non-negative, etc.)

### 3. Solver Kernel (`solvers/kernel.py`)

The "compiler" that translates intent graphs into executable code.

**Process:**
1. **Analysis**: Examine graph structure and constraints
2. **Strategy Selection**: Choose best implementation for each node
3. **Code Generation**: Produce Python code
4. **Compilation**: Execute and return callable function

**Optimization Modes:**
- `speed`: Minimize execution time (use built-ins, comprehensions)
- `memory`: Minimize memory usage (simple loops)
- `balanced`: Balance between speed and memory

### 4. Strategy System (`solvers/strategies.py`)

Multiple implementations for each intent type.

**Current Strategies:**

**NaiveStrategy:**
- Simple, readable Python loops
- Baseline for comparison
- Easy to debug

**OptimizedStrategy:**
- Uses Python built-ins (filter, map, functools.reduce)
- List comprehensions
- ~2x faster than naive

**Future Strategies:**
- **VectorizedStrategy**: NumPy/SIMD for numerical operations
- **GPUStrategy**: CUDA/OpenCL for massively parallel workloads
- **DistributedStrategy**: Dask/Ray for large-scale data

**Cost Model:**
Each strategy estimates execution cost based on:
- Input data size
- Operation complexity
- Hardware characteristics (future)

## Execution Flow

```
User Code → Intent Graph → Solver Kernel → Strategy Selection
    ↓
Generated Python Code → compile() → Executable Function
    ↓
Runtime Execution → Profiling (future) → Strategy Refinement
```

## Design Principles

### 1. Separation of Concerns
- **What** (Intent Graph) is separate from **How** (Strategies)
- New optimizations don't require changing user code
- Hardware-specific optimizations are transparent

### 2. Declarative First
- Users express goals, not algorithms
- Compiler handles implementation details
- Optimization is automatic

### 3. Introspectable
- Graphs are data structures, not opaque code
- Can be analyzed, visualized, transformed
- Debugging shows both intent and generated code

### 4. Extensible
- New intent types: Add node types and strategies
- New backends: Add code generators (C++, LLVM, etc.)
- New optimizations: Add strategies without breaking existing code

## Serialization Format (.iog files)

Intent graphs are stored as JSON:

```json
{
  "version": "0.1.0",
  "nodes": {
    "input_abc123": {
      "intent_type": "input",
      "inputs": [],
      "params": {"name": "data"},
      "output_type": "List[Int]",
      "metadata": {}
    },
    "filter_def456": {
      "intent_type": "filter",
      "inputs": ["input_abc123"],
      "params": {"predicate": "<function>"},
      "output_type": "List[Int]",
      "metadata": {"parallelizable": true}
    }
  },
  "outputs": ["filter_def456"]
}
```

**Benefits:**
- Version control friendly (text-based)
- Language agnostic
- Can be edited by tools or AI
- Portable across platforms

## Future Enhancements

### Phase 2: Advanced Optimization
- **Reinforcement Learning**: Learn optimal strategies from profiling
- **E-graphs**: Equality saturation for optimization space exploration
- **JIT Profiling**: Runtime feedback to improve strategy selection

### Phase 3: Multi-Language Support
- **LLVM Backend**: Generate native code
- **Language Views**: Same graph → Python/C++/Rust/etc.
- **Interop**: Call IOC from any language

### Phase 4: AI Integration
- **Intent Inference**: Convert imperative code → intent graphs
- **Auto-optimization**: AI suggests graph transformations
- **Program Synthesis**: Generate subgraphs from examples

### Phase 5: Distributed & Hardware
- **GPU Compilation**: Automatic GPU utilization
- **Distributed Execution**: Transparent scaling
- **Hardware-aware**: Optimize for specific CPUs/GPUs/TPUs

## Performance Characteristics

**Current Implementation (Python prototype):**
- Overhead: ~1-2ms compilation time per graph
- Optimized strategies: 1.5-2x faster than naive Python
- Memory: Minimal (graphs are lightweight)

**Future (Native compilation):**
- Target: C/LLVM performance with Python ergonomics
- GPU: 10-100x speedup for parallel workloads
- Distributed: Near-linear scaling for embarrassingly parallel tasks

## Comparison with Existing Systems

| System | Paradigm | Optimization | Portability |
|--------|----------|--------------|-------------|
| IOC | Intent Graphs | Automatic | High |
| TensorFlow | Computation Graphs | Manual | Medium |
| LLVM | IR + Passes | Compiler-driven | High |
| SQL | Declarative Queries | Query planner | High |
| Dask | Lazy Dataframes | Task scheduling | Medium |

**IOC Advantages:**
- More general than TensorFlow (not just ML)
- Higher level than LLVM (semantic intents)
- More composable than SQL (arbitrary operations)
- Lighter than Dask (no heavy runtime)

## Conclusion

IOC represents a fundamental shift: programming becomes **problem composition** rather than algorithm specification. The compiler handles optimization, adaptation, and execution—freeing developers to focus on **what** they want to accomplish.
