# Intent Graph - Core data structure for IOC

from typing import Any, Dict, List, Optional, Callable, Set
from dataclasses import dataclass, field
from enum import Enum
import uuid

from .types import IOCType, AnyType, infer_type


class IntentType(Enum):
    INPUT = "input"
    OUTPUT = "output"
    FILTER = "filter"
    MAP = "map"
    REDUCE = "reduce"
    COMPOSE = "compose"
    PARALLEL = "parallel"
    CONSTANT = "constant"


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
    
    def _generate_id(self, prefix: str = "node") -> str:
        return f"{prefix}_{uuid.uuid4().hex[:8]}"
    
    def _add_node(self, node: IntentNode) -> str:
        self.nodes[node.id] = node
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
    
    def compile(self, optimize_for: str = "speed"):
        # Compile graph into executable code
        from solvers.kernel import SolverKernel
        
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
