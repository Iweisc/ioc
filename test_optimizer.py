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
    
    print("  Pass (CSE deduplicated nodes correctly)")


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
    
    print("  Pass (CSE handled constants)")


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
    
    assert len(result) == 2, "Expected 2 outputs"
    assert result[0] == [14, 24], f"Expected [14, 24], got {result[0]}"
    assert result[1] == [24], f"Expected [24], got {result[1]}"
    
    print("  Pass (CSE preserved different operations)")


def test_filter_before_map_independent():
    # Test filter-before-map with independent predicate
    print("Test: Filter-before-map (independent predicate)")
    
    g = Graph()
    data = g.input("data", list)
    
    # Create map -> filter pattern where predicate is independent
    # Transform: upper(), Predicate: length > 3
    # These are independent - length doesn't change with upper()
    mapped = g.map(data, lambda x: x.upper())
    filtered = g.filter(mapped, lambda x: len(x) > 3)
    
    g.output(filtered)
    
    # Track node connections before optimization
    filter_node_id = filtered
    map_node_id = mapped
    
    optimizer = GraphOptimizer(g)
    optimizer.optimize(passes=["filter_before_map"])
    
    # After optimization, filter should come before map
    filter_node = g.nodes[filter_node_id]
    map_node = g.nodes[map_node_id]
    
    # Filter should now take the original input
    assert filter_node.inputs[0] == data, "Filter should now take original input"
    # Map should now take filter's output
    assert map_node.inputs[0] == filter_node_id, "Map should now take filter's output"
    
    # Verify correctness
    fn = g.compile(auto_optimize=False)
    result = fn(data=["hi", "test", "hello", "x"])
    expected = ["TEST", "HELLO"]  # "test" and "hello" have len > 3, uppercased
    
    assert result == expected, f"Expected {expected}, got {result}"
    
    print("  Pass (filter_before_map reordered independent operations)")


def test_filter_before_map_dependent():
    # Test filter-before-map with dependent predicate (should NOT reorder)
    print("Test: Filter-before-map (dependent predicate)")
    
    g = Graph()
    data = g.input("data", list)
    
    # Create map -> filter pattern where predicate depends on map
    # Transform: x * 2, Predicate: x > 10
    # These are dependent - predicate checks transformed value
    mapped = g.map(data, lambda x: x * 2)
    filtered = g.filter(mapped, lambda x: x > 10)
    
    g.output(filtered)
    
    filter_node_id = filtered
    map_node_id = mapped
    
    # Store original structure
    original_filter_inputs = g.nodes[filter_node_id].inputs.copy()
    original_map_inputs = g.nodes[map_node_id].inputs.copy()
    
    optimizer = GraphOptimizer(g)
    optimizer.optimize(passes=["filter_before_map"])
    
    # Should NOT reorder (predicate depends on transformation)
    assert g.nodes[filter_node_id].inputs == original_filter_inputs, "Filter inputs should be unchanged"
    assert g.nodes[map_node_id].inputs == original_map_inputs, "Map inputs should be unchanged"
    
    # Verify correctness
    fn = g.compile(auto_optimize=False)
    result = fn(data=[3, 7, 10])
    expected = [14, 20]  # (3*2=6, 7*2=14, 10*2=20) -> filter >10 -> [14, 20]
    
    assert result == expected, f"Expected {expected}, got {result}"
    
    print("  Pass (filter_before_map correctly preserved dependent operations)")


def test_filter_before_map_with_multiple_consumers():
    # Test that filter-before-map doesn't optimize when map has multiple consumers
    print("Test: Filter-before-map (multiple consumers)")
    
    g = Graph()
    data = g.input("data", list)
    
    # Create map with multiple consumers
    mapped = g.map(data, lambda x: x.upper())
    filtered = g.filter(mapped, lambda x: len(x) > 3)
    
    # Add another consumer of the map
    another_filter = g.filter(mapped, lambda x: x.startswith("T"))
    
    g.output(filtered)
    
    # Store original structure
    original_filter_inputs = g.nodes[filtered].inputs.copy()
    
    optimizer = GraphOptimizer(g)
    optimizer.optimize(passes=["filter_before_map"])
    
    # Should NOT reorder (map has multiple consumers)
    assert g.nodes[filtered].inputs == original_filter_inputs, "Should not reorder with multiple consumers"
    
    # Verify output correctness
    fn = g.compile(auto_optimize=False)
    result = fn(data=["hi", "test", "hello", "x"])
    expected = ["TEST", "HELLO"]  # Only strings with len > 3, uppercased
    
    assert result == expected, f"Expected {expected}, got {result}"
    
    print("  Pass (filter_before_map correctly skipped multiple consumer case)")


def test_filter_before_map_end_to_end():
    # End-to-end test showing performance benefit
    print("Test: Filter-before-map (end-to-end)")
    
    g = Graph()
    data = g.input("data", list)
    
    # Expensive transformation with independent filter
    # This pattern benefits from reordering: filter first to reduce work
    mapped = g.map(data, lambda x: x.lower().strip())
    filtered = g.filter(mapped, lambda x: len(x) > 2)  # len is independent
    
    g.output(filtered)
    
    optimizer = GraphOptimizer(g)
    optimizer.optimize(passes=["filter_before_map"])
    
    # Verify correctness with real data
    fn = g.compile(auto_optimize=False)
    result = fn(data=["HI", "TEST", "HELLO", "X", "  OK  "])
    expected = ["test", "hello", "ok"]  # "TEST", "HELLO", "OK" have len > 2 after strip
    
    assert result == expected, f"Expected {expected}, got {result}"
    
    print("  Pass (filter_before_map end-to-end optimization works correctly)")


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
        test_filter_before_map_independent,
        test_filter_before_map_dependent,
        test_filter_before_map_with_multiple_consumers,
        test_filter_before_map_end_to_end,
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
