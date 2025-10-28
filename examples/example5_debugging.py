#!/usr/bin/env python3

# Example 5: Debugging Infrastructure
#
# This example demonstrates the debugging features added in Phase 3:
# - Provenance tracking (where did nodes come from?)
# - Execution plan explanation
# - Differential testing (compare optimized vs unoptimized)
# - Runtime assertions
# - Error reporting with source information

import sys
sys.path.insert(0, '.')

from core.graph import Graph
from core.differential import DifferentialTester


def example1_explain():
    # Example 1: Understanding Execution Plans
    # Use explain() to see what will be executed.
    print("Example 1: Execution Plan Explanation")
    print("=" * 60)
    
    graph = Graph()
    
    # Build a data processing pipeline
    data = graph.input("data", list)
    filtered = graph.filter(data, lambda x: x > 10)
    mapped = graph.map(filtered, lambda x: x * 2)
    sorted_result = graph.sort(mapped, reverse=True)
    graph.output(sorted_result)
    
    # Show execution plan
    plan = graph.explain(verbose=False)
    print(plan)
    print()


def example2_provenance_tracking():
    # Example 2: Provenance Tracking
    # Track where nodes came from and what transformations were applied.
    print("Example 2: Provenance Tracking")
    print("=" * 60)
    
    # Enable debug mode with provenance tracking
    graph = Graph()
    graph.enable_debug_mode(capture_provenance=True)
    
    data = graph.input("data", list)
    filtered1 = graph.filter(data, lambda x: x > 10)
    filtered2 = graph.filter(filtered1, lambda x: x < 100)
    mapped = graph.map(filtered2, lambda x: x * 2)
    graph.output(mapped)
    
    # Optimize the graph (this will fuse filters)
    graph.optimize()
    
    # Show detailed execution plan with provenance
    plan = graph.explain(verbose=True)
    print(plan)
    print()
    
    # Get debugger to inspect nodes
    debugger = graph.get_debugger()
    
    # Explain a specific node
    if len(graph.nodes) > 0:
        first_output = graph.outputs[0]
        explanation = debugger.explain_node(first_output)
        print("Node Details:")
        print(explanation)
        print()


def example3_differential_testing():
    # Example 3: Differential Testing
    # Verify that optimizations preserve correctness.
    print("Example 3: Differential Testing")
    print("=" * 60)
    
    graph = Graph()
    
    data = graph.input("data", list)
    # Create a pipeline that can be optimized
    filtered1 = graph.filter(data, lambda x: x > 10)
    filtered2 = graph.filter(filtered1, lambda x: x < 100)
    mapped1 = graph.map(filtered2, lambda x: x * 2)
    mapped2 = graph.map(mapped1, lambda x: x + 1)
    graph.output(mapped2)
    
    # Test with optimizations
    tester = DifferentialTester(graph)
    result = tester.test_with_optimizations({"data": list(range(200))})
    
    # Show report
    report = tester.format_report(result)
    print(report)
    print()


def example4_assertions():
    # Example 4: Runtime Assertions
    # Add invariant checks to catch bugs early.
    print("Example 4: Runtime Assertions")
    print("=" * 60)
    
    graph = Graph()
    
    data = graph.input("data", list)
    
    # Filter positive numbers
    positive = graph.filter(data, lambda x: x > 0)
    
    # Assert that all values are positive
    validated = graph.assert_invariant(
        positive,
        lambda values: all(v > 0 for v in values),
        "All values must be positive after filtering"
    )
    
    # Double the values
    doubled = graph.map(validated, lambda x: x * 2)
    
    # Assert that all values are still positive and even
    validated2 = graph.assert_invariant(
        doubled,
        lambda values: all(v > 0 and v % 2 == 0 for v in values),
        "All values must be positive and even after doubling"
    )
    
    graph.output(validated2)
    
    # Compile and execute
    compiled = graph.compile()
    
    # This should succeed
    result = compiled(data=[1, 2, 3, 4, 5])
    print(f"Success! Result: {result}")
    print()
    
    # This should fail the first assertion
    print("Testing with invalid data (should raise AssertionError):")
    try:
        result = compiled(data=[-1, 2, 3])
        print("  ERROR: Should have raised AssertionError!")
    except AssertionError as e:
        print(f"  Caught expected error: {e}")
    print()


def example5_debugging_workflow():
    # Example 5: Complete Debugging Workflow
    # Combining all debugging features.
    print("Example 5: Complete Debugging Workflow")
    print("=" * 60)
    
    # 1. Enable debug mode
    graph = Graph()
    graph.enable_debug_mode(capture_provenance=True)
    
    # 2. Build pipeline
    data = graph.input("numbers", list)
    filtered = graph.filter(data, lambda x: x > 10)
    validated = graph.assert_invariant(
        filtered,
        lambda values: len(values) > 0,
        "Must have at least one value after filtering"
    )
    mapped = graph.map(validated, lambda x: x ** 2)
    graph.output(mapped)
    
    # 3. Show execution plan
    print("Step 1: Execution Plan (Before Optimization)")
    print(graph.explain())
    
    # 4. Compare optimized vs unoptimized
    print("Step 2: Differential Testing")
    debugger = graph.get_debugger()
    comparison = debugger.compare({"numbers": list(range(50))})
    print(debugger.format_comparison(comparison))
    
    # 5. Execute successfully
    print("\nStep 3: Successful Execution")
    compiled = graph.compile()
    result = compiled(numbers=list(range(20, 30)))
    print(f"Result: {result[:5]}...")  # Show first 5 values
    
    # 6. Demonstrate error handling
    print("\nStep 4: Error Handling")
    print("Testing with data that fails assertion:")
    try:
        result = compiled(numbers=[1, 2, 3])  # All filtered out
    except AssertionError as e:
        print(f"  Assertion failed as expected: {e}")
    
    print()


def example6_compare_strategies():
    # Example 6: Comparing Execution Strategies
    # (Note: Currently strategies are auto-selected, but this shows the framework)
    print("Example 6: Strategy Comparison")
    print("=" * 60)
    
    graph = Graph()
    
    data = graph.input("data", list)
    mapped = graph.map(data, lambda x: x * 2)
    filtered = graph.filter(mapped, lambda x: x < 100)
    graph.output(filtered)
    
    # Test with different strategies
    tester = DifferentialTester(graph)
    result = tester.test_all_strategies(
        {"data": list(range(1000))},
        strategies=["naive", "vectorized"]
    )
    
    print(tester.format_report(result))
    print()


def main():
    # Run all debugging examples.
    examples = [
        example1_explain,
        example2_provenance_tracking,
        example3_differential_testing,
        example4_assertions,
        example5_debugging_workflow,
        example6_compare_strategies,
    ]
    
    for i, example_func in enumerate(examples, 1):
        example_func()
        if i < len(examples):
            print("\n" + "=" * 60 + "\n")


if __name__ == "__main__":
    main()
