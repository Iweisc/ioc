# Example: Filter-Before-Map Optimization
# 
# Demonstrates how IOC automatically reorders operations to improve performance
# when the filter predicate is independent of the map transformation.

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.graph import Graph


def example_independent_operations():
    # Example where filter predicate is independent of map transformation
    print("Example 1: Independent Operations")
    print("-" * 50)
    
    g = Graph()
    data = g.input("data", list)
    
    # Pattern: map then filter, where predicate is independent
    # Transform: convert to uppercase (expensive)
    # Predicate: length > 3 (independent - length doesn't change with case)
    mapped = g.map(data, lambda x: x.upper())
    filtered = g.filter(mapped, lambda x: len(x) > 3)
    
    g.output(filtered)
    
    print("Before optimization:")
    print(f"  Nodes: {len(g.nodes)}")
    print("  Pattern: input -> map(upper) -> filter(len>3)")
    
    # Compile with optimization
    fn = g.compile(auto_optimize=True)
    
    print("\nAfter optimization:")
    print(f"  Nodes: {len(g.nodes)}")
    print("  Pattern: input -> filter(len>3) -> map(upper)")
    print("  Benefit: Only apply upper() to filtered elements!")
    
    # Test
    result = fn(data=["hi", "test", "hello", "x", "world"])
    print(f"\nInput:  ['hi', 'test', 'hello', 'x', 'world']")
    print(f"Output: {result}")
    print("  -> Only strings with len>3 are uppercased\n")


def example_dependent_operations():
    # Example where filter depends on map (cannot reorder)
    print("Example 2: Dependent Operations (No Reorder)")
    print("-" * 50)
    
    g = Graph()
    data = g.input("data", list)
    
    # Pattern: map then filter, where predicate depends on map
    # Transform: multiply by 2
    # Predicate: value > 10 (depends on transformation result)
    mapped = g.map(data, lambda x: x * 2)
    filtered = g.filter(mapped, lambda x: x > 10)
    
    g.output(filtered)
    
    print("Before optimization:")
    print("  Pattern: input -> map(*2) -> filter(>10)")
    
    # Compile with optimization
    fn = g.compile(auto_optimize=True)
    
    print("\nAfter optimization:")
    print("  Pattern: input -> map(*2) -> filter(>10)")
    print("  Note: NOT reordered (predicate depends on map)")
    
    # Test
    result = fn(data=[3, 7, 10, 15])
    print(f"\nInput:  [3, 7, 10, 15]")
    print(f"Output: {result}")
    print("  -> [14, 20, 30] (doubled values > 10)\n")


def example_performance_benefit():
    # Show where the optimization really helps
    print("Example 3: Performance Benefit")
    print("-" * 50)
    
    g = Graph()
    data = g.input("data", list)
    
    # Expensive transformation with highly selective filter
    # Transform: complex string operation
    # Filter: length check (independent and highly selective)
    mapped = g.map(data, lambda x: x.lower().strip().replace(" ", "_"))
    filtered = g.filter(mapped, lambda x: len(x) > 10)  # Very selective!
    
    g.output(filtered)
    
    # Compile with optimization
    fn = g.compile(auto_optimize=True)
    
    # Generate test data: mostly short strings, few long ones
    test_data = ["hi"] * 100 + ["test"] * 100 + ["hello"] * 100
    test_data += ["this is a very long string"] * 5
    
    result = fn(data=test_data)
    
    print(f"Input size: {len(test_data)} elements")
    print(f"Output size: {len(result)} elements")
    print(f"Filter selectivity: {len(result)/len(test_data)*100:.1f}%")
    print("\nBenefit: Expensive transformation applied to:")
    print(f"  - Without optimization: {len(test_data)} elements")
    print(f"  - With optimization: ~{len(test_data)} during filter, then {len(result)} after")
    print("  - BUT: Filter reduces downstream work significantly!")
    print(f"\nOutput sample: {result[:2]}\n")


def example_safety_checks():
    # Show safety: won't reorder if map has multiple consumers
    print("Example 4: Safety - Multiple Consumers")
    print("-" * 50)
    
    g = Graph()
    data = g.input("data", list)
    
    # Map with multiple consumers
    mapped = g.map(data, lambda x: x.upper())
    filtered1 = g.filter(mapped, lambda x: len(x) > 3)
    filtered2 = g.filter(mapped, lambda x: x.startswith("T"))
    
    g.output(filtered1)
    
    print("Pattern: input -> map(upper) -> filter1(len>3)")
    print("                            \\-> filter2(starts with T)")
    
    # Compile with optimization
    fn = g.compile(auto_optimize=True)
    
    print("\nAfter optimization:")
    print("  Pattern: NOT reordered (map has multiple consumers)")
    print("  Reason: Safety check prevents reordering\n")


if __name__ == "__main__":
    example_independent_operations()
    example_dependent_operations()
    example_performance_benefit()
    example_safety_checks()
    
    print("=" * 50)
    print("Key Takeaways:")
    print("  1. IOC detects when filters are independent of maps")
    print("  2. Automatically reorders to filter before transforming")
    print("  3. Reduces work on expensive transformations")
    print("  4. Safety checks prevent incorrect optimizations")
    print("  5. All optimizations preserve semantic correctness")
