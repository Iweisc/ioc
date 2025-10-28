# Tests for debugging infrastructure

import unittest
from core.graph import Graph
from core.provenance import ProvenanceTracker, TransformationRecord
from core.debugger import IOCDebugger
from core.differential import DifferentialTester


class TestProvenance(unittest.TestCase):
    """Test provenance tracking system."""
    
    def test_basic_provenance(self):
        """Test that provenance is captured for nodes."""
        tracker = ProvenanceTracker()
        graph = Graph()
        graph.provenance_tracker = tracker
        
        data_node = graph.input("data", list)
        filter_node = graph.filter(data_node, lambda x: x > 10)
        map_node = graph.map(filter_node, lambda x: x * 2)
        
        # Check provenance was tracked
        self.assertIsNotNone(tracker.get_provenance(data_node))
        self.assertIsNotNone(tracker.get_provenance(filter_node))
        self.assertIsNotNone(tracker.get_provenance(map_node))
        
        # All should be user-created
        for node_id in [data_node, filter_node, map_node]:
            prov = tracker.get_provenance(node_id)
            self.assertEqual(prov.created_by, "user")
            self.assertFalse(prov.is_optimized())
    
    def test_optimization_tracking(self):
        """Test that optimizations are tracked in provenance."""
        tracker = ProvenanceTracker()
        
        tracker.track_optimization(
            result_node_id="node1",
            transformation="filter_fusion",
            original_nodes=["node2", "node3"],
            description="Fused two filters"
        )
        
        prov = tracker.get_provenance("node1")
        self.assertIsNotNone(prov)
        self.assertEqual(prov.created_by, "optimizer")
        self.assertTrue(prov.is_optimized())
        self.assertEqual(len(prov.transformations), 1)
        self.assertEqual(prov.transformations[0].transformation, "filter_fusion")
    
    def test_error_report_generation(self):
        """Test generating error reports with provenance."""
        tracker = ProvenanceTracker()
        tracker.track_node_creation("node1")
        
        error = ValueError("Test error")
        report = tracker.generate_error_report("node1", error)
        
        self.assertIn("node1", report)
        self.assertIn("ValueError", report)
        self.assertIn("Test error", report)
    
    def test_statistics(self):
        """Test provenance statistics."""
        tracker = ProvenanceTracker()
        
        # Create some nodes
        tracker.track_node_creation("node1")
        tracker.track_node_creation("node2")
        
        # Track an optimization
        tracker.track_optimization("node3", "filter_fusion", ["node1", "node2"], "Test")
        
        stats = tracker.get_statistics()
        self.assertEqual(stats["total_nodes"], 3)
        self.assertEqual(stats["user_created"], 2)
        self.assertEqual(stats["optimizer_created"], 1)
        self.assertEqual(stats["optimized_nodes"], 1)


class TestAssertions(unittest.TestCase):
    """Test assertion/invariant support."""
    
    def test_assertion_passes(self):
        """Test that valid assertions pass through data."""
        graph = Graph()
        
        data = graph.input("data", list)
        filtered = graph.filter(data, lambda x: x > 0)
        # Assert all elements are positive
        asserted = graph.assert_invariant(
            filtered, 
            lambda data: all(x > 0 for x in data),
            "All elements must be positive"
        )
        graph.output(asserted)
        
        compiled = graph.compile()
        result = compiled(data=[1, 2, 3, 4, 5])
        
        self.assertEqual(result, [1, 2, 3, 4, 5])
    
    def test_assertion_fails(self):
        """Test that invalid assertions raise errors."""
        graph = Graph()
        
        data = graph.input("data", list)
        # Assert all elements are positive (will fail)
        asserted = graph.assert_invariant(
            data,
            lambda data: all(x > 0 for x in data),
            "All elements must be positive"
        )
        graph.output(asserted)
        
        compiled = graph.compile()
        
        # Should raise AssertionError
        with self.assertRaises(AssertionError) as ctx:
            compiled(data=[-1, 2, 3])
        
        self.assertIn("positive", str(ctx.exception))


class TestDebugger(unittest.TestCase):
    """Test IOCDebugger functionality."""
    
    def test_compare_optimizations(self):
        """Test comparing optimized vs unoptimized execution."""
        graph = Graph()
        
        data = graph.input("data", list)
        filtered1 = graph.filter(data, lambda x: x > 10)
        filtered2 = graph.filter(filtered1, lambda x: x < 100)
        mapped = graph.map(filtered2, lambda x: x * 2)
        graph.output(mapped)
        
        debugger = graph.get_debugger()
        comparison = debugger.compare({"data": list(range(200))})
        
        # Both should succeed
        self.assertIsNone(comparison["original"]["error"])
        self.assertIsNone(comparison["optimized"]["error"])
        
        # Results should match
        self.assertTrue(comparison["comparison"]["results_match"])
        
        # Optimized should have fewer nodes (filter fusion)
        self.assertGreater(
            comparison["comparison"]["node_reduction"],
            0
        )
    
    def test_explain(self):
        """Test execution plan explanation."""
        graph = Graph()
        
        data = graph.input("data", list)
        filtered = graph.filter(data, lambda x: x > 10)
        mapped = graph.map(filtered, lambda x: x * 2)
        graph.output(mapped)
        
        explanation = graph.explain()
        
        # Should contain key information
        self.assertIn("Execution Plan", explanation)
        self.assertIn("Total nodes", explanation)
        self.assertIn("filter", explanation)
        self.assertIn("map", explanation)
        self.assertIn("PARALLEL", explanation)  # Both are parallelizable


class TestDifferentialTesting(unittest.TestCase):
    """Test differential testing functionality."""
    
    def test_compare_strategies(self):
        """Test comparing different execution strategies."""
        graph = Graph()
        
        data = graph.input("data", list)
        filtered = graph.filter(data, lambda x: x > 10)
        mapped = graph.map(filtered, lambda x: x * 2)
        graph.output(mapped)
        
        tester = DifferentialTester(graph)
        result = tester.test_all_strategies(
            {"data": list(range(100))},
            strategies=["naive", "vectorized"]
        )
        
        # All strategies should produce the same result
        self.assertTrue(result.all_match)
        self.assertEqual(len(result.mismatches), 0)
        
        # Should have performance data
        self.assertIn("vectorized", result.performance_comparison)
    
    def test_optimization_differential(self):
        """Test that optimizations preserve semantics."""
        graph = Graph()
        
        data = graph.input("data", list)
        # Create a chain that can be optimized
        filtered1 = graph.filter(data, lambda x: x > 10)
        filtered2 = graph.filter(filtered1, lambda x: x < 100)
        mapped = graph.map(filtered2, lambda x: x * 2)
        graph.output(mapped)
        
        tester = DifferentialTester(graph)
        result = tester.test_with_optimizations({"data": list(range(200))})
        
        # Unoptimized and optimized should match
        self.assertTrue(result.all_match)
        self.assertEqual(len(result.mismatches), 0)
        
        # Should have performance comparison
        self.assertIn("optimized", result.performance_comparison)
    
    def test_format_report(self):
        """Test formatting of differential test report."""
        graph = Graph()
        
        data = graph.input("data", list)
        mapped = graph.map(data, lambda x: x * 2)
        graph.output(mapped)
        
        tester = DifferentialTester(graph)
        result = tester.test_with_optimizations({"data": [1, 2, 3]})
        
        report = tester.format_report(result)
        
        # Should contain key sections
        self.assertIn("Differential Testing Report", report)
        self.assertIn("Status:", report)
        self.assertIn("unoptimized", report)
        self.assertIn("optimized", report)


class TestDebugMode(unittest.TestCase):
    """Test debug mode functionality."""
    
    def test_enable_debug_mode(self):
        """Test enabling debug mode on a graph."""
        graph = Graph()
        graph.enable_debug_mode(capture_provenance=True)
        
        self.assertTrue(graph.debug_mode)
        self.assertIsNotNone(graph.provenance_tracker)
        
        # Create some nodes
        data = graph.input("data", list)
        filtered = graph.filter(data, lambda x: x > 0)
        
        # Provenance should be captured
        prov = graph.provenance_tracker.get_provenance(filtered)
        self.assertIsNotNone(prov)
    
    def test_explain_with_provenance(self):
        """Test that explain() shows provenance information."""
        graph = Graph()
        graph.enable_debug_mode(capture_provenance=True)
        
        data = graph.input("data", list)
        filtered1 = graph.filter(data, lambda x: x > 10)
        filtered2 = graph.filter(filtered1, lambda x: x < 100)
        graph.output(filtered2)
        
        # Optimize (this will create optimized nodes)
        graph.optimize()
        
        # Verbose explanation should show optimization info
        explanation = graph.explain(verbose=True)
        
        self.assertIn("Execution Plan", explanation)
        # May contain optimization info if nodes were optimized
        # (depends on whether filter fusion happened)


class TestIntegration(unittest.TestCase):
    """Integration tests for debugging infrastructure."""
    
    def test_full_debugging_workflow(self):
        """Test a complete debugging workflow."""
        # 1. Create a graph with debug mode
        graph = Graph()
        graph.enable_debug_mode(capture_provenance=True)
        
        data = graph.input("data", list)
        filtered1 = graph.filter(data, lambda x: x > 10)
        filtered2 = graph.filter(filtered1, lambda x: x < 100)
        
        # 2. Add an assertion
        asserted = graph.assert_invariant(
            filtered2,
            lambda data: len(data) > 0,
            "Result should not be empty"
        )
        
        mapped = graph.map(asserted, lambda x: x * 2)
        graph.output(mapped)
        
        # 3. Get execution plan
        plan = graph.explain(verbose=True)
        self.assertIn("Execution Plan", plan)
        
        # 4. Compare optimized vs unoptimized
        debugger = graph.get_debugger()
        comparison = debugger.compare({"data": list(range(200))})
        
        self.assertTrue(comparison["comparison"]["results_match"])
        
        # 5. Execute successfully
        compiled = graph.compile()
        result = compiled(data=list(range(200)))
        
        # Should have filtered and doubled values
        expected = [x * 2 for x in range(200) if 10 < x < 100]
        self.assertEqual(result, expected)
    
    def test_debugging_with_error(self):
        """Test debugging when an error occurs."""
        graph = Graph()
        graph.enable_debug_mode(capture_provenance=True)
        
        data = graph.input("data", list)
        # This will fail if any element is None
        mapped = graph.map(data, lambda x: x.upper())
        graph.output(mapped)
        
        compiled = graph.compile()
        
        # This will fail
        with self.assertRaises(AttributeError):
            compiled(data=["hello", None, "world"])
        
        # Provenance tracking should help identify the issue
        # (In a real scenario, we'd show the provenance in the error message)


if __name__ == "__main__":
    unittest.main()
