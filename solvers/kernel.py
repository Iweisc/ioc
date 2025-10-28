# Solver Kernel - translates intent graphs into executable code

from typing import Dict, List, Any, Callable
import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from core.graph import Graph, IntentNode
from solvers.strategies import Strategy, NaiveStrategy, OptimizedStrategy, ExecutionContext


class SolverKernel:
    # Compiles intent graphs into optimized executable functions
    
    def __init__(self, graph: Graph):
        self.graph = graph
        self.strategies: List[Strategy] = [
            OptimizedStrategy(),
            NaiveStrategy(),
        ]
    
    def _select_strategy(self, node: IntentNode, 
                        optimize_for: str = "speed") -> Strategy:
        # Choose best strategy based on optimization goal
        intent_type_str = node.intent_type.value
        
        # Filter strategies that can handle this intent type
        capable_strategies = [
            s for s in self.strategies 
            if s.can_handle(intent_type_str)
        ]
        
        if not capable_strategies:
            raise ValueError(f"No strategy found for intent type: {intent_type_str}")
        
        # For speed optimization, pick the one with lowest cost estimate
        if optimize_for == "speed":
            # Estimate input sizes (simplified - assumes 1000 elements)
            input_sizes = [1000] * len(node.inputs)
            
            best_strategy = min(
                capable_strategies,
                key=lambda s: s.get_cost_estimate(node, input_sizes)
            )
            return best_strategy
        
        # For memory optimization, prefer naive (smaller code)
        elif optimize_for == "memory":
            return NaiveStrategy() if NaiveStrategy() in capable_strategies else capable_strategies[0]
        
        # Balanced: use optimized if available
        else:
            return capable_strategies[0]
    
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
    
    def compile(self, optimize_for: str = "speed") -> Callable:
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
        
        return compiled_fn
    
    def get_generated_code(self) -> str:
        # Return generated code for inspection
        if hasattr(self, "_generated_code"):
            return self._generated_code
        return "No code generated yet. Call compile() first."
