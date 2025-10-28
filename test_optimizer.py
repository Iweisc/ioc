# Optimizer Test Suite

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from core.graph import Graph
from core.optimizer import GraphOptimizer


def test_dead_code_elimination():
    """Test removal of unused nodes"""
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
    """Test combining adjacent filters"""
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
    """Test combining adjacent maps"""
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
    """Test multiple optimizations together"""
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
    """Test that compile() auto-optimizes by default"""
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


def main():
    print("Optimizer Test Suite")
    print("=" * 60)
    
    tests = [
        test_dead_code_elimination,
        test_filter_fusion,
        test_map_fusion,
        test_complex_optimization,
        test_auto_optimize_in_compile,
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
    
    print("=" * 60)
    print(f"Results: {passed} passed, {failed} failed")
    print("=" * 60)


if __name__ == "__main__":
    main()
