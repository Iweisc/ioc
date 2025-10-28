# Debugging Infrastructure

## Overview

This document describes the debugging infrastructure added to IOC to address the "debugging nightmare" concern. The system provides comprehensive tools to understand, verify, and troubleshoot optimized code execution.

## The Problem

When a system automatically optimizes code, debugging becomes challenging because:

1. **Multi-layer execution**: Your code → optimized graph → selected strategy → generated code → actual execution
2. **Non-deterministic behavior**: Different optimizations may be chosen based on data size or hardware
3. **Optimization-introduced bugs**: Transformations might inadvertently change semantics
4. **Generated code errors**: Stack traces point to code you never wrote

## The Solution

IOC's debugging infrastructure provides 5 key features:

### 1. Provenance Tracking

**What it does**: Tracks the origin and transformation history of every node.

**Implementation**: `core/provenance.py`
- Captures source file, line number, and function for each node
- Records all optimizations applied (filter fusion, map fusion, etc.)
- Maintains parent-child relationships between original and optimized nodes

**Usage**:
```python
graph = Graph()
graph.enable_debug_mode(capture_provenance=True)

# ... build graph ...

# Get detailed provenance for any node
debugger = graph.get_debugger()
explanation = debugger.explain_node(node_id)
```

**Example output**:
```
Node: filter_abc123
Type: filter
Created by: optimizer
Transformations:
  1. filter_fusion: Fused two filters into one
Original source location:
  File: my_code.py:42
  Function: process_data
```

### 2. Execution Plan Explanation

**What it does**: Shows what will be executed before running, like SQL's EXPLAIN.

**Implementation**: `Graph.explain()` in `core/graph.py`
- Shows execution order
- Identifies parallelizable operations
- Shows node counts and optimization opportunities
- Can include provenance information (verbose mode)

**Usage**:
```python
graph = Graph()
# ... build pipeline ...

# Show execution plan
print(graph.explain())

# Detailed plan with provenance
print(graph.explain(verbose=True))
```

**Example output**:
```
Execution Plan:
Total nodes: 5
Execution order: 5 steps
Parallelizable operations: 3/5

Execution Steps:
1. input
2. filter [PARALLEL]
3. map [PARALLEL] [VECTORIZABLE]
4. reduce
5. output
```

### 3. Differential Testing

**What it does**: Automatically compares optimized vs unoptimized execution to verify correctness.

**Implementation**: `core/differential.py`
- Runs graph with and without optimizations
- Compares results for equality
- Reports performance differences
- Identifies semantic bugs introduced by optimizations

**Usage**:
```python
from core.differential import DifferentialTester

tester = DifferentialTester(graph)
result = tester.test_with_optimizations(test_data)

# Check if results match
if not result.all_match:
    print("WARNING: Optimization changed behavior!")

# Show detailed report
print(tester.format_report(result))
```

**Example output**:
```
Differential Testing Report:
Status: PASS - All executions produced identical results

Executions:
  [SUCCESS] unoptimized
    Time: 12.5ms
    Nodes: 8
  [SUCCESS] optimized
    Time: 4.2ms
    Nodes: 5

Performance Comparison:
  optimized: 2.98x speedup
  Node reduction: 3 nodes
```

### 4. Runtime Assertions

**What it does**: Add invariant checks that survive optimization.

**Implementation**: New `assert` intent type in `core/graph.py`
- Validates data at runtime
- Passes through unchanged if assertion holds
- Raises AssertionError with custom message if violated
- Works correctly even after optimization reordering

**Usage**:
```python
graph = Graph()

data = graph.input("data", list)
positive = graph.filter(data, lambda x: x > 0)

# Assert invariant
validated = graph.assert_invariant(
    positive,
    lambda values: all(v > 0 for v in values),
    "All values must be positive"
)

# Continue processing...
```

**Benefits**:
- Catch bugs early in the pipeline
- Document assumptions in code
- Survive optimization transformations
- Provide clear error messages

### 5. IOC Debugger

**What it does**: Provides debugging utilities (trace, bisect, compare).

**Implementation**: `core/debugger.py`

**Features**:

**a) Compare**: Compare optimized vs unoptimized execution
```python
debugger = graph.get_debugger()
comparison = debugger.compare(test_data)
print(debugger.format_comparison(comparison))
```

**b) Explain Node**: Get detailed information about any node
```python
explanation = debugger.explain_node(node_id)
# Shows: type, inputs, parameters, provenance, transformations
```

**c) Bisect** (for future enhancement): Binary search for problematic node
```python
problematic_node = debugger.bisect(test_data, expected_output)
```

## How to Use

### Basic Debugging Workflow

```python
# 1. Enable debug mode
graph = Graph()
graph.enable_debug_mode(capture_provenance=True)

# 2. Build your pipeline
data = graph.input("data", list)
filtered = graph.filter(data, lambda x: x > 10)
mapped = graph.map(filtered, lambda x: x * 2)
graph.output(mapped)

# 3. View execution plan
print(graph.explain())

# 4. Add assertions
validated = graph.assert_invariant(
    filtered,
    lambda v: len(v) > 0,
    "Must have results"
)

# 5. Test with differential testing
from core.differential import DifferentialTester
tester = DifferentialTester(graph)
result = tester.test_with_optimizations(test_data)

if not result.all_match:
    print("ERROR: Optimization bug detected!")
    print(tester.format_report(result))

# 6. Execute
compiled = graph.compile()
result = compiled(data=my_data)
```

### Advanced: Custom Error Handling

```python
graph.enable_debug_mode(capture_provenance=True)

try:
    compiled = graph.compile()
    result = compiled(data=test_data)
except AssertionError as e:
    # Assertion failed - check which one
    print(f"Invariant violated: {e}")
except Exception as e:
    # Other error - use provenance to trace
    debugger = graph.get_debugger()
    # ... investigate using debugger ...
```

## Testing

Comprehensive test suite in `test_debug.py`:

```bash
python3 -m unittest test_debug -v
```

Tests cover:
- Provenance tracking
- Assertion pass/fail
- Debugger functionality
- Differential testing
- Integration scenarios

## Examples

See `examples/example5_debugging.py` for complete demonstrations:

```bash
python3 examples/example5_debugging.py
```

Includes:
1. Execution plan explanation
2. Provenance tracking
3. Differential testing
4. Runtime assertions
5. Complete debugging workflow
6. Strategy comparison

## Performance Impact

**Provenance tracking** (when enabled):
- Adds ~5-10% overhead during graph construction
- No runtime overhead during execution
- Recommend: Enable only during development/debugging

**Assertions**:
- Minimal overhead (~1% per assertion)
- Can be disabled in production if needed

**Differential testing**:
- Runs code twice (optimized + unoptimized)
- Use for test suites, not production

**Explain**:
- Zero runtime cost (only affects compilation)
- No performance impact on execution

## Future Enhancements

### Phase 4 Additions:
1. **Interactive debugger**: Step through execution node-by-node
2. **Visualization**: Generate diagrams of execution flow
3. **Performance profiling**: Identify bottlenecks
4. **Optimization hints**: Override automatic decisions
5. **Source maps**: Map generated code back to user code lines
6. **Breakpoints**: Pause execution at specific nodes

### Potential Features:
- **Time-travel debugging**: Record and replay executions
- **Fuzzing**: Automatically find edge cases
- **Coverage analysis**: Which nodes are exercised by tests
- **Dead code detection**: Identify unreachable branches

## Design Philosophy

The debugging infrastructure follows these principles:

1. **Opt-in overhead**: Debugging features only add cost when explicitly enabled
2. **Zero production cost**: Compiled code runs at full speed without debug info
3. **Fail fast**: Assertions catch problems early in the pipeline
4. **Transparency**: Users can always see what's happening under the hood
5. **Escape hatches**: Can always disable optimizations if needed

## Comparison to Other Systems

### Database Query Optimizers
- **EXPLAIN**: IOC has `graph.explain()`
- **EXPLAIN ANALYZE**: IOC has differential testing
- **Optimizer hints**: Future feature

### Compiler Debugging
- **Debug symbols**: IOC has provenance tracking
- **Optimization reports**: IOC has `explain(verbose=True)`
- **Sanitizers**: IOC has runtime assertions

### JIT Compilers
- **Deoptimization**: IOC can fall back to unoptimized
- **Source maps**: IOC has provenance
- **Profiling**: Future feature with `solvers/profiler.py`

## Files Added/Modified

### New Files:
- `core/provenance.py` - Provenance tracking system (223 lines)
- `core/debugger.py` - Debugging utilities (312 lines)
- `core/differential.py` - Differential testing (306 lines)
- `test_debug.py` - Comprehensive tests (338 lines)
- `examples/example5_debugging.py` - Usage examples (283 lines)
- `DEBUG_INFRASTRUCTURE.md` - This document

### Modified Files:
- `core/graph.py` - Added debug mode, explain(), assertions
- `solvers/strategies.py` - Added assertion support
- Total additions: ~1500 lines of debugging infrastructure

## Summary

The debugging infrastructure addresses the "debugging nightmare" concern by providing:

✅ **Provenance tracking** - Know where every node came from
✅ **Execution plans** - Understand what will run before running it
✅ **Differential testing** - Verify optimizations are correct
✅ **Runtime assertions** - Catch bugs early
✅ **Debugging utilities** - Tools to investigate issues

This makes IOC's automatic optimization **safe and debuggable** in production.
