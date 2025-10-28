# IOC User Guide

## Getting Started with IOC

IOC (Intent-Oriented Computing) is a framework for expressing data processing pipelines as high-level intents, which are then automatically optimized and executed.

### Installation

```bash
# From source
git clone https://github.com/yourusername/ioc.git
cd ioc
python3 setup.py install

# Or with pip (when published)
pip install ioc-lang
```

### Quick Start

#### 1. Using the CLI

```bash
# Analyze a CSV file
ioc analyze data/sales.csv --filter "price>100" --sort="-price" --limit=10

# Benchmark performance
ioc benchmark --size 10000

# Interactive mode
ioc interactive

# Explain execution plans
ioc explain --debug
```

#### 2. Using the Python API

```python
from core.graph import Graph

# Create a graph
graph = Graph()

# Build pipeline
data = graph.input("data", list)
filtered = graph.filter(data, lambda x: x > 10)
mapped = graph.map(filtered, lambda x: x * 2)
sorted_result = graph.sort(mapped, reverse=True)

graph.output(sorted_result)

# Compile and execute
compiled = graph.compile()
result = compiled(data=list(range(100)))

print(result[:10])  # Show first 10 results
```

## Core Concepts

### 1. Intent Graph

The intent graph represents your computation as a directed acyclic graph (DAG) of operations.

**Available Intents:**
- `input` - Define input parameters
- `constant` - Define constant values  
- `filter` - Keep elements matching predicate
- `map` - Transform each element
- `reduce` - Combine elements into single value
- `sort` - Order elements
- `group_by` - Group by key function
- `join` - Join two sequences
- `flatten` - Flatten nested lists
- `distinct` - Remove duplicates
- `assert_invariant` - Runtime assertions

### 2. Automatic Optimization

IOC automatically applies optimizations:

**Graph Optimizations:**
- Dead code elimination
- Filter fusion (combine adjacent filters)
- Map fusion (combine adjacent maps)
- Operation reordering

**Execution Optimizations:**
- Strategy selection (naive vs vectorized)
- Parallelization of independent operations
- Memory layout optimization

### 3. Debugging Support

IOC provides comprehensive debugging tools:

```python
# Enable debug mode
graph.enable_debug_mode(capture_provenance=True)

# Show execution plan
print(graph.explain(verbose=True))

# Compare optimized vs unoptimized
from core.differential import DifferentialTester
tester = DifferentialTester(graph)
result = tester.test_with_optimizations(test_data)
print(tester.format_report(result))

# Add runtime assertions
validated = graph.assert_invariant(
    node,
    lambda data: len(data) > 0,
    "Must have results"
)
```

## CLI Reference

### `ioc analyze`

Analyze and transform CSV files.

**Syntax:**
```bash
ioc analyze <file> [options]
```

**Options:**
- `--filter <expr>` - Filter rows (e.g., "age>18", "name==John")
- `--map <expr>` - Transform columns (e.g., "price*1.1", "qty+10")
- `--group-by <field>` - Group by field
- `--sort <field>` - Sort by field (prefix `-` for descending)
- `--limit <n>` - Limit results to n rows
- `--output/-o <file>` - Write output to JSON file
- `--explain` - Show execution plan
- `--test` - Run differential testing
- `--debug` - Enable debug mode
- `--no-optimize` - Disable optimizations

**Examples:**
```bash
# Find high-value sales
ioc analyze data/sales.csv --filter "price>500" --sort="-price"

# Calculate adjusted prices
ioc analyze data/sales.csv --map "price*1.1" --output=adjusted.json

# Group by category
ioc analyze data/sales.csv --group-by category --explain

# Complex pipeline
ioc analyze data/sales.csv \
  --filter "customer_age>25" \
  --filter "price>100" \
  --map "price*0.9" \
  --sort="-price" \
  --limit=10 \
  --test
```

### `ioc benchmark`

Benchmark different execution strategies.

**Syntax:**
```bash
ioc benchmark [options]
```

**Options:**
- `--size <n>` - Dataset size (default: 1000)

**Example:**
```bash
ioc benchmark --size 100000
```

### `ioc explain`

Show execution plan for a pipeline.

**Syntax:**
```bash
ioc explain [options]
```

**Options:**
- `--debug` - Verbose output with provenance
- `--no-optimize` - Show unoptimized plan

**Example:**
```bash
ioc explain --debug
```

### `ioc interactive`

Interactive mode for building pipelines.

**Syntax:**
```bash
ioc interactive
```

**Commands in interactive mode:**
- `filter <expr>` - Add filter (e.g., `filter x > 10`)
- `map <expr>` - Add map (e.g., `map x * 2`)
- `sort` - Add sort operation
- `distinct` - Remove duplicates
- `explain` - Show execution plan
- `visualize` - Show graph structure
- `execute` - Run the pipeline
- `reset` - Start over
- `help` - Show help
- `exit` - Quit

**Example session:**
```
$ ioc interactive
ioc> filter x > 10
Added: filter(x > 10)
ioc> map x * 2
Added: map(x * 2)
ioc> sort
Added: sort()
ioc> explain
Execution Plan:
...
ioc> execute
Result: [22, 24, 26, ...]
ioc> exit
```

## Python API Reference

### Creating Graphs

```python
from core.graph import Graph

# Create new graph
graph = Graph()

# Enable debug mode (optional)
graph.enable_debug_mode(capture_provenance=True)
```

### Building Pipelines

```python
# Input
data = graph.input("data", list)

# Filter
filtered = graph.filter(data, lambda x: x > 10)

# Map
mapped = graph.map(data, lambda x: x * 2)

# Reduce
total = graph.reduce(data, lambda acc, x: acc + x, initial=0)

# Sort
sorted_data = graph.sort(data, key=lambda x: x.value, reverse=True)

# Group by
grouped = graph.group_by(data, lambda x: x.category)

# Join
joined = graph.join(left, right, lambda l, r: l.id == r.user_id)

# Flatten
flat = graph.flatten(nested_list)

# Distinct
unique = graph.distinct(data)

# Assert invariant
validated = graph.assert_invariant(
    data,
    lambda x: len(x) > 0,
    "Must have data"
)

# Output (mark as final result)
graph.output(mapped)
```

### Compilation & Execution

```python
# Compile with automatic optimization
compiled = graph.compile()

# Compile without optimization
compiled = graph.compile(auto_optimize=False)

# Execute
result = compiled(data=[1, 2, 3, 4, 5])
```

### Debugging

```python
# Show execution plan
plan = graph.explain()
print(plan)

# Verbose plan with provenance
plan = graph.explain(verbose=True)
print(plan)

# Get debugger
debugger = graph.get_debugger()

# Compare optimized vs unoptimized
comparison = debugger.compare({"data": test_data})
print(debugger.format_comparison(comparison))

# Explain specific node
explanation = debugger.explain_node(node_id)
print(explanation)
```

### Differential Testing

```python
from core.differential import DifferentialTester

# Create tester
tester = DifferentialTester(graph)

# Test with optimizations
result = tester.test_with_optimizations({"data": test_data})

# Check if results match
if not result.all_match:
    print("WARNING: Optimization changed behavior!")

# Show detailed report
print(tester.format_report(result))

# Test different strategies
result = tester.test_all_strategies(
    {"data": test_data},
    strategies=["naive", "vectorized"]
)
```

## Best Practices

### 1. Start Simple

```python
# Good: Start with basic pipeline
graph = Graph()
data = graph.input("data", list)
filtered = graph.filter(data, lambda x: x > 0)
graph.output(filtered)
```

### 2. Add Assertions

```python
# Good: Add assertions to catch bugs early
validated = graph.assert_invariant(
    filtered,
    lambda x: all(v > 0 for v in x),
    "All values must be positive"
)
```

### 3. Use Debug Mode During Development

```python
# Good: Enable debug mode while developing
graph.enable_debug_mode(capture_provenance=True)

# Show plan before executing
print(graph.explain())

# Test correctness
tester = DifferentialTester(graph)
result = tester.test_with_optimizations(test_data)
assert result.all_match, "Optimization bug detected!"
```

### 4. Disable Debug Mode in Production

```python
# Good: No debug overhead in production
graph = Graph()  # Debug mode off by default
compiled = graph.compile()  # Full optimization
```

### 5. Test with Representative Data

```python
# Good: Test with realistic data sizes
small_test = list(range(100))
medium_test = list(range(10000))
large_test = list(range(1000000))

for test_data in [small_test, medium_test, large_test]:
    result = compiled(data=test_data)
    print(f"Size {len(test_data)}: OK")
```

## Examples

### Example 1: Data Analysis

```python
# Process sales data
graph = Graph()
data = graph.input("sales", list)

# Filter high-value sales
high_value = graph.filter(data, lambda x: x['price'] > 100)

# Add tax
with_tax = graph.map(high_value, 
    lambda x: {**x, 'total': x['price'] * 1.1})

# Sort by total
sorted_sales = graph.sort(with_tax, 
    key=lambda x: x['total'],
    reverse=True)

# Top 10
graph.output(sorted_sales)

compiled = graph.compile()
result = compiled(sales=load_sales_data())
```

### Example 2: Log Analysis

```python
# Analyze server logs
graph = Graph()
logs = graph.input("logs", list)

# Filter errors
errors = graph.filter(logs, lambda x: x['level'] == 'ERROR')

# Extract error codes
codes = graph.map(errors, lambda x: x['error_code'])

# Count unique codes
unique_codes = graph.distinct(codes)

graph.output(unique_codes)
```

### Example 3: ETL Pipeline

```python
# Extract, Transform, Load
graph = Graph()

# Extract
users = graph.input("users", list)
orders = graph.input("orders", list)

# Transform: Join users with orders
joined = graph.join(users, orders,
    lambda u, o: u['id'] == o['user_id'])

# Transform: Calculate metrics
metrics = graph.map(joined,
    lambda pair: {
        'user': pair[0]['name'],
        'order_total': pair[1]['total'],
        'date': pair[1]['date']
    })

# Transform: Group by user
by_user = graph.group_by(metrics, lambda x: x['user'])

# Load (output)
graph.output(by_user)

compiled = graph.compile()
result = compiled(users=user_data, orders=order_data)
```

## Troubleshooting

### Problem: Optimization changes behavior

**Solution:** Use differential testing to catch this:

```python
tester = DifferentialTester(graph)
result = tester.test_with_optimizations(test_data)

if not result.all_match:
    print(tester.format_report(result))
    # Fix your code or report a bug
```

### Problem: Performance is slower than expected

**Solution:** Check execution plan:

```python
print(graph.explain(verbose=True))

# Check if operations are parallelized
# Check if optimizations are applied
```

### Problem: Runtime error in generated code

**Solution:** Enable provenance tracking:

```python
graph.enable_debug_mode(capture_provenance=True)

# Now errors will show original source location
try:
    result = compiled(data=test_data)
except Exception as e:
    # Error message includes provenance info
    print(f"Error: {e}")
```

### Problem: Can't understand what's being executed

**Solution:** Use explain and visualize:

```python
# Show execution plan
print(graph.explain(verbose=True))

# Show graph structure
print(graph.visualize())

# Get debugger
debugger = graph.get_debugger()
for node_id in graph.nodes:
    print(debugger.explain_node(node_id))
```

## Advanced Topics

### Custom Strategies

You can add custom execution strategies:

```python
from solvers.strategies import Strategy

class MyCustomStrategy(Strategy):
    def can_handle(self, intent_type: str) -> bool:
        return intent_type in ["filter", "map"]
    
    def generate_code(self, node, context):
        # Generate custom code
        pass
    
    def get_cost_estimate(self, node, input_sizes):
        return 1.0  # Custom cost model
```

### Graph Serialization

Save and load graphs:

```python
# Save (currently limited due to lambda serialization)
# You can save the graph structure, but not lambdas

# Workaround: Use string expressions
# Coming in future versions
```

## FAQ

**Q: Does IOC require any dependencies?**  
A: No! IOC is pure Python with zero dependencies.

**Q: Can I use IOC in production?**  
A: IOC is currently in alpha (v0.3.0). It's suitable for experimentation and research. Production use should wait for v1.0.

**Q: How does IOC compare to Pandas/Spark?**  
A: IOC is a lower-level framework. It's similar to LINQ or Rust iterators. You could build Pandas-like APIs on top of IOC.

**Q: Does IOC support GPU execution?**  
A: Not yet. GPU support is planned for Phase 3 (see ROADMAP.md).

**Q: Can I contribute?**  
A: Absolutely! See CONTRIBUTING.md (coming soon).

## Next Steps

- Read [ARCHITECTURE.md](ARCHITECTURE.md) to understand internals
- Check [IOC_USE_CASES.md](IOC_USE_CASES.md) for application ideas
- Review [DEBUG_INFRASTRUCTURE.md](DEBUG_INFRASTRUCTURE.md) for debugging guide
- Explore [examples/](examples/) directory for more examples

## Support

- GitHub Issues: https://github.com/yourusername/ioc/issues
- Discussions: https://github.com/yourusername/ioc/discussions
- Email: your@email.com
