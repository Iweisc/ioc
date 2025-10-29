# Example: Intelligent Strategy Selection with Cost Model
#
# Demonstrates how IOC uses real performance data to automatically choose
# the best execution strategy for each operation.

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.graph import Graph
from solvers.profiler import get_profiler
from solvers.kernel import SolverKernel


def example_basic_cost_model():
    # Shows how the kernel uses the cost model to select strategies
    print("Example 1: Cost Model in Action")
    print("-" * 60)
    
    # Build a simple filter+map pipeline
    g = Graph()
    data = g.input("data", list)
    filtered = g.filter(data, lambda x: x % 2 == 0)
    mapped = g.map(filtered, lambda x: x * 2)
    g.output(mapped)
    
    print("Pipeline: input -> filter(even) -> map(*2)")
    print()
    
    # Compile with speed optimization (uses cost model)
    kernel = SolverKernel(g)
    fn = kernel.compile(optimize_for="speed")
    
    # Show strategy decisions
    print("Strategy Decisions:")
    print(kernel.get_strategy_report())
    
    # Test it
    result = fn(data=list(range(20)))
    print(f"\nInput:  [0, 1, 2, ..., 19]")
    print(f"Output: {result}")
    print()


def example_compare_strategies():
    # Compare different optimization modes
    print("\nExample 2: Comparing Optimization Modes")
    print("-" * 60)
    
    test_data = list(range(1000))
    
    # Build the same graph
    g = Graph()
    data = g.input("data", list)
    filtered = g.filter(data, lambda x: x > 500)
    mapped = g.map(filtered, lambda x: x ** 2)
    reduced = g.reduce(mapped, lambda a, b: a + b, initial=0)
    g.output(reduced)
    
    print("Pipeline: filter -> map -> reduce")
    print(f"Input size: {len(test_data)} elements")
    print()
    
    # Compile with speed optimization
    kernel_speed = SolverKernel(g)
    fn_speed = kernel_speed.compile(optimize_for="speed")
    result_speed = fn_speed(data=test_data)
    
    print("Speed Optimization:")
    for line in kernel_speed.get_strategy_report().split("\n")[2:]:
        if line.strip():
            print(f"  {line}")
    print()
    
    # Compile with memory optimization
    kernel_memory = SolverKernel(g)
    fn_memory = kernel_memory.compile(optimize_for="memory")
    result_memory = fn_memory(data=test_data)
    
    print("Memory Optimization:")
    for line in kernel_memory.get_strategy_report().split("\n")[2:]:
        if line.strip():
            print(f"  {line}")
    print()
    
    # Both should produce the same result
    assert result_speed == result_memory, "Results should be identical!"
    print(f"Result: {result_speed}")
    print()


def example_profiler_data():
    # Show the profiler's performance data
    print("\nExample 3: Profiler Performance Data")
    print("-" * 60)
    
    profiler = get_profiler()
    
    # Show a subset of the data
    print("Sample of recorded performance data:")
    print()
    
    # Show filter performance
    print("Filter performance:")
    for size in [10, 100, 1000, 10000]:
        naive_cost = profiler.get_cost_estimate("filter", "NaiveStrategy", size)
        opt_cost = profiler.get_cost_estimate("filter", "OptimizedStrategy", size)
        speedup = naive_cost / opt_cost if opt_cost > 0 else 1.0
        print(f"  size={size:6}: Naive={naive_cost:8.3f}ms  Optimized={opt_cost:8.3f}ms  Speedup={speedup:.2f}x")
    print()
    
    # Show map performance
    print("Map performance:")
    for size in [10, 100, 1000, 10000]:
        naive_cost = profiler.get_cost_estimate("map", "NaiveStrategy", size)
        opt_cost = profiler.get_cost_estimate("map", "OptimizedStrategy", size)
        speedup = naive_cost / opt_cost if opt_cost > 0 else 1.0
        print(f"  size={size:6}: Naive={naive_cost:8.3f}ms  Optimized={opt_cost:8.3f}ms  Speedup={speedup:.2f}x")
    print()


def example_cache_benefit():
    # Show how caching improves compilation performance
    print("\nExample 4: Strategy Caching")
    print("-" * 60)
    
    import time
    
    # Build a complex graph
    g = Graph()
    data = g.input("data", list)
    f1 = g.filter(data, lambda x: x > 10)
    m1 = g.map(f1, lambda x: x * 2)
    f2 = g.filter(m1, lambda x: x < 100)
    m2 = g.map(f2, lambda x: x + 1)
    g.output(m2)
    
    # First compilation (builds cache)
    kernel = SolverKernel(g)
    start = time.perf_counter()
    fn = kernel.compile(optimize_for="speed")
    first_time = (time.perf_counter() - start) * 1000
    
    print(f"First compilation: {first_time:.3f}ms (builds cache)")
    print(f"Cached decisions: {len(kernel._strategy_cache)}")
    print()
    
    # Show what was cached
    print("Cached strategy decisions:")
    for (node_id, size, opt_mode), strategy in kernel._strategy_cache.items():
        node = g.nodes[node_id]
        print(f"  {node.intent_type.value:10} ({node_id[:8]}) → {strategy.__class__.__name__}")
    print()


def example_size_matters():
    # Show how strategy selection adapts to data size
    print("\nExample 5: Size-Adaptive Strategy Selection")
    print("-" * 60)
    
    profiler = get_profiler()
    
    print("Cost estimates for different data sizes:")
    print()
    
    for intent in ["filter", "map", "reduce", "flatten", "distinct"]:
        print(f"{intent.capitalize()}:")
        for size in [10, 100, 1000, 10000]:
            naive_cost = profiler.get_cost_estimate(intent, "NaiveStrategy", size)
            opt_cost = profiler.get_cost_estimate(intent, "OptimizedStrategy", size)
            
            # Which strategy would be chosen?
            best = "Optimized" if opt_cost < naive_cost else "Naive"
            diff = abs(naive_cost - opt_cost)
            
            print(f"  size={size:6}: Best={best:10} (advantage: {diff:.3f}ms)")
        print()


if __name__ == "__main__":
    print("=" * 60)
    print("IOC Cost Model & Intelligent Strategy Selection")
    print("=" * 60)
    print()
    
    # Make sure cost model is populated
    from pathlib import Path
    profile_file = Path(".ioc_profile.json")
    if not profile_file.exists() or profile_file.stat().st_size < 100:
        print("Cost model not populated. Run: python3 populate_cost_model.py")
        print()
        sys.exit(1)
    
    example_basic_cost_model()
    example_compare_strategies()
    example_profiler_data()
    example_cache_benefit()
    example_size_matters()
    
    print("=" * 60)
    print("Key Takeaways:")
    print("  1. IOC uses real performance data to choose strategies")
    print("  2. OptimizedStrategy is typically 1.5-3x faster")
    print("  3. Strategy decisions are cached for efficiency")
    print("  4. Different optimization modes serve different goals")
    print("  5. Cost model improves automatically as you use IOC")
    print("=" * 60)
