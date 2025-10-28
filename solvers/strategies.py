# Strategy implementations - different execution approaches for intents

from abc import ABC, abstractmethod
from typing import Dict, Any, List
from dataclasses import dataclass


@dataclass
class ExecutionContext:
    variables: Dict[str, Any]
    node_results: Dict[str, Any]


class Strategy(ABC):
    # Base class for execution strategies
    
    @abstractmethod
    def can_handle(self, intent_type: str) -> bool:
        pass
    
    @abstractmethod
    def generate_code(self, node, context: ExecutionContext) -> str:
        pass
    
    @abstractmethod
    def get_cost_estimate(self, node, input_sizes: List[int]) -> float:
        # Returns relative cost (lower is better)
        pass


class NaiveStrategy(Strategy):
    # Simple loops - readable but not optimized
    
    def can_handle(self, intent_type: str) -> bool:
        return intent_type in ["filter", "map", "reduce", "input", "output", "constant"]
    
    def generate_code(self, node, context: ExecutionContext) -> str:
        from core.graph import IntentType
        
        if node.intent_type == IntentType.INPUT:
            name = node.params["name"]
            return f"{node.id} = {name}"
        
        elif node.intent_type == IntentType.CONSTANT:
            value = node.params["value"]
            return f"{node.id} = {repr(value)}"
        
        elif node.intent_type == IntentType.FILTER:
            input_id = node.inputs[0]
            pred_name = f"pred_{node.id}"
            context.variables[pred_name] = node.params["predicate"]
            
            return f"""{node.id} = []
for _item in {input_id}:
    if {pred_name}(_item):
        {node.id}.append(_item)"""
        
        elif node.intent_type == IntentType.MAP:
            input_id = node.inputs[0]
            transform_name = f"transform_{node.id}"
            context.variables[transform_name] = node.params["transform"]
            
            return f"""{node.id} = []
for _item in {input_id}:
    {node.id}.append({transform_name}(_item))"""
        
        elif node.intent_type == IntentType.REDUCE:
            input_id = node.inputs[0]
            op_name = f"op_{node.id}"
            context.variables[op_name] = node.params["operation"]
            initial = node.params.get("initial")
            
            if initial is not None:
                return f"""{node.id} = {repr(initial)}
for _item in {input_id}:
    {node.id} = {op_name}({node.id}, _item)"""
            else:
                return f"""_items = iter({input_id})
{node.id} = next(_items)
for _item in _items:
    {node.id} = {op_name}({node.id}, _item)"""
        
        else:
            raise NotImplementedError(f"Naive strategy doesn't support {node.intent_type}")
    
    def get_cost_estimate(self, node, input_sizes: List[int]) -> float:
        # Baseline cost
        from core.graph import IntentType
        
        if not input_sizes:
            return 1.0
        
        base_cost = input_sizes[0] if input_sizes else 1.0
        
        # Filter and map scale linearly
        if node.intent_type in [IntentType.FILTER, IntentType.MAP]:
            return base_cost * 1.0
        
        # Reduce is inherently sequential
        elif node.intent_type == IntentType.REDUCE:
            return base_cost * 1.5
        
        return 1.0


class OptimizedStrategy(Strategy):
    # Uses built-ins and comprehensions for better performance
    
    def can_handle(self, intent_type: str) -> bool:
        return intent_type in ["filter", "map", "reduce", "input", "output", "constant"]
    
    def generate_code(self, node, context: ExecutionContext) -> str:
        from core.graph import IntentType
        
        if node.intent_type == IntentType.INPUT:
            name = node.params["name"]
            return f"{node.id} = {name}"
        
        elif node.intent_type == IntentType.CONSTANT:
            value = node.params["value"]
            return f"{node.id} = {repr(value)}"
        
        elif node.intent_type == IntentType.FILTER:
            input_id = node.inputs[0]
            pred_name = f"pred_{node.id}"
            context.variables[pred_name] = node.params["predicate"]
            
            # Use list comprehension + filter built-in
            return f"{node.id} = list(filter({pred_name}, {input_id}))"
        
        elif node.intent_type == IntentType.MAP:
            input_id = node.inputs[0]
            transform_name = f"transform_{node.id}"
            context.variables[transform_name] = node.params["transform"]
            
            # Use list comprehension for better performance
            return f"{node.id} = [{transform_name}(_x) for _x in {input_id}]"
        
        elif node.intent_type == IntentType.REDUCE:
            input_id = node.inputs[0]
            op_name = f"op_{node.id}"
            context.variables[op_name] = node.params["operation"]
            initial = node.params.get("initial")
            
            # Use functools.reduce
            context.variables["_functools_reduce"] = __import__("functools").reduce
            
            if initial is not None:
                return f"{node.id} = _functools_reduce({op_name}, {input_id}, {repr(initial)})"
            else:
                return f"{node.id} = _functools_reduce({op_name}, {input_id})"
        
        else:
            raise NotImplementedError(f"Optimized strategy doesn't support {node.intent_type}")
    
    def get_cost_estimate(self, node, input_sizes: List[int]) -> float:
        # Lower cost due to optimized built-ins
        from core.graph import IntentType
        
        if not input_sizes:
            return 0.8
        
        base_cost = input_sizes[0] if input_sizes else 1.0
        
        # List comprehensions are ~2x faster than loops
        if node.intent_type in [IntentType.FILTER, IntentType.MAP]:
            return base_cost * 0.5
        
        # functools.reduce is optimized C code
        elif node.intent_type == IntentType.REDUCE:
            return base_cost * 0.8
        
        return 0.8


class VectorizedStrategy(Strategy):
    # Future: NumPy/SIMD for numerical operations
    
    def can_handle(self, intent_type: str) -> bool:
        # Placeholder for future implementation
        return False
    
    def generate_code(self, node, context: ExecutionContext) -> str:
        raise NotImplementedError("Vectorized strategy not yet implemented")
    
    def get_cost_estimate(self, node, input_sizes: List[int]) -> float:
        return 0.1 if input_sizes and input_sizes[0] > 1000 else float('inf')
