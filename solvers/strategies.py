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
        
        elif node.intent_type == IntentType.SORT:
            input_id = node.inputs[0]
            key_func = node.params.get("key")
            reverse = node.params.get("reverse", False)
            
            if key_func:
                key_name = f"key_{node.id}"
                context.variables[key_name] = key_func
                return f"{node.id} = sorted({input_id}, key={key_name}, reverse={reverse})"
            else:
                return f"{node.id} = sorted({input_id}, reverse={reverse})"
        
        elif node.intent_type == IntentType.GROUP_BY:
            input_id = node.inputs[0]
            key_name = f"key_{node.id}"
            context.variables[key_name] = node.params["key"]
            
            return f"""{node.id} = {{}}
for _item in {input_id}:
    _key = {key_name}(_item)
    if _key not in {node.id}:
        {node.id}[_key] = []
    {node.id}[_key].append(_item)"""
        
        elif node.intent_type == IntentType.JOIN:
            left_id, right_id = node.inputs
            on_name = f"on_{node.id}"
            context.variables[on_name] = node.params["on"]
            
            return f"""{node.id} = []
for _left in {left_id}:
    for _right in {right_id}:
        if {on_name}(_left, _right):
            {node.id}.append((_left, _right))"""
        
        elif node.intent_type == IntentType.FLATTEN:
            input_id = node.inputs[0]
            return f"""{node.id} = []
for _sublist in {input_id}:
    for _item in _sublist:
        {node.id}.append(_item)"""
        
        elif node.intent_type == IntentType.DISTINCT:
            input_id = node.inputs[0]
            return f"""{node.id} = []
_seen = set()
for _item in {input_id}:
    if _item not in _seen:
        _seen.add(_item)
        {node.id}.append(_item)"""
        
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
        return intent_type in ["filter", "map", "reduce", "input", "output", "constant",
                               "sort", "group_by", "join", "flatten", "distinct"]
    
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
        
        elif node.intent_type == IntentType.SORT:
            input_id = node.inputs[0]
            key_func = node.params.get("key")
            reverse = node.params.get("reverse", False)
            
            if key_func:
                key_name = f"key_{node.id}"
                context.variables[key_name] = key_func
                return f"{node.id} = sorted({input_id}, key={key_name}, reverse={reverse})"
            else:
                return f"{node.id} = sorted({input_id}, reverse={reverse})"
        
        elif node.intent_type == IntentType.GROUP_BY:
            input_id = node.inputs[0]
            key_name = f"key_{node.id}"
            context.variables[key_name] = node.params["key"]
            
            # Use itertools.groupby (more efficient)
            context.variables["_itertools_groupby"] = __import__("itertools").groupby
            return f"{node.id} = {{k: list(g) for k, g in _itertools_groupby(sorted({input_id}, key={key_name}), key={key_name})}}"
        
        elif node.intent_type == IntentType.JOIN:
            left_id, right_id = node.inputs
            on_name = f"on_{node.id}"
            context.variables[on_name] = node.params["on"]
            
            # List comprehension for better performance
            return f"{node.id} = [(_l, _r) for _l in {left_id} for _r in {right_id} if {on_name}(_l, _r)]"
        
        elif node.intent_type == IntentType.FLATTEN:
            input_id = node.inputs[0]
            # Use itertools.chain.from_iterable (fastest way)
            context.variables["_itertools_chain"] = __import__("itertools").chain
            return f"{node.id} = list(_itertools_chain.from_iterable({input_id}))"
        
        elif node.intent_type == IntentType.DISTINCT:
            input_id = node.inputs[0]
            # Use dict.fromkeys to preserve order (Python 3.7+)
            return f"{node.id} = list(dict.fromkeys({input_id}))"
        
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
