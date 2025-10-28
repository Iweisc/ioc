# Interactive demo of IOC capabilities

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from core.graph import Graph


def demo_basic():
    print("\nDemo 1: Filter and Map")
    
    g = Graph()
    nums = g.input("numbers", list)
    filtered = g.filter(nums, lambda x: x > 10)
    doubled = g.map(filtered, lambda x: x * 2)
    g.output(doubled)
    
    fn = g.compile(optimize_for="speed")
    result = fn(numbers=[1, 5, 12, 8, 20, 15, 3])
    
    print("Generated code:")
    print(fn._ioc_code)
    print(f"Result: {result}")


def demo_pipeline():
    print("\nDemo 2: Data Pipeline")
    
    orders = [25.99, 89.50, 120.00, 45.00, 200.00, 35.50, 150.00]
    
    g = Graph()
    orders_in = g.input("orders", list)
    bulk_orders = g.filter(orders_in, lambda x: x > 50)
    discounted = g.map(bulk_orders, lambda x: x * 0.85)
    total = g.reduce(discounted, lambda a, b: a + b, 0.0)
    g.output(total)
    
    pipeline = g.compile(optimize_for="speed")
    revenue = pipeline(orders=orders)
    
    print(g.visualize())
    print(f"Revenue: ${revenue:.2f}")


def demo_optimization():
    print("\nDemo 3: Optimization Modes")
    
    g = Graph()
    data = g.input("data", list)
    filtered = g.filter(data, lambda x: x % 2 == 0)
    mapped = g.map(filtered, lambda x: x ** 2)
    g.output(mapped)
    
    test_data = list(range(20))
    
    speed_fn = g.compile(optimize_for="speed")
    print("Speed optimization:")
    print(speed_fn._ioc_code)
    print(f"Result: {speed_fn(data=test_data)}")
    
    memory_fn = g.compile(optimize_for="memory")
    print("\nMemory optimization:")
    print(memory_fn._ioc_code)
    print(f"Result: {memory_fn(data=test_data)}")


def demo_graph_features():
    print("\nDemo 4: Graph Introspection")
    
    g = Graph()
    x = g.input("x", list)
    y = g.map(x, lambda n: n + 1)
    z = g.map(y, lambda n: n * 2)
    g.output(z)
    
    print(g.visualize())
    print(f"\nNodes: {len(g.nodes)}")
    print(f"Outputs: {len(g.outputs)}")


def main():
    print("IOC Demo")
    
    try:
        demo_basic()
        input("\nPress Enter for Demo 2...")
        
        demo_pipeline()
        input("\nPress Enter for Demo 3...")
        
        demo_optimization()
        input("\nPress Enter for Demo 4...")
        
        demo_graph_features()
        
        print("\nDemo complete")
        
    except KeyboardInterrupt:
        print("\nDemo interrupted")


if __name__ == "__main__":
    main()
