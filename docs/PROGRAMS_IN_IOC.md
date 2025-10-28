# Programs Written IN IOC

## The Difference

There's an important distinction between:

### Tools that USE IOC
**Example:** `ioc_cli.py`
- Written in regular Python
- **Uses** IOC as a library
- Builds IOC graphs and executes them
- Like writing a program that uses NumPy

```python
# This is Python code that USES IOC
from core.graph import Graph

graph = Graph()  # ← Using IOC library
data = graph.input("data", list)  # ← IOC API call
...
```

### Programs written IN IOC
**Example:** `examples/pure_ioc_simple.py`
- Written in **pure IOC declarative style**
- No manual loops (`for`, `while`)
- No manual conditions (`if`, `else`)
- Just intent declarations
- IOC handles ALL execution

```python
# This is a program written IN IOC
graph = Graph()

# Everything below is pure IOC - no manual control flow!
orders = graph.input("orders", list)
completed = graph.filter(orders, lambda o: o["status"] == "completed")
high_value = graph.filter(completed, lambda o: o["amount"] > 100)
with_discount = graph.map(high_value, lambda o: {...})
sorted_orders = graph.sort(with_discount, ...)
graph.output(sorted_orders)

# Compile and run - IOC does everything
compiled = graph.compile()
result = compiled(orders=data)
```

## Pure IOC Program Example

See `examples/pure_ioc_simple.py` for a complete example:

```bash
python3 examples/pure_ioc_simple.py
```

**What it does:**
- Analyzes e-commerce orders
- Filters for completed orders
- Filters for high-value (>$100)
- Applies 10% discount
- Sorts by savings
- **100% declarative - zero manual loops!**

**Output:**
```
IOC Execution Plan:
============================================================
Total nodes: 6
Execution order: 6 steps
Parallelizable operations: 3/6

RESULTS: High-Value Completed Orders (>$100 with 10% discount)
1. Order #7 - David - Saved: $31.00
2. Order #3 - Alice - Saved: $23.00
...
Total Savings: $99.00

[x] Program completed - 100% IOC, 0% manual loops!
```

## The IOC Programming Model

When you write a program IN IOC:

### TODO: You DON'T write:
```python
# Manual loops
for order in orders:
    if order['status'] == 'completed':
        if order['amount'] > 100:
            ...

# Manual conditions
if customer == 'Alice':
    total += amount
```

### DONE: You DO write:
```python
# Declare intentions
completed = graph.filter(orders, lambda o: o['status'] == 'completed')
high_value = graph.filter(completed, lambda o: o['amount'] > 100)
sorted = graph.sort(high_value, ...)

# IOC figures out HOW to execute
compiled = graph.compile()  # ← Automatic optimization!
result = compiled(orders=data)
```

## Benefits

When you write programs IN IOC:

1. **No manual optimization needed**
   - IOC automatically fuses operations
   - IOC automatically parallelizes
   - IOC automatically chooses strategies

2. **Debuggable**
   - See execution plan before running
   - Differential testing
   - Provenance tracking

3. **Composable**
   - Build complex pipelines from simple pieces
   - Reuse graph components
   - No hidden state

4. **Declarative**
   - Say WHAT you want
   - Not HOW to get it
   - Cleaner code

## Try It Yourself

```bash
# Run the pure IOC program
cd ioc
python3 examples/pure_ioc_simple.py

# Compare to manual Python
# (notice: no for loops in the IOC version!)
```

## Summary

| Aspect | Tool USING IOC | Program IN IOC |
|--------|----------------|----------------|
| Style | Imperative Python | Declarative IOC |
| Loops | Manual `for`/`while` | None - IOC handles it |
| Conditions | Manual `if`/`else` | Via `filter` |
| Optimization | Manual | Automatic |
| Example | `ioc_cli.py` | `pure_ioc_simple.py` |

**IOC is both:**
- A library you can USE
- A language you can code IN

This is the power of IOC: you get automatic optimization, debugging tools, and clean declarative code!
