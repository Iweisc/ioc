# Intent Graph - Core data structure for IOC

from typing import Any, Dict, List, Optional, Callable, Set
from dataclasses import dataclass, field
from enum import Enum
import uuid

from .types import IOCType, AnyType, infer_type


# Global provenance tracker (optional)
_global_provenance_tracker = None

def enable_provenance_tracking():
    """Enable global provenance tracking for all graphs."""
    global _global_provenance_tracker
    from .provenance import ProvenanceTracker
    _global_provenance_tracker = ProvenanceTracker()
    return _global_provenance_tracker

def get_provenance_tracker():
    """Get the global provenance tracker if enabled."""
    return _global_provenance_tracker


class IntentType(Enum):
    INPUT = "input"
    OUTPUT = "output"
    FILTER = "filter"
    MAP = "map"
    REDUCE = "reduce"
    COMPOSE = "compose"
    PARALLEL = "parallel"
    CONSTANT = "constant"
    SORT = "sort"
    GROUP_BY = "group_by"
    JOIN = "join"
    FLATTEN = "flatten"
    DISTINCT = "distinct"
    ASSERT = "assert"  # Runtime assertion


@dataclass
class IntentNode:
    # Represents a semantic goal in the intent graph
    id: str
    intent_type: IntentType
    inputs: List[str] = field(default_factory=list)
    params: Dict[str, Any] = field(default_factory=dict)
    output_type: IOCType = field(default_factory=AnyType)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def __repr__(self) -> str:
        return f"IntentNode({self.intent_type.value}, id={self.id[:8]}...)"


class Graph:
    # Represents a program as a DAG of intents
    
    def __init__(self):
        self.nodes: Dict[str, IntentNode] = {}
        self.outputs: List[str] = []
        self._node_counter = 0
        self.provenance_tracker = None  # Optional provenance tracking
        self.debug_mode = False
    
    def _generate_id(self, prefix: str = "node") -> str:
        return f"{prefix}_{uuid.uuid4().hex[:8]}"
    
    def _add_node(self, node: IntentNode) -> str:
        self.nodes[node.id] = node
        
        # Track provenance if enabled
        tracker = self.provenance_tracker or get_provenance_tracker()
        if tracker:
            tracker.track_node_creation(node.id, capture_stack=self.debug_mode)
        
        return node.id
    
    def input(self, name: str, type_hint: Any = None) -> str:
        # Define an input parameter for the graph
        if isinstance(type_hint, IOCType):
            output_type = type_hint
        elif type_hint is list:
            from .types import ListType
            output_type = ListType()
        elif type_hint is int:
            from .types import IntType
            output_type = IntType()
        elif type_hint is float:
            from .types import FloatType
            output_type = FloatType()
        elif type_hint is bool:
            from .types import BoolType
            output_type = BoolType()
        else:
            output_type = AnyType()
        
        node = IntentNode(
            id=self._generate_id("input"),
            intent_type=IntentType.INPUT,
            params={"name": name},
            output_type=output_type
        )
        return self._add_node(node)
    
    def constant(self, value: Any) -> str:
        # Create a constant value node
        node = IntentNode(
            id=self._generate_id("const"),
            intent_type=IntentType.CONSTANT,
            params={"value": value},
            output_type=infer_type(value)
        )
        return self._add_node(node)
    
    def filter(self, input_node: str, predicate: Callable[[Any], bool]) -> str:
        # Keep elements where predicate returns True
        input_type = self.nodes[input_node].output_type
        
        node = IntentNode(
            id=self._generate_id("filter"),
            intent_type=IntentType.FILTER,
            inputs=[input_node],
            params={"predicate": predicate},
            output_type=input_type,  # Filter preserves input type
            metadata={"parallelizable": True}
        )
        return self._add_node(node)
    
    def map(self, input_node: str, transform: Callable[[Any], Any]) -> str:
        # Transform each element using a function
        from .types import ListType
        
        # Try to infer output type (simplified)
        node = IntentNode(
            id=self._generate_id("map"),
            intent_type=IntentType.MAP,
            inputs=[input_node],
            params={"transform": transform},
            output_type=ListType(AnyType()),  # Could be smarter
            metadata={"parallelizable": True, "vectorizable": True}
        )
        return self._add_node(node)
    
    def reduce(self, input_node: str, operation: Callable[[Any, Any], Any], 
               initial: Any = None) -> str:
        # Combine all elements into a single value
        node = IntentNode(
            id=self._generate_id("reduce"),
            intent_type=IntentType.REDUCE,
            inputs=[input_node],
            params={"operation": operation, "initial": initial},
            output_type=AnyType(),  # Depends on operation
            metadata={"parallelizable": False}  # Sequential by default
        )
        return self._add_node(node)
    
    def sort(self, input_node: str, key: Optional[Callable[[Any], Any]] = None, 
             reverse: bool = False) -> str:
        # Sort elements in ascending or descending order
        input_type = self.nodes[input_node].output_type
        
        node = IntentNode(
            id=self._generate_id("sort"),
            intent_type=IntentType.SORT,
            inputs=[input_node],
            params={"key": key, "reverse": reverse},
            output_type=input_type,  # Sort preserves type
            metadata={"parallelizable": False}  # Sorting is inherently sequential
        )
        return self._add_node(node)
    
    def group_by(self, input_node: str, key: Callable[[Any], Any]) -> str:
        # Group elements by a key function, returns dict of groups
        from .types import ListType
        
        node = IntentNode(
            id=self._generate_id("group"),
            intent_type=IntentType.GROUP_BY,
            inputs=[input_node],
            params={"key": key},
            output_type=AnyType(),  # Returns dict[key, list]
            metadata={"parallelizable": True}
        )
        return self._add_node(node)
    
    def join(self, left_node: str, right_node: str, 
             on: Callable[[Any, Any], bool]) -> str:
        # Join two sequences based on a condition
        from .types import ListType
        
        node = IntentNode(
            id=self._generate_id("join"),
            intent_type=IntentType.JOIN,
            inputs=[left_node, right_node],
            params={"on": on},
            output_type=ListType(AnyType()),  # Returns list of tuples
            metadata={"parallelizable": True}
        )
        return self._add_node(node)
    
    def flatten(self, input_node: str) -> str:
        # Flatten nested lists into a single list
        from .types import ListType
        
        node = IntentNode(
            id=self._generate_id("flatten"),
            intent_type=IntentType.FLATTEN,
            inputs=[input_node],
            params={},
            output_type=ListType(AnyType()),
            metadata={"parallelizable": True}
        )
        return self._add_node(node)
    
    def distinct(self, input_node: str) -> str:
        # Remove duplicate elements
        input_type = self.nodes[input_node].output_type
        
        node = IntentNode(
            id=self._generate_id("distinct"),
            intent_type=IntentType.DISTINCT,
            inputs=[input_node],
            params={},
            output_type=input_type,
            metadata={"parallelizable": False}  # Need to track seen elements
        )
        return self._add_node(node)
    
    def assert_invariant(self, input_node: str, predicate: Callable[[Any], bool],
                        message: str = "Assertion failed") -> str:
        """
        Add a runtime assertion that validates data.
        The predicate should return True if the data is valid.
        
        Args:
            input_node: Node to validate
            predicate: Function that checks the invariant
            message: Error message if assertion fails
        
        Returns:
            Node ID (passes through input unchanged if assertion passes)
        """
        input_type = self.nodes[input_node].output_type
        
        node = IntentNode(
            id=self._generate_id("assert"),
            intent_type=IntentType.ASSERT,
            inputs=[input_node],
            params={"predicate": predicate, "message": message},
            output_type=input_type,  # Pass-through
            metadata={"parallelizable": False}
        )
        return self._add_node(node)
    
    def output(self, node: str) -> None:
        # Mark a node as output
        if node not in self.nodes:
            raise ValueError(f"Node {node} not found in graph")
        self.outputs.append(node)
    
    def get_execution_order(self) -> List[str]:
        # Topologically sort nodes for execution
        visited: Set[str] = set()
        order: List[str] = []
        
        def visit(node_id: str):
            if node_id in visited:
                return
            visited.add(node_id)
            
            node = self.nodes[node_id]
            for input_id in node.inputs:
                visit(input_id)
            
            order.append(node_id)
        
        # Start from outputs and work backwards
        for output_id in self.outputs:
            visit(output_id)
        
        return order
    
    def optimize(self, passes: List[str] = None):
        """
        Apply optimization passes to the graph.
        Returns self for method chaining.
        """
        from .optimizer import GraphOptimizer
        
        optimizer = GraphOptimizer(self)
        optimizer.optimize(passes)
        return self
    
    def compile(self, optimize_for: str = "speed", auto_optimize: bool = True):
        """
        Compile graph into executable code.
        
        Args:
            optimize_for: Optimization target ("speed", "memory", "balanced")
            auto_optimize: Automatically apply graph optimizations before compilation
        """
        from solvers.kernel import SolverKernel
        
        # Apply graph optimizations if requested
        if auto_optimize:
            self.optimize()
        
        kernel = SolverKernel(self)
        return kernel.compile(optimize_for=optimize_for)
    
    def visualize(self) -> str:
        # Generate text visualization of graph
        lines = ["Intent Graph:"]
        lines.append("=" * 50)
        
        exec_order = self.get_execution_order()
        
        for node_id in exec_order:
            node = self.nodes[node_id]
            indent = "  " * len(node.inputs)
            
            lines.append(f"{indent}[{node.id[:8]}] {node.intent_type.value}")
            
            if node.inputs:
                lines.append(f"{indent}  inputs: {[i[:8] for i in node.inputs]}")
            
            if node.params:
                params_str = ", ".join(
                    f"{k}={v}" if not callable(v) else f"{k}=<fn>"
                    for k, v in node.params.items()
                )
                lines.append(f"{indent}  params: {params_str}")
            
            lines.append(f"{indent}  type: {node.output_type}")
            lines.append("")
        
        if self.outputs:
            lines.append(f"Outputs: {[o[:8] for o in self.outputs]}")
        
        return "\n".join(lines)
    
    def explain(self, verbose: bool = False) -> str:
        """
        Generate an execution plan explanation.
        Shows what will be executed and how.
        
        Args:
            verbose: Include detailed node information
        
        Returns:
            Human-readable execution plan
        """
        lines = ["Execution Plan:"]
        lines.append("=" * 60)
        
        exec_order = self.get_execution_order()
        
        lines.append(f"Total nodes: {len(self.nodes)}")
        lines.append(f"Execution order: {len(exec_order)} steps")
        lines.append("")
        
        # Analyze parallelizability
        parallel_nodes = [
            nid for nid in exec_order
            if self.nodes[nid].metadata.get("parallelizable", False)
        ]
        
        if parallel_nodes:
            lines.append(f"Parallelizable operations: {len(parallel_nodes)}/{len(exec_order)}")
            lines.append("")
        
        # Show execution steps
        lines.append("Execution Steps:")
        for i, node_id in enumerate(exec_order, 1):
            node = self.nodes[node_id]
            
            parallel = " [PARALLEL]" if node.metadata.get("parallelizable") else ""
            vectorizable = " [VECTORIZABLE]" if node.metadata.get("vectorizable") else ""
            
            lines.append(f"{i}. {node.intent_type.value}{parallel}{vectorizable}")
            lines.append(f"   Node: {node_id[:8]}...")
            
            if verbose:
                if node.inputs:
                    lines.append(f"   Inputs: {[i[:8] + '...' for i in node.inputs]}")
                lines.append(f"   Output type: {node.output_type}")
                
                # Show provenance if available
                tracker = self.provenance_tracker or get_provenance_tracker()
                if tracker:
                    prov = tracker.get_provenance(node_id)
                    if prov and prov.is_optimized():
                        lines.append(f"   Optimized: Yes ({len(prov.transformations)} transformations)")
            
            lines.append("")
        
        return "\n".join(lines)
    
    def enable_debug_mode(self, capture_provenance: bool = True):
        """
        Enable debug mode with enhanced error reporting.
        
        Args:
            capture_provenance: Whether to capture source locations (adds overhead)
        """
        self.debug_mode = True
        
        if capture_provenance:
            from .provenance import ProvenanceTracker
            self.provenance_tracker = ProvenanceTracker()
    
    def get_debugger(self):
        """
        Get a debugger instance for this graph.
        
        Returns:
            IOCDebugger instance
        """
        from .debugger import IOCDebugger
        return IOCDebugger(self, self.provenance_tracker)
