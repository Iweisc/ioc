# Example 2: Complex data pipeline with reduce

import sys
from pathlib import Path


from core.graph import Graph


def main():
    print("Example 2: Sales Data Pipeline")
    
    sales = [45.0, 120.0, 89.0, 200.0, 150.0, 75.0, 180.0]
    print(f"Input: {sales}")
    
    g = Graph()
    sales_input = g.input("sales", list)
    high_value = g.filter(sales_input, lambda x: x > 100)
    discounted = g.map(high_value, lambda x: x * 0.9)
    total = g.reduce(discounted, lambda a, b: a + b, 0.0)
    g.output(total)
    
    print("\nIntent graph:")
    print(g.visualize())
    
    pipeline = g.compile(optimize_for="speed")
    print("Generated code:")
    print(pipeline._ioc_code)
    
    result = pipeline(sales=sales)
    print(f"\nResult: ${result:.2f}")
    
    manual_result = sum(x * 0.9 for x in sales if x > 100)
    print(f"Manual: ${manual_result:.2f}")
    print(f"Match: {abs(result - manual_result) < 0.01}")


if __name__ == "__main__":
    main()
