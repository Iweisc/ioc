# Intent-Oriented Computing (IOC)

import sys
from pathlib import Path

# Ensure the package can find its modules
sys.path.insert(0, str(Path(__file__).parent))

from core.graph import Graph, IntentNode, IntentType
from core.types import IOCType, ListType, IntType, FloatType, BoolType, AnyType
from solvers.kernel import SolverKernel

__version__ = "0.1.0"

__all__ = [
    'Graph',
    'IntentNode',
    'IntentType',
    'IOCType',
    'ListType',
    'IntType',
    'FloatType',
    'BoolType',
    'AnyType',
    'SolverKernel',
]
