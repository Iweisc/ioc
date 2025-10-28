# IOC Quick Start

## Installation

```bash
# Clone the repository
git clone <your-repo-url>
cd ioc

# No dependencies needed - pure Python!
```

## Hello World

```python
from core.graph import Graph

# Create a graph
g = Graph()

# Define your computation
numbers = g.input("numbers", list)
doubled = g.map(numbers, lambda x: x * 2)
g.output(doubled)

# Compile and run
fn = g.compile()
result = fn(numbers=[1, 2, 3, 4, 5])
print(result)  # [2, 4, 6, 8, 10]
```

## Filter and Map

```python
from core.graph import Graph

g = Graph()
data = g.input("data", list)

# Keep only positive numbers
positive = g.filter(data, lambda x: x > 0)

# Square them
squared = g.map(positive, lambda x: x ** 2)

g.output(squared)

# Compile and execute
fn = g.compile(auto_optimize=True)
result = fn(data=[-2, -1, 0, 1, 2, 3])
print(result)  # [1, 4, 9]
```

## Data Pipeline

```python
from core.graph import Graph

# E-commerce: Find high-value customers
g = Graph()

# Input: list of orders
orders = g.input("orders", list)

# Keep completed orders
completed = g.filter(orders, lambda o: o["status"] == "completed")

# Keep high-value orders (>$100)
high_value = g.filter(completed, lambda o: o["amount"] > 100)

# Apply 10% discount
discounted = g.map(high_value, lambda o: {**o, "final": o["amount"] * 0.9})

# Sort by final price
sorted_orders = g.sort(discounted, key=lambda o: o["final"], reverse=True)

g.output(sorted_orders)

# Compile and run
pipeline = g.compile(auto_optimize=True)
result = pipeline(orders=[
    {"id": 1, "amount": 150, "status": "completed"},
    {"id": 2, "amount": 45, "status": "completed"},
    {"id": 3, "amount": 230, "status": "completed"},
])

for order in result:
    print(f"Order {order['id']}: ${order['final']:.2f}")
```

## See What IOC Generated

```python
# View the execution plan
print(g.explain())

# View the generated Python code
print(fn._ioc_code)
```

## Run Examples

```bash
# Basic examples
python3 examples/pure_ioc_simple.py
python3 examples/pure_ioc_program.py

# Advanced features
python3 examples/example5_debugging.py

# CLI tool
python3 ioc_cli.py analyze data/sales.csv --filter "price > 100"
```

## Next Steps

- Read [USER_GUIDE.md](USER_GUIDE.md) for detailed documentation
- Browse `examples/` for more patterns
- Check `docs/` for architecture and design docs
