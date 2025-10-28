# Example 1: Basic filter and map operations

import sys
from pathlib import Path

# Add parent directory to path

from core.graph import Graph


def main():
    print("Example 1: Filter and Map")
    
    arr = [5, 15, 8, 20, 12, 3, 18]
    result = []
    for i in range(len(arr)):
        if arr[i] > 10:
            result.append(arr[i] * 2)
    
    print(f"Traditional result: {result}")
    
    g = Graph()
    data = g.input("arr", list)
    filtered = g.filter(data, lambda x: x > 10)
    mapped = g.map(filtered, lambda x: x * 2)
    g.output(mapped)
    
    print("\nIntent graph:")
    print(g.visualize())
    
    fast_fn = g.compile(optimize_for="speed")
    print("Generated code (speed):")
    print(fast_fn._ioc_code)
    
    ioc_result = fast_fn(arr=[5, 15, 8, 20, 12, 3, 18])
    print(f"IOC result: {ioc_result}")
    
    assert result == ioc_result
    print("Results match")
    
    memory_fn = g.compile(optimize_for="memory")
    print("\nGenerated code (memory):")
    print(memory_fn._ioc_code)
    
    memory_result = memory_fn(arr=[5, 15, 8, 20, 12, 3, 18])
    print(f"Memory result: {memory_result}")


if __name__ == "__main__":
    main()
