# Type system for IOC

from abc import ABC, abstractmethod
from typing import Any, Optional
from dataclasses import dataclass


class IOCType(ABC):
    # Base class for all IOC types
    
    @abstractmethod
    def matches(self, value: Any) -> bool:
        pass
    
    @abstractmethod
    def __str__(self) -> str:
        pass
    
    def __repr__(self) -> str:
        return str(self)


@dataclass
class AnyType(IOCType):
    
    def matches(self, value: Any) -> bool:
        return True
    
    def __str__(self) -> str:
        return "Any"


@dataclass
class IntType(IOCType):
    min_value: Optional[int] = None
    max_value: Optional[int] = None
    
    def matches(self, value: Any) -> bool:
        if not isinstance(value, int) or isinstance(value, bool):
            return False
        if self.min_value is not None and value < self.min_value:
            return False
        if self.max_value is not None and value > self.max_value:
            return False
        return True
    
    def __str__(self) -> str:
        constraints = []
        if self.min_value is not None:
            constraints.append(f">={self.min_value}")
        if self.max_value is not None:
            constraints.append(f"<={self.max_value}")
        if constraints:
            return f"Int[{', '.join(constraints)}]"
        return "Int"


@dataclass
class FloatType(IOCType):
    min_value: Optional[float] = None
    max_value: Optional[float] = None
    
    def matches(self, value: Any) -> bool:
        if not isinstance(value, (int, float)) or isinstance(value, bool):
            return False
        if self.min_value is not None and value < self.min_value:
            return False
        if self.max_value is not None and value > self.max_value:
            return False
        return True
    
    def __str__(self) -> str:
        constraints = []
        if self.min_value is not None:
            constraints.append(f">={self.min_value}")
        if self.max_value is not None:
            constraints.append(f"<={self.max_value}")
        if constraints:
            return f"Float[{', '.join(constraints)}]"
        return "Float"


@dataclass
class BoolType(IOCType):
    
    def matches(self, value: Any) -> bool:
        return isinstance(value, bool)
    
    def __str__(self) -> str:
        return "Bool"


@dataclass
class ListType(IOCType):
    element_type: IOCType = None
    min_length: Optional[int] = None
    max_length: Optional[int] = None
    
    def __post_init__(self):
        if self.element_type is None:
            self.element_type = AnyType()
    
    def matches(self, value: Any) -> bool:
        if not isinstance(value, list):
            return False
        if self.min_length is not None and len(value) < self.min_length:
            return False
        if self.max_length is not None and len(value) > self.max_length:
            return False
        return all(self.element_type.matches(item) for item in value)
    
    def __str__(self) -> str:
        constraints = []
        if self.min_length is not None:
            constraints.append(f"len>={self.min_length}")
        if self.max_length is not None:
            constraints.append(f"len<={self.max_length}")
        
        base = f"List[{self.element_type}]"
        if constraints:
            return f"{base}({', '.join(constraints)})"
        return base


def infer_type(value: Any) -> IOCType:
    # Infer IOC type from Python value
    if isinstance(value, bool):
        return BoolType()
    elif isinstance(value, int):
        return IntType()
    elif isinstance(value, float):
        return FloatType()
    elif isinstance(value, list):
        if not value:
            return ListType(AnyType())
        # Infer element type from first element (simple heuristic)
        elem_type = infer_type(value[0])
        return ListType(elem_type)
    else:
        return AnyType()
