# Solver Kernel - translates intent graphs into executable code

from typing import Dict, List, Any, Callable, Optional
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.graph import Graph, IntentNode
from solvers.strategies import Strategy, NaiveStrategy, OptimizedStrategy, ExecutionContext
from solvers.profiler import PerformanceProfiler, get_profiler


class SolverKernel:
    # Compiles intent graphs into optimized executable functions
    
    def __init__(self, graph: Graph, profiler: Optional[PerformanceProfiler] = None):
        self.graph = graph
        self.strategies: List[Strategy] = [
            OptimizedStrategy(),
            NaiveStrategy(),
        ]
        # Use provided profiler or get global instance
        self.profiler = profiler if profiler is not None else get_profiler()
        # Cache for strategy decisions: (node_id, input_size) -> Strategy
        self._strategy_cache: Dict[tuple, Strategy] = {}
    
    def _estimate_input_size(self, node: IntentNode) -> int:
        # Estimate input size for a node by tracing back through the graph
        # This is a heuristic - in practice, we'd need runtime info
        if not node.inputs:
            return 1000  # Default for input nodes
        
        # For now, use a simple heuristic
        # TODO: Improve this by tracking size transformations through the graph
        return 1000
    
    def _select_strategy(self, node: IntentNode, 
                        optimize_for: str = "speed", 
                        input_size: Optional[int] = None) -> Strategy:
        # Choose best strategy based on optimization goal and profiler data
        intent_type_str = node.intent_type.value
        
        # Filter strategies that can handle this intent type
        capable_strategies = [
            s for s in self.strategies 
            if s.can_handle(intent_type_str)
        ]
        
        if not capable_strategies:
            raise ValueError(f"No strategy found for intent type: {intent_type_str}")
        
        # Estimate input size if not provided
        if input_size is None:
            input_size = self._estimate_input_size(node)
        
        # Check cache
        cache_key = (node.id, input_size, optimize_for)
        if cache_key in self._strategy_cache:
            return self._strategy_cache[cache_key]
        
        # For speed optimization, use profiler data to pick the best strategy
        if optimize_for == "speed":
            # Get cost estimates from profiler for each strategy
            strategy_costs = []
            for strategy in capable_strategies:
                strategy_name = strategy.__class__.__name__
                # Use profiler's cost estimate (uses historical data if available)
                cost = self.profiler.get_cost_estimate(
                    intent_type_str,
                    strategy_name,
                    input_size
                )
                strategy_costs.append((cost, strategy))
            
            # Pick strategy with lowest cost
            best_strategy = min(strategy_costs, key=lambda x: x[0])[1]
            
            # Cache the decision
            self._strategy_cache[cache_key] = best_strategy
            return best_strategy
        
        # For memory optimization, prefer naive (smaller code)
        elif optimize_for == "memory":
            naive = NaiveStrategy()
            strategy = naive if naive in capable_strategies else capable_strategies[0]
            self._strategy_cache[cache_key] = strategy
            return strategy
        
        # Balanced: use optimized if available
        else:
            strategy = capable_strategies[0]
            self._strategy_cache[cache_key] = strategy
            return strategy
    
    def _generate_code(self, optimize_for: str = "speed") -> tuple[str, ExecutionContext]:
        # Generate Python code from intent graph
        context = ExecutionContext(variables={}, node_results={})
        code_lines = []
        
        # Get topological execution order
        exec_order = self.graph.get_execution_order()
        
        # Generate code for each node
        for node_id in exec_order:
            node = self.graph.nodes[node_id]
            
            # Select strategy for this node
            strategy = self._select_strategy(node, optimize_for)
            
            # Generate code using the strategy
            node_code = strategy.generate_code(node, context)
            
            # Add comment for debugging
            code_lines.append(f"# {node.intent_type.value}: {node_id[:8]}")
            code_lines.append(node_code)
            code_lines.append("")
        
        # Return the output(s)
        if self.graph.outputs:
            if len(self.graph.outputs) == 1:
                code_lines.append(f"return {self.graph.outputs[0]}")
            else:
                outputs = ", ".join(self.graph.outputs)
                code_lines.append(f"return ({outputs})")
        
        code = "\n".join(code_lines)
        return code, context
    
    def compile(self, optimize_for: str = "speed", save_profile: bool = True) -> Callable:
        # Compile intent graph into executable function
        # Generate code
        code, context = self._generate_code(optimize_for)
        
        # Collect input parameter names
        input_nodes = [
            node for node in self.graph.nodes.values()
            if node.intent_type.value == "input"
        ]
        param_names = [node.params["name"] for node in input_nodes]
        
        # Build function signature
        func_def = f"def _ioc_compiled_fn({', '.join(param_names)}):"
        
        # Indent the body
        indented_code = "\n".join(f"    {line}" for line in code.split("\n"))
        
        full_code = f"{func_def}\n{indented_code}"
        
        # Store for debugging
        self._generated_code = full_code
        
        # Compile the code
        exec_globals = context.variables.copy()
        exec(full_code, exec_globals)
        
        compiled_fn = exec_globals["_ioc_compiled_fn"]
        
        # Attach metadata for debugging
        compiled_fn._ioc_code = full_code
        compiled_fn._ioc_graph = self.graph
        compiled_fn._ioc_optimize_for = optimize_for
        compiled_fn._ioc_kernel = self  # Reference back to kernel for profiling
        
        # Save profiler data
        if save_profile:
            self.profiler.save_profiles()
        
        return compiled_fn
    
    def get_generated_code(self) -> str:
        # Return generated code for inspection
        if hasattr(self, "_generated_code"):
            return self._generated_code
        return "No code generated yet. Call compile() first."
    
    def get_strategy_report(self) -> str:
        # Get a report of strategy decisions made
        if not self._strategy_cache:
            return "No strategy decisions cached yet"
        
        lines = ["Strategy Selection Report:", "=" * 60]
        
        # Group by node
        by_node: Dict[str, list] = {}
        for (node_id, size, opt_mode), strategy in self._strategy_cache.items():
            if node_id not in by_node:
                by_node[node_id] = []
            by_node[node_id].append((size, opt_mode, strategy))
        
        for node_id, decisions in sorted(by_node.items()):
            node = self.graph.nodes[node_id]
            lines.append(f"\n{node.intent_type.value} ({node_id[:8]}):")
            for size, opt_mode, strategy in decisions:
                lines.append(f"  size={size:6} opt={opt_mode:8} → {strategy.__class__.__name__}")
        
        return "\n".join(lines)
