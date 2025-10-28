# Profiling-based cost model for better strategy selection

import time
import json
from pathlib import Path
from typing import Dict, Tuple, Any
from dataclasses import dataclass, asdict


@dataclass
class ProfileRecord:
    # Records performance of a strategy for a specific intent
    intent_type: str
    strategy_name: str
    input_size: int
    execution_time_ms: float
    sample_count: int = 1
    
    def update(self, new_time_ms: float):
        # Update with new measurement (exponential moving average)
        alpha = 0.3  # Weight for new measurement
        self.execution_time_ms = (alpha * new_time_ms + 
                                   (1 - alpha) * self.execution_time_ms)
        self.sample_count += 1


class PerformanceProfiler:
    # Collects and analyzes performance data to improve cost estimates.
    
    def __init__(self, profile_file: str = ".ioc_profile.json"):
        self.profile_file = Path(profile_file)
        self.profiles: Dict[Tuple[str, str, int], ProfileRecord] = {}
        self.load_profiles()
    
    def load_profiles(self):
        # Load existing profile data
        if not self.profile_file.exists():
            return
        
        try:
            with open(self.profile_file, 'r') as f:
                data = json.load(f)
                for record_dict in data:
                    record = ProfileRecord(**record_dict)
                    key = (record.intent_type, record.strategy_name, record.input_size)
                    self.profiles[key] = record
        except (json.JSONDecodeError, IOError):
            # If file is corrupted, start fresh
            pass
    
    def save_profiles(self):
        # Save profile data to disk
        data = [asdict(record) for record in self.profiles.values()]
        try:
            with open(self.profile_file, 'w') as f:
                json.dump(data, f, indent=2)
        except IOError:
            pass  # Fail silently if can't save
    
    def record_execution(self, intent_type: str, strategy_name: str, 
                        input_size: int, execution_time_ms: float):
        # Record a single execution measurement
        # Round input size to nearest bucket for better generalization
        size_bucket = self._bucket_size(input_size)
        key = (intent_type, strategy_name, size_bucket)
        
        if key in self.profiles:
            self.profiles[key].update(execution_time_ms)
        else:
            self.profiles[key] = ProfileRecord(
                intent_type=intent_type,
                strategy_name=strategy_name,
                input_size=size_bucket,
                execution_time_ms=execution_time_ms
            )
    
    def get_cost_estimate(self, intent_type: str, strategy_name: str, 
                         input_size: int) -> float:
        # Get cost estimate based on historical data
        size_bucket = self._bucket_size(input_size)
        key = (intent_type, strategy_name, size_bucket)
        
        if key in self.profiles:
            # Use actual measured time
            return self.profiles[key].execution_time_ms
        
        # Fallback: look for similar sizes
        similar = self._find_similar_profile(intent_type, strategy_name, size_bucket)
        if similar:
            # Scale based on size difference
            scale = input_size / similar.input_size
            return similar.execution_time_ms * scale
        
        # No data available, return default estimate
        return self._default_cost_estimate(intent_type, input_size)
    
    def profile_strategy(self, strategy, node, input_data: Any) -> float:
        # Execute a strategy and measure its performance.
        # Returns execution time in milliseconds.
        from solvers.strategies import ExecutionContext
        
        # Generate code
        context = ExecutionContext(variables={}, node_results={})
        code = strategy.generate_code(node, context)
        
        # Prepare execution environment
        exec_globals = context.variables.copy()
        exec_locals = {}
        
        # Create input variable
        input_name = node.inputs[0] if node.inputs else "data"
        exec_locals[input_name] = input_data
        
        # Compile code
        full_code = f"""
result = None
{code}
result = {node.id}
"""
        
        try:
            # Measure execution time
            start = time.perf_counter()
            exec(full_code, exec_globals, exec_locals)
            end = time.perf_counter()
            
            execution_time_ms = (end - start) * 1000
            
            # Record the measurement
            input_size = len(input_data) if hasattr(input_data, '__len__') else 1
            self.record_execution(
                node.intent_type.value,
                strategy.__class__.__name__,
                input_size,
                execution_time_ms
            )
            
            return execution_time_ms
        except Exception:
            # If execution fails, return high cost
            return float('inf')
    
    def _bucket_size(self, size: int) -> int:
        # Round size to nearest bucket for better generalization
        if size < 10:
            return size
        elif size < 100:
            return (size // 10) * 10
        elif size < 1000:
            return (size // 100) * 100
        else:
            return (size // 1000) * 1000
    
    def _find_similar_profile(self, intent_type: str, strategy_name: str, 
                             size: int) -> ProfileRecord:
        # Find profile with similar size
        candidates = [
            record for key, record in self.profiles.items()
            if key[0] == intent_type and key[1] == strategy_name
        ]
        
        if not candidates:
            return None
        
        # Return closest size
        return min(candidates, key=lambda r: abs(r.input_size - size))
    
    def _default_cost_estimate(self, intent_type: str, input_size: int) -> float:
        # Fallback cost estimate when no profiling data available
        # Simple heuristic based on intent type
        base_cost = {
            "filter": 1.0,
            "map": 1.0,
            "reduce": 1.5,
            "sort": 2.0,
            "group_by": 2.0,
            "join": 3.0,
            "flatten": 0.5,
            "distinct": 1.5,
        }.get(intent_type, 1.0)
        
        return base_cost * input_size
    
    def get_report(self) -> str:
        # Generate a performance report
        if not self.profiles:
            return "No profiling data available"
        
        lines = ["Performance Profile:", "=" * 60]
        
        # Group by intent type
        by_intent: Dict[str, list] = {}
        for record in self.profiles.values():
            if record.intent_type not in by_intent:
                by_intent[record.intent_type] = []
            by_intent[record.intent_type].append(record)
        
        for intent_type, records in sorted(by_intent.items()):
            lines.append(f"\n{intent_type}:")
            for record in sorted(records, key=lambda r: (r.input_size, r.strategy_name)):
                lines.append(
                    f"  {record.strategy_name:20} size={record.input_size:6} "
                    f"time={record.execution_time_ms:8.3f}ms samples={record.sample_count}"
                )
        
        return "\n".join(lines)


# Global profiler instance
_profiler = None


def get_profiler() -> PerformanceProfiler:
    # Get the global profiler instance
    global _profiler
    if _profiler is None:
        _profiler = PerformanceProfiler()
    return _profiler
