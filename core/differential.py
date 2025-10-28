# Differential Testing - Compare different execution strategies

from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass, field
import time
import copy

from .graph import Graph


@dataclass
class ExecutionResult:
    """Result of executing a graph with a specific configuration."""
    strategy_name: str
    result: Any
    execution_time: float
    node_count: int
    error: Optional[Exception] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def succeeded(self) -> bool:
        return self.error is None


@dataclass
class DifferentialTestResult:
    """Result of comparing multiple executions."""
    executions: List[ExecutionResult]
    baseline_name: str
    all_match: bool
    mismatches: List[tuple[str, str]] = field(default_factory=list)
    performance_comparison: Dict[str, float] = field(default_factory=dict)
    
    def get_fastest(self) -> Optional[ExecutionResult]:
        """Get the fastest successful execution."""
        successful = [e for e in self.executions if e.succeeded()]
        if not successful:
            return None
        return min(successful, key=lambda e: e.execution_time)
    
    def get_baseline(self) -> Optional[ExecutionResult]:
        """Get the baseline execution result."""
        for exec_result in self.executions:
            if exec_result.strategy_name == self.baseline_name:
                return exec_result
        return None


class DifferentialTester:
    """
    Performs differential testing to ensure optimizations preserve semantics.
    """
    
    def __init__(self, graph: Graph):
        self.graph = graph
    
    def test_all_strategies(self, data: Dict[str, Any], 
                           strategies: Optional[List[str]] = None) -> DifferentialTestResult:
        """
        Test the graph with multiple execution strategies.
        
        Args:
            data: Input data for the graph
            strategies: List of strategy names to test (defaults to all available)
        
        Returns:
            DifferentialTestResult with comparison data
        """
        if strategies is None:
            strategies = ["naive", "vectorized"]
        
        executions = []
        baseline_name = "naive"  # Naive is our reference implementation
        
        # Execute with each strategy
        for strategy_name in strategies:
            result = self._execute_with_strategy(strategy_name, data)
            executions.append(result)
        
        # Compare results
        baseline = next((e for e in executions if e.strategy_name == baseline_name), None)
        if not baseline:
            raise ValueError(f"Baseline strategy '{baseline_name}' not found")
        
        all_match = True
        mismatches = []
        
        for exec_result in executions:
            if exec_result.strategy_name == baseline_name:
                continue
            
            # Compare results
            if exec_result.succeeded() and baseline.succeeded():
                if not self._results_equal(baseline.result, exec_result.result):
                    all_match = False
                    mismatches.append((baseline_name, exec_result.strategy_name))
            elif exec_result.succeeded() != baseline.succeeded():
                all_match = False
                mismatches.append((baseline_name, exec_result.strategy_name))
        
        # Calculate performance comparison
        performance = {}
        if baseline.succeeded() and baseline.execution_time > 0:
            for exec_result in executions:
                if exec_result.succeeded():
                    speedup = baseline.execution_time / exec_result.execution_time
                    performance[exec_result.strategy_name] = speedup
        
        return DifferentialTestResult(
            executions=executions,
            baseline_name=baseline_name,
            all_match=all_match,
            mismatches=mismatches,
            performance_comparison=performance
        )
    
    def test_with_optimizations(self, data: Dict[str, Any],
                               optimization_passes: Optional[List[str]] = None) -> DifferentialTestResult:
        """
        Compare execution with and without optimizations.
        
        Args:
            data: Input data for the graph
            optimization_passes: Specific optimization passes to test
        
        Returns:
            DifferentialTestResult comparing optimized vs unoptimized
        """
        executions = []
        
        # Execute without optimization
        original_graph = copy.deepcopy(self.graph)
        result = self._execute_graph(original_graph, data, "unoptimized")
        executions.append(result)
        
        # Execute with optimization
        optimized_graph = copy.deepcopy(self.graph)
        if optimization_passes:
            optimized_graph.optimize(passes=optimization_passes)
        else:
            optimized_graph.optimize()
        
        result = self._execute_graph(optimized_graph, data, "optimized")
        executions.append(result)
        
        # Compare
        baseline = executions[0]  # unoptimized is baseline
        optimized = executions[1]
        
        all_match = True
        mismatches = []
        
        if baseline.succeeded() and optimized.succeeded():
            if not self._results_equal(baseline.result, optimized.result):
                all_match = False
                mismatches.append(("unoptimized", "optimized"))
        elif baseline.succeeded() != optimized.succeeded():
            all_match = False
            mismatches.append(("unoptimized", "optimized"))
        
        # Performance comparison
        performance = {}
        if baseline.succeeded() and baseline.execution_time > 0:
            if optimized.succeeded():
                speedup = baseline.execution_time / optimized.execution_time
                performance["optimized"] = speedup
        
        return DifferentialTestResult(
            executions=executions,
            baseline_name="unoptimized",
            all_match=all_match,
            mismatches=mismatches,
            performance_comparison=performance
        )
    
    def _execute_with_strategy(self, strategy_name: str, 
                              data: Dict[str, Any]) -> ExecutionResult:
        """Execute graph with a specific strategy."""
        # Note: For now, strategies are selected automatically by the kernel
        # This method compiles and executes normally
        # In the future, we could add strategy hints to kernel.compile()
        
        # Execute
        start = time.time()
        try:
            compiled = self.graph.compile(auto_optimize=False)
            data_copy = copy.deepcopy(data)
            result = compiled(**data_copy)
            execution_time = time.time() - start
            error = None
        except Exception as e:
            result = None
            execution_time = time.time() - start
            error = e
        
        return ExecutionResult(
            strategy_name=strategy_name,
            result=result,
            execution_time=execution_time,
            node_count=len(self.graph.nodes),
            error=error
        )
    
    def _execute_graph(self, graph: Graph, data: Dict[str, Any],
                      label: str) -> ExecutionResult:
        """Execute a graph and return result."""
        start = time.time()
        try:
            compiled = graph.compile(auto_optimize=False)
            data_copy = copy.deepcopy(data)
            result = compiled(**data_copy)
            execution_time = time.time() - start
            error = None
        except Exception as e:
            result = None
            execution_time = time.time() - start
            error = e
        
        return ExecutionResult(
            strategy_name=label,
            result=result,
            execution_time=execution_time,
            node_count=len(graph.nodes),
            error=error
        )
    
    def _results_equal(self, result1: Any, result2: Any) -> bool:
        """Compare two results for equality."""
        try:
            return result1 == result2
        except Exception:
            # If comparison fails, try string representation
            return str(result1) == str(result2)
    
    def format_report(self, test_result: DifferentialTestResult) -> str:
        """Format test result as human-readable report."""
        lines = ["Differential Testing Report:"]
        lines.append("=" * 60)
        
        # Overall status
        if test_result.all_match:
            lines.append("Status: PASS - All executions produced identical results")
        else:
            lines.append("Status: FAIL - Results differ between executions")
            lines.append(f"Mismatches: {test_result.mismatches}")
        
        lines.append("")
        
        # Execution details
        lines.append("Executions:")
        for exec_result in test_result.executions:
            status = "SUCCESS" if exec_result.succeeded() else "ERROR"
            lines.append(f"  [{status}] {exec_result.strategy_name}")
            lines.append(f"    Time: {exec_result.execution_time*1000:.2f}ms")
            lines.append(f"    Nodes: {exec_result.node_count}")
            
            if exec_result.error:
                lines.append(f"    Error: {exec_result.error}")
            else:
                # Show result preview
                result_str = str(exec_result.result)
                if len(result_str) > 100:
                    result_str = result_str[:97] + "..."
                lines.append(f"    Result: {result_str}")
        
        lines.append("")
        
        # Performance comparison
        if test_result.performance_comparison:
            lines.append("Performance Comparison (vs baseline):")
            for name, speedup in sorted(test_result.performance_comparison.items(),
                                       key=lambda x: x[1], reverse=True):
                lines.append(f"  {name}: {speedup:.2f}x")
        
        # Fastest
        fastest = test_result.get_fastest()
        if fastest:
            lines.append("")
            lines.append(f"Fastest: {fastest.strategy_name} ({fastest.execution_time*1000:.2f}ms)")
        
        return "\n".join(lines)


def create_test_suite(graph: Graph, test_cases: List[Dict[str, Any]]) -> List[DifferentialTestResult]:
    """
    Run differential tests on multiple test cases.
    
    Args:
        graph: The graph to test
        test_cases: List of input data dictionaries
    
    Returns:
        List of test results, one per test case
    """
    tester = DifferentialTester(graph)
    results = []
    
    for i, test_case in enumerate(test_cases):
        print(f"Running test case {i+1}/{len(test_cases)}...")
        result = tester.test_with_optimizations(test_case)
        results.append(result)
    
    return results
