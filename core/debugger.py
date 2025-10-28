# IOC Debugger - Tools for debugging optimized execution

from typing import Any, Dict, List, Optional, Callable, Tuple
from dataclasses import dataclass
import time
import sys

from .graph import Graph, IntentNode, IntentType
from .provenance import ProvenanceTracker


@dataclass
class ExecutionTrace:
    """Record of a single node's execution."""
    node_id: str
    intent_type: IntentType
    inputs: List[Any]
    output: Any
    execution_time: float
    error: Optional[Exception] = None
    
    def __str__(self) -> str:
        status = "ERROR" if self.error else "OK"
        return f"[{status}] {self.node_id[:8]}... ({self.intent_type.value}) - {self.execution_time*1000:.2f}ms"


class DebugMode:
    """
    Debug mode configuration and runtime checks.
    When enabled, adds extensive validation and logging.
    """
    
    def __init__(self, enabled: bool = True):
        self.enabled = enabled
        self.trace_execution = False
        self.validate_invariants = True
        self.check_nan = True
        self.check_null = True
        self.verbose = False
        self.execution_traces: List[ExecutionTrace] = []
    
    def log(self, message: str):
        """Log a debug message if verbose mode is on."""
        if self.verbose:
            print(f"[DEBUG] {message}", file=sys.stderr)
    
    def record_execution(self, trace: ExecutionTrace):
        """Record an execution trace."""
        if self.trace_execution:
            self.execution_traces.append(trace)
            if self.verbose:
                print(f"[TRACE] {trace}", file=sys.stderr)
    
    def validate_output(self, node: IntentNode, output: Any) -> Optional[str]:
        """
        Validate node output for common issues.
        Returns error message if validation fails, None if OK.
        """
        if not self.enabled:
            return None
        
        errors = []
        
        # Check for None/null if not expected
        if self.check_null and output is None:
            errors.append(f"Node {node.id[:8]}... returned None")
        
        # Check for NaN in numeric data
        if self.check_nan:
            try:
                import math
                if isinstance(output, (int, float)) and math.isnan(output):
                    errors.append(f"Node {node.id[:8]}... returned NaN")
                elif isinstance(output, list):
                    for i, item in enumerate(output):
                        if isinstance(item, (int, float)) and math.isnan(item):
                            errors.append(f"Node {node.id[:8]}... returned NaN at index {i}")
                            break
            except (ImportError, TypeError):
                pass
        
        return "; ".join(errors) if errors else None
    
    def clear_traces(self):
        """Clear execution traces."""
        self.execution_traces.clear()
    
    def get_trace_summary(self) -> str:
        """Get summary of execution traces."""
        if not self.execution_traces:
            return "No execution traces recorded"
        
        lines = ["Execution Trace Summary:"]
        lines.append("=" * 60)
        
        total_time = sum(t.execution_time for t in self.execution_traces)
        errors = [t for t in self.execution_traces if t.error]
        
        lines.append(f"Total operations: {len(self.execution_traces)}")
        lines.append(f"Total time: {total_time*1000:.2f}ms")
        lines.append(f"Errors: {len(errors)}")
        lines.append("")
        
        lines.append("Trace:")
        for i, trace in enumerate(self.execution_traces, 1):
            lines.append(f"  {i}. {trace}")
            if trace.error:
                lines.append(f"      Error: {trace.error}")
        
        return "\n".join(lines)


class IOCDebugger:
    """
    Debugging utilities for IOC graphs.
    Provides trace, bisect, and compare operations.
    """
    
    def __init__(self, graph: Graph, provenance: Optional[ProvenanceTracker] = None):
        self.graph = graph
        self.provenance = provenance or ProvenanceTracker()
        self.debug_mode = DebugMode(enabled=True)
    
    def trace(self, data: Dict[str, Any], verbose: bool = False) -> List[ExecutionTrace]:
        """
        Execute the graph step-by-step and record each operation.
        
        Args:
            data: Input data for the graph
            verbose: Print trace information in real-time
        
        Returns:
            List of execution traces for each node
        """
        self.debug_mode.trace_execution = True
        self.debug_mode.verbose = verbose
        self.debug_mode.clear_traces()
        
        try:
            # Execute through kernel
            compiled = self.graph.compile(auto_optimize=False)
            compiled(**data)
        except Exception as e:
            print(f"Execution failed: {e}", file=sys.stderr)
        
        return self.debug_mode.execution_traces
    
    def bisect(self, data: Dict[str, Any], 
               expected_output: Any = None) -> Optional[str]:
        """
        Binary search for the node that causes incorrect output or error.
        
        Args:
            data: Input data for the graph
            expected_output: Expected final output (if known)
        
        Returns:
            Node ID of the problematic node, or None if all OK
        """
        execution_order = self.graph.get_execution_order()
        
        print(f"Bisecting {len(execution_order)} nodes...")
        
        # Try executing the full graph first
        try:
            compiled = self.graph.compile(auto_optimize=False)
            result = compiled(**data)
            if expected_output is not None and result != expected_output:
                print("Output mismatch detected. Bisecting...")
            else:
                print("Full execution succeeded.")
                return None
        except Exception as e:
            print(f"Full execution failed: {e}")
        
        # Binary search through execution order
        left, right = 0, len(execution_order) - 1
        problematic_node = None
        
        while left <= right:
            mid = (left + right) // 2
            
            # Create a subgraph with nodes up to mid
            partial_graph = Graph()
            partial_graph.nodes = {
                nid: node for nid, node in self.graph.nodes.items()
                if nid in execution_order[:mid + 1]
            }
            partial_graph.outputs = [execution_order[mid]]
            
            try:
                compiled_partial = partial_graph.compile(auto_optimize=False)
                compiled_partial(**data)
                # This portion works, problem is later
                left = mid + 1
            except Exception as e:
                # This portion fails, problem is here or earlier
                problematic_node = execution_order[mid]
                right = mid - 1
                print(f"  Node {problematic_node[:8]}... failed: {e}")
        
        return problematic_node
    
    def compare(self, data: Dict[str, Any], 
                optimized: bool = True) -> Dict[str, Any]:
        """
        Compare execution with and without optimizations.
        
        Args:
            data: Input data for the graph
            optimized: Whether to test with optimizations enabled
        
        Returns:
            Comparison report with results, timing, and any differences
        """
        import copy
        
        # Create two copies of the graph
        original_graph = copy.deepcopy(self.graph)
        optimized_graph = copy.deepcopy(self.graph)
        
        if optimized:
            optimized_graph.optimize()
        
        # Execute original
        start = time.time()
        try:
            compiled_original = original_graph.compile(auto_optimize=False)
            data_copy = copy.deepcopy(data)
            original_result = compiled_original(**data_copy)
            original_time = time.time() - start
            original_error = None
        except Exception as e:
            original_result = None
            original_time = time.time() - start
            original_error = e
        
        # Execute optimized
        start = time.time()
        try:
            compiled_optimized = optimized_graph.compile(auto_optimize=False)
            data_copy = copy.deepcopy(data)
            optimized_result = compiled_optimized(**data_copy)
            optimized_time = time.time() - start
            optimized_error = None
        except Exception as e:
            optimized_result = None
            optimized_time = time.time() - start
            optimized_error = e
        
        # Compare results
        results_match = original_result == optimized_result
        both_succeeded = original_error is None and optimized_error is None
        both_failed = original_error is not None and optimized_error is not None
        
        report = {
            "original": {
                "result": original_result,
                "time": original_time,
                "error": original_error,
                "node_count": len(original_graph.nodes)
            },
            "optimized": {
                "result": optimized_result,
                "time": optimized_time,
                "error": optimized_error,
                "node_count": len(optimized_graph.nodes)
            },
            "comparison": {
                "results_match": results_match,
                "both_succeeded": both_succeeded,
                "both_failed": both_failed,
                "speedup": original_time / optimized_time if optimized_time > 0 else float('inf'),
                "node_reduction": len(original_graph.nodes) - len(optimized_graph.nodes)
            }
        }
        
        return report
    
    def format_comparison(self, comparison: Dict[str, Any]) -> str:
        """Format comparison report as human-readable string."""
        lines = ["Comparison Report:"]
        lines.append("=" * 60)
        
        # Original execution
        lines.append("Original (unoptimized):")
        orig = comparison["original"]
        lines.append(f"  Time: {orig['time']*1000:.2f}ms")
        lines.append(f"  Nodes: {orig['node_count']}")
        if orig['error']:
            lines.append(f"  Error: {orig['error']}")
        else:
            lines.append(f"  Result: {orig['result']}")
        
        lines.append("")
        
        # Optimized execution
        lines.append("Optimized:")
        opt = comparison["optimized"]
        lines.append(f"  Time: {opt['time']*1000:.2f}ms")
        lines.append(f"  Nodes: {opt['node_count']}")
        if opt['error']:
            lines.append(f"  Error: {opt['error']}")
        else:
            lines.append(f"  Result: {opt['result']}")
        
        lines.append("")
        
        # Comparison
        comp = comparison["comparison"]
        lines.append("Comparison:")
        lines.append(f"  Results match: {comp['results_match']}")
        lines.append(f"  Speedup: {comp['speedup']:.2f}x")
        lines.append(f"  Node reduction: {comp['node_reduction']} nodes")
        
        if not comp['results_match']:
            lines.append("")
            lines.append("WARNING: Results differ! Optimization may have introduced a bug.")
        
        return "\n".join(lines)
    
    def explain_node(self, node_id: str) -> str:
        """
        Generate detailed explanation of a node including provenance.
        
        Args:
            node_id: ID of the node to explain
        
        Returns:
            Human-readable explanation
        """
        if node_id not in self.graph.nodes:
            return f"Node {node_id} not found in graph"
        
        node = self.graph.nodes[node_id]
        prov = self.provenance.get_provenance(node_id)
        
        lines = [f"Node: {node_id}"]
        lines.append("=" * 60)
        lines.append(f"Type: {node.intent_type.value}")
        lines.append(f"Inputs: {[i[:8] + '...' for i in node.inputs]}")
        lines.append(f"Parameters: {len(node.params)}")
        for key, value in node.params.items():
            if callable(value):
                lines.append(f"  {key}: <function>")
            else:
                lines.append(f"  {key}: {value}")
        
        lines.append(f"Output type: {node.output_type}")
        
        if prov:
            lines.append("")
            lines.append("Provenance:")
            lines.append(f"  Created by: {prov.created_by}")
            
            if prov.source_location:
                lines.append(f"  Source: {prov.source_location}")
            
            if prov.is_optimized():
                lines.append(f"  Optimized: Yes")
                lines.append(f"  Transformations: {len(prov.transformations)}")
                for trans in prov.transformations:
                    lines.append(f"    - {trans}")
            
            if prov.parent_nodes:
                lines.append(f"  Derived from: {[p[:8] + '...' for p in prov.parent_nodes]}")
        
        return "\n".join(lines)
