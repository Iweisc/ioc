# Manually populate the cost model by profiling different strategies

import time
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from core.graph import Graph, IntentNode, IntentType
from core.types import ListType, IntType
from solvers.strategies import NaiveStrategy, OptimizedStrategy
from solvers.profiler import get_profiler


def profile_strategies_for_intent(intent_type_str, create_node_fn, test_data_fn, sizes):
    # Profile all strategies for a given intent type across different sizes
    print(f"\nProfiling {intent_type_str}...")
    
    profiler = get_profiler()
    strategies = [NaiveStrategy(), OptimizedStrategy()]
    
    for size in sizes:
        test_data = test_data_fn(size)
        
        # Create a simple graph with just input -> intent -> output
        g = Graph()
        input_id = g.input("data", list)
        
        # Create the intent node
        node = create_node_fn(g, input_id)
        
        for strategy in strategies:
            strategy_name = strategy.__class__.__name__
            
            if not strategy.can_handle(intent_type_str):
                continue
            
            # Compile with this specific strategy
            from solvers.kernel import SolverKernel
            from solvers.strategies import ExecutionContext
            
            # Generate code
            context = ExecutionContext(variables={}, node_results={})
            
            # Manually set input
            context.node_results[input_id] = test_data
            
            try:
                # Generate code for this node
                code = strategy.generate_code(g.nodes[node], context)
                
                # Prepare execution
                exec_globals = context.variables.copy()
                exec_globals[input_id] = test_data
                exec_locals = {}
                
                # Warm up
                exec(code, exec_globals, exec_locals)
                
                # Measure execution time
                times = []
                for _ in range(20):
                    start = time.perf_counter()
                    exec(code, exec_globals, exec_locals)
                    end = time.perf_counter()
                    times.append((end - start) * 1000)
                
                avg_time = sum(times) / len(times)
                
                # Record in profiler
                profiler.record_execution(intent_type_str, strategy_name, size, avg_time)
                
                print(f"  {strategy_name:20} size={size:6}: {avg_time:.4f}ms")
                
            except Exception as e:
                print(f"  {strategy_name:20} size={size:6}: FAILED ({e})")


def main():
    print("Populating IOC Cost Model")
    print("=" * 60)
    
    # Profile FILTER
    profile_strategies_for_intent(
        "filter",
        lambda g, input_id: g.filter(input_id, lambda x: x % 2 == 0),
        lambda size: list(range(size)),
        [10, 100, 1000, 10000]
    )
    
    # Profile MAP
    profile_strategies_for_intent(
        "map",
        lambda g, input_id: g.map(input_id, lambda x: x * 2),
        lambda size: list(range(size)),
        [10, 100, 1000, 10000]
    )
    
    # Profile REDUCE
    profile_strategies_for_intent(
        "reduce",
        lambda g, input_id: g.reduce(input_id, lambda a, b: a + b, initial=0),
        lambda size: list(range(size)),
        [10, 100, 1000, 10000]
    )
    
    # Profile SORT
    profile_strategies_for_intent(
        "sort",
        lambda g, input_id: g.sort(input_id),
        lambda size: list(reversed(range(size))),  # Worst case for sorting
        [10, 100, 1000, 10000]
    )
    
    # Profile GROUP_BY
    profile_strategies_for_intent(
        "group_by",
        lambda g, input_id: g.group_by(input_id, lambda x: x % 10),
        lambda size: list(range(size)),
        [10, 100, 1000, 5000]
    )
    
    # Profile FLATTEN
    profile_strategies_for_intent(
        "flatten",
        lambda g, input_id: g.flatten(input_id),
        lambda size: [[i, i+1] for i in range(0, size, 2)],
        [10, 100, 1000, 5000]
    )
    
    # Profile DISTINCT
    profile_strategies_for_intent(
        "distinct",
        lambda g, input_id: g.distinct(input_id),
        lambda size: [i % (size // 2) for i in range(size)],
        [10, 100, 1000, 5000]
    )
    
    # Save and display results
    profiler = get_profiler()
    profiler.save_profiles()
    
    print("\n" + "=" * 60)
    print(profiler.get_report())
    print("\nCost model saved to .ioc_profile.json")


if __name__ == "__main__":
    main()
