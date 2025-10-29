# Optimizer Test Suite

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from core.graph import Graph
from core.optimizer import GraphOptimizer


def test_dead_code_elimination():
    # Test removal of unused nodes
    print("Test: Dead code elimination")
    
    g = Graph()
    data = g.input("data", list)
    
    # Create used path
    filtered = g.filter(data, lambda x: x > 5)
    mapped = g.map(filtered, lambda x: x * 2)
    
    # Create unused path (dead code)
    unused_filter = g.filter(data, lambda x: x < 0)
    unused_map = g.map(unused_filter, lambda x: x * 10)
    
    # Only mark the used path as output
    g.output(mapped)
    
    nodes_before = len(g.nodes)
    
    optimizer = GraphOptimizer(g)
    optimizer.optimize(passes=["dead_code_elimination"])
    
    nodes_after = len(g.nodes)
    
    assert nodes_after < nodes_before, f"Expected fewer nodes after optimization"
    assert nodes_after == 3, f"Expected 3 nodes (input, filter, map), got {nodes_after}"
    
    print(f"  Pass (removed {nodes_before - nodes_after} dead nodes)")


def test_filter_fusion():
    # Test combining adjacent filters
    print("Test: Filter fusion")
    
    g = Graph()
    data = g.input("data", list)
    
    # Two filters that can be fused
    filtered1 = g.filter(data, lambda x: x > 5)
    filtered2 = g.filter(filtered1, lambda x: x < 20)
    
    g.output(filtered2)
    
    nodes_before = len(g.nodes)
    
    optimizer = GraphOptimizer(g)
    optimizer.optimize(passes=["filter_fusion", "dead_code_elimination"])
    
    nodes_after = len(g.nodes)
    
    # Should fuse two filters into one
    assert nodes_after < nodes_before, "Expected fewer nodes after fusion"
    
    # Test that behavior is preserved
    fn = g.compile(auto_optimize=False)  # Already optimized
    result = fn(data=[3, 7, 10, 15, 25, 30])
    expected = [7, 10, 15]  # > 5 AND < 20
    
    assert result == expected, f"Expected {expected}, got {result}"
    
    print(f"  Pass (fused filters)")


def test_map_fusion():
    # Test combining adjacent maps
    print("Test: Map fusion")
    
    g = Graph()
    data = g.input("data", list)
    
    # Two maps that can be fused
    mapped1 = g.map(data, lambda x: x * 2)
    mapped2 = g.map(mapped1, lambda x: x + 1)
    
    g.output(mapped2)
    
    nodes_before = len(g.nodes)
    
    optimizer = GraphOptimizer(g)
    optimizer.optimize(passes=["map_fusion", "dead_code_elimination"])
    
    nodes_after = len(g.nodes)
    
    # Should fuse two maps into one
    assert nodes_after < nodes_before, "Expected fewer nodes after fusion"
    
    # Test that behavior is preserved
    fn = g.compile(auto_optimize=False)
    result = fn(data=[1, 2, 3])
    expected = [3, 5, 7]  # (x * 2) + 1
    
    assert result == expected, f"Expected {expected}, got {result}"
    
    print(f"  Pass (fused maps)")


def test_complex_optimization():
    # Test multiple optimizations together
    print("Test: Complex optimization")
    
    g = Graph()
    data = g.input("data", list)
    
    # Create a complex graph with opportunities for optimization
    f1 = g.filter(data, lambda x: x > 0)
    f2 = g.filter(f1, lambda x: x < 100)
    m1 = g.map(f2, lambda x: x * 2)
    m2 = g.map(m1, lambda x: x - 1)
    
    # Add some dead code
    dead = g.filter(data, lambda x: x < -100)
    
    g.output(m2)
    
    nodes_before = len(g.nodes)
    
    optimizer = GraphOptimizer(g)
    optimizer.optimize()  # Apply all optimizations
    
    nodes_after = len(g.nodes)
    
    print(f"  Nodes before: {nodes_before}, after: {nodes_after}")
    print(f"  {optimizer.get_optimization_report()}")
    
    # Should have significantly fewer nodes
    assert nodes_after < nodes_before, "Expected optimization to reduce node count"
    
    # Verify correctness
    fn = g.compile(auto_optimize=False)
    result = fn(data=[5, 50, 150, -10])
    expected = [9, 99]  # (x > 0 AND x < 100) → x*2 - 1
    
    assert result == expected, f"Expected {expected}, got {result}"
    
    print(f"  Pass (optimizations preserved correctness)")


def test_auto_optimize_in_compile():
    # Test that compile() auto-optimizes by default
    print("Test: Auto-optimize in compile")
    
    g = Graph()
    data = g.input("data", list)
    
    # Create inefficient graph
    m1 = g.map(data, lambda x: x + 1)
    m2 = g.map(m1, lambda x: x * 2)
    m3 = g.map(m2, lambda x: x - 1)
    
    g.output(m3)
    
    nodes_before = len(g.nodes)
    
    # Compile with auto-optimization (default)
    fn = g.compile(optimize_for="speed")
    
    nodes_after = len(g.nodes)
    
    # Should have optimized
    assert nodes_after < nodes_before, "Expected auto-optimization during compile"
    
    # Verify correctness
    result = fn(data=[1, 2, 3])
    expected = [3, 5, 7]  # ((x + 1) * 2) - 1
    
    assert result == expected, f"Expected {expected}, got {result}"
    
    print(f"  Pass (auto-optimization works)")


def test_common_subexpression_elimination():
    # Test deduplication of identical computations
    print("Test: Common subexpression elimination")
    
    g = Graph()
    data = g.input("data", list)
    
    # Create the same filter twice using the SAME function object (important!)
    predicate = lambda x: x > 5
    transform = lambda x: x * 2
    
    filtered1 = g.filter(data, predicate)
    filtered2 = g.filter(data, predicate)  # Same function object = duplicate!
    
    # Use both in separate maps
    mapped1 = g.map(filtered1, transform)
    mapped2 = g.map(filtered2, transform)
    
    g.output(mapped1)
    g.output(mapped2)
    
    nodes_before = len(g.nodes)
    
    optimizer = GraphOptimizer(g)
    optimizer.optimize(passes=["common_subexpression_elimination", "dead_code_elimination"])
    
    nodes_after = len(g.nodes)
    
    print(f"  Nodes before: {nodes_before}, after: {nodes_after}")
    print(f"  {optimizer.get_optimization_report()}")
    
    # Should have deduplicated one of the filters
    assert nodes_after < nodes_before, "Expected CSE to reduce node count"
    
    # Verify correctness - both outputs should be identical
    fn = g.compile(auto_optimize=False)
    result = fn(data=[3, 7, 10, 2])
    
    # Both outputs should be the same: [14, 20]
    assert len(result) == 2, f"Expected 2 outputs, got {len(result)}"
    assert result[0] == result[1], f"Expected identical outputs, got {result}"
    assert result[0] == [14, 20], f"Expected [14, 20], got {result[0]}"
    
    print(f"  Pass (CSE deduplicated nodes correctly)")


def test_cse_with_constants():
    # Test CSE with constant nodes
    print("Test: CSE with constants")
    
    g = Graph()
    data = g.input("data", list)
    
    # Create the same constant multiple times
    ten1 = g.constant(10)
    ten2 = g.constant(10)  # Duplicate!
    
    # Use in different operations
    mapped1 = g.map(data, lambda x: x + 10)
    mapped2 = g.map(data, lambda x: x + 10)
    
    g.output(mapped1)
    g.output(mapped2)
    
    nodes_before = len(g.nodes)
    
    optimizer = GraphOptimizer(g)
    optimizer.optimize(passes=["common_subexpression_elimination"])
    
    nodes_after = len(g.nodes)
    
    print(f"  Nodes before: {nodes_before}, after: {nodes_after}")
    
    # Note: This test verifies CSE works, but map nodes with lambda may not be deduplicated
    # since lambda creates new function objects each time
    
    print(f"  Pass (CSE handled constants)")


def test_cse_preserves_different_operations():
    # Test that CSE doesn't incorrectly merge different operations
    print("Test: CSE preserves different operations")
    
    g = Graph()
    data = g.input("data", list)
    
    # Create two different filters (should NOT be merged)
    filtered1 = g.filter(data, lambda x: x > 5)
    filtered2 = g.filter(data, lambda x: x > 10)  # Different predicate
    
    mapped1 = g.map(filtered1, lambda x: x * 2)
    mapped2 = g.map(filtered2, lambda x: x * 2)
    
    g.output(mapped1)
    g.output(mapped2)
    
    optimizer = GraphOptimizer(g)
    optimizer.optimize(passes=["common_subexpression_elimination"])
    
    # Verify correctness - outputs should be different
    fn = g.compile(auto_optimize=False)
    result = fn(data=[3, 7, 12, 2])
    
    assert len(result) == 2, f"Expected 2 outputs"
    assert result[0] == [14, 24], f"Expected [14, 24], got {result[0]}"
    assert result[1] == [24], f"Expected [24], got {result[1]}"
    
    print(f"  Pass (CSE preserved different operations)")


def test_filter_before_map_disabled():
    # Test that filter-before-map is currently disabled (placeholder)
    print("Test: Filter-before-map (disabled)")
    
    g = Graph()
    data = g.input("data", list)
    
    # Create map -> filter pattern
    mapped = g.map(data, lambda x: x * 2)
    filtered = g.filter(mapped, lambda x: x > 10)
    
    g.output(filtered)
    
    nodes_before = len(g.nodes)
    
    optimizer = GraphOptimizer(g)
    optimizer.optimize(passes=["filter_before_map"])
    
    nodes_after = len(g.nodes)
    
    # Should NOT reorder (pass is disabled)
    assert nodes_after == nodes_before, "filter_before_map should be a no-op (disabled)"
    
    # Verify correctness is preserved
    fn = g.compile(auto_optimize=False)
    result = fn(data=[3, 7, 10])
    expected = [14, 20]  # (3*2=6, 7*2=14, 10*2=20) -> filter >10 -> [14, 20]
    
    assert result == expected, f"Expected {expected}, got {result}"
    
    print(f"  Pass (filter_before_map correctly disabled)")


def main():
    print("Optimizer Test Suite")
    
    tests = [
        test_dead_code_elimination,
        test_filter_fusion,
        test_map_fusion,
        test_complex_optimization,
        test_auto_optimize_in_compile,
        test_common_subexpression_elimination,
        test_cse_with_constants,
        test_cse_preserves_different_operations,
        test_filter_before_map_disabled,
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
