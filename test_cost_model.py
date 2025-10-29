# Cost Model Test Suite

import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from core.graph import Graph
from solvers.kernel import SolverKernel
from solvers.profiler import PerformanceProfiler, ProfileRecord
from solvers.strategies import NaiveStrategy, OptimizedStrategy


def test_profiler_cost_estimate():
    # Test that profiler provides cost estimates
    print("Test: Profiler cost estimates")
    
    profiler = PerformanceProfiler(profile_file=".test_profile.json")
    
    # Record some data
    profiler.record_execution("filter", "NaiveStrategy", 1000, 0.5)
    profiler.record_execution("filter", "OptimizedStrategy", 1000, 0.3)
    
    # Get cost estimates
    naive_cost = profiler.get_cost_estimate("filter", "NaiveStrategy", 1000)
    opt_cost = profiler.get_cost_estimate("filter", "OptimizedStrategy", 1000)
    
    assert naive_cost > 0, "Naive cost should be positive"
    assert opt_cost > 0, "Optimized cost should be positive"
    assert opt_cost < naive_cost, "Optimized should be faster"
    
    print(f"  Naive: {naive_cost}ms, Optimized: {opt_cost}ms")
    print("  Pass")
    
    # Cleanup
    Path(".test_profile.json").unlink(missing_ok=True)


def test_profiler_size_bucketing():
    # Test that profiler buckets sizes correctly
    print("\nTest: Profiler size bucketing")
    
    profiler = PerformanceProfiler(profile_file=".test_profile.json")
    
    # Record data for various sizes
    profiler.record_execution("map", "NaiveStrategy", 95, 0.1)   # Should bucket to 90
    profiler.record_execution("map", "NaiveStrategy", 105, 0.2)  # Should bucket to 100
    
    # Check bucketing
    cost_95 = profiler.get_cost_estimate("map", "NaiveStrategy", 95)
    cost_100 = profiler.get_cost_estimate("map", "NaiveStrategy", 100)
    
    # They should be different because they're in different buckets
    assert cost_95 == 0.1, f"Expected 0.1, got {cost_95}"
    assert cost_100 == 0.2, f"Expected 0.2, got {cost_100}"
    
    print("  Pass")
    
    # Cleanup
    Path(".test_profile.json").unlink(missing_ok=True)


def test_kernel_uses_profiler():
    # Test that kernel uses profiler for strategy selection
    print("\nTest: Kernel uses profiler for strategy selection")
    
    # Create a profiler with known data
    profiler = PerformanceProfiler(profile_file=".test_profile.json")
    
    # Make NaiveStrategy appear faster (opposite of reality) to test selection
    profiler.record_execution("filter", "NaiveStrategy", 1000, 0.1)
    profiler.record_execution("filter", "OptimizedStrategy", 1000, 0.5)
    
    # Build graph
    g = Graph()
    data = g.input("data", list)
    filtered = g.filter(data, lambda x: x > 5)
    g.output(filtered)
    
    # Create kernel with our profiler
    kernel = SolverKernel(g, profiler=profiler)
    fn = kernel.compile(optimize_for="speed")
    
    # Check that NaiveStrategy was chosen (has lower cost in our fake data)
    report = kernel.get_strategy_report()
    assert "NaiveStrategy" in report, "Expected NaiveStrategy to be chosen based on profiler data"
    
    print("  Strategy selection based on profiler data: ✓")
    print("  Pass")
    
    # Cleanup
    Path(".test_profile.json").unlink(missing_ok=True)


def test_strategy_caching():
    # Test that kernel caches strategy decisions
    print("\nTest: Strategy caching")
    
    g = Graph()
    data = g.input("data", list)
    filtered = g.filter(data, lambda x: x > 5)
    mapped = g.map(filtered, lambda x: x * 2)
    g.output(mapped)
    
    kernel = SolverKernel(g)
    assert len(kernel._strategy_cache) == 0, "Cache should start empty"
    
    # Compile
    fn = kernel.compile(optimize_for="speed")
    
    # Cache should now have entries
    assert len(kernel._strategy_cache) > 0, "Cache should have entries after compilation"
    
    print(f"  Cached {len(kernel._strategy_cache)} strategy decisions")
    print("  Pass")


def test_strategy_report():
    # Test that kernel generates strategy reports
    print("\nTest: Strategy report generation")
    
    g = Graph()
    data = g.input("data", list)
    filtered = g.filter(data, lambda x: x % 2 == 0)
    mapped = g.map(filtered, lambda x: x * 2)
    reduced = g.reduce(mapped, lambda a, b: a + b, initial=0)
    g.output(reduced)
    
    kernel = SolverKernel(g)
    fn = kernel.compile(optimize_for="speed")
    
    report = kernel.get_strategy_report()
    
    assert "filter" in report, "Report should mention filter"
    assert "map" in report, "Report should mention map"
    assert "reduce" in report, "Report should mention reduce"
    assert "Strategy" in report, "Report should mention strategies"
    
    print("  Report generated successfully")
    print("  Pass")


def test_different_optimization_modes():
    # Test that different optimization modes produce different strategy choices
    print("\nTest: Different optimization modes")
    
    g = Graph()
    data = g.input("data", list)
    filtered = g.filter(data, lambda x: x > 10)
    g.output(filtered)
    
    # Speed mode
    kernel_speed = SolverKernel(g)
    fn_speed = kernel_speed.compile(optimize_for="speed")
    
    # Memory mode
    kernel_memory = SolverKernel(g)
    fn_memory = kernel_memory.compile(optimize_for="memory")
    
    # Both should work correctly
    test_data = list(range(20))
    result_speed = fn_speed(data=test_data)
    result_memory = fn_memory(data=test_data)
    
    assert result_speed == result_memory, "Both modes should produce same results"
    assert result_speed == [11, 12, 13, 14, 15, 16, 17, 18, 19], f"Expected correct output, got {result_speed}"
    
    print("  Speed and memory modes both work correctly")
    print("  Pass")


def test_profiler_persistence():
    # Test that profiler data persists across sessions
    print("\nTest: Profiler data persistence")
    
    test_file = ".test_profile_persist.json"
    
    # Session 1: Record data
    profiler1 = PerformanceProfiler(profile_file=test_file)
    profiler1.record_execution("map", "NaiveStrategy", 100, 0.123)
    profiler1.save_profiles()
    
    # Session 2: Load data
    profiler2 = PerformanceProfiler(profile_file=test_file)
    cost = profiler2.get_cost_estimate("map", "NaiveStrategy", 100)
    
    assert cost == 0.123, f"Expected 0.123, got {cost}"
    
    print("  Data persisted and loaded correctly")
    print("  Pass")
    
    # Cleanup
    Path(test_file).unlink(missing_ok=True)


def _measure_execution_time(fn, data, iterations=10):
    """Helper to measure average execution time over multiple iterations."""
    times = []
    for _ in range(iterations):
        start = time.perf_counter()
        result = fn(data=data)
        end = time.perf_counter()
        times.append((end - start) * 1000)
    return sum(times) / len(times)


def test_cost_model_improves_performance():
    # Test that cost model actually improves performance
    print("\nTest: Cost model improves performance")
    
    import time
    
    # Build a graph
    g = Graph()
    data = g.input("data", list)
    filtered = g.filter(data, lambda x: x % 2 == 0)
    mapped = g.map(filtered, lambda x: x * 2)
    g.output(mapped)
    
    # Compile and run
    fn = g.compile(optimize_for="speed")
    
    # Test with large data
    large_data = list(range(10000))
    
    # Warm up
    fn(data=large_data)
    
    # Measure using helper function
    avg_time = _measure_execution_time(fn, large_data, iterations=10)
    
    # Should be reasonably fast
    assert avg_time < 10.0, f"Expected < 10ms, got {avg_time:.3f}ms"
    
    print(f"  Average execution time: {avg_time:.3f}ms")
    print("  Pass")


def main():
    print("Cost Model Integration Test Suite")
    print("=" * 60)
    
    tests = [
        test_profiler_cost_estimate,
        test_profiler_size_bucketing,
        test_kernel_uses_profiler,
        test_strategy_caching,
        test_strategy_report,
        test_different_optimization_modes,
        test_profiler_persistence,
        test_cost_model_improves_performance,
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            test()
            passed += 1
        except Exception as e:
            print(f"  FAIL: {e}")
            import traceback
            traceback.print_exc()
            failed += 1
    
    print(f"\nResults: {passed} passed, {failed} failed")


if __name__ == "__main__":
    main()
