# Example 4: Phase 2 Features Demo
# Demonstrates new intent types and graph optimizations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from core.graph import Graph
from core.optimizer import GraphOptimizer


def demo_sort_and_distinct():
    # Demonstrate sort and distinct operations
    print("\nDemo 1: Sort and Distinct")
    
    data = [42, 17, 23, 42, 8, 17, 99, 8, 23]
    print(f"Input: {data}")
    
    g = Graph()
    numbers = g.input("numbers", list)
    sorted_nums = g.sort(numbers)
    unique = g.distinct(sorted_nums)
    g.output(unique)
    
    fn = g.compile()
    result = fn(numbers=data)
    
    print(f"Sorted & Unique: {result}")
    print("\nGenerated code:")
    print(fn._ioc_code)


def demo_group_by():
    # Demonstrate grouping data
    print("\nDemo 2: Group By")
    
    students = [
        ("Alice", 90),
        ("Bob", 85),
        ("Charlie", 90),
        ("David", 85),
        ("Eve", 95)
    ]
    
    print("Students:", students)
    
    g = Graph()
    data = g.input("students", list)
    # Group by score
    grouped = g.group_by(data, key=lambda x: x[1])
    g.output(grouped)
    
    fn = g.compile()
    result = fn(students=students)
    
    print("\nGrouped by score:")
    for score, group in sorted(result.items()):
        print(f"  Score {score}: {[name for name, _ in group]}")


def demo_join():
    # Demonstrate joining two datasets
    print("\nDemo 3: Join")
    
    users = [("user1", "Alice"), ("user2", "Bob"), ("user3", "Charlie")]
    orders = [("user1", "Book"), ("user2", "Pen"), ("user1", "Notebook")]
    
    print(f"Users: {users}")
    print(f"Orders: {orders}")
    
    g = Graph()
    users_in = g.input("users", list)
    orders_in = g.input("orders", list)
    # Join on user_id
    joined = g.join(users_in, orders_in, on=lambda u, o: u[0] == o[0])
    g.output(joined)
    
    fn = g.compile()
    result = fn(users=users, orders=orders)
    
    print("\nJoined (user, order):")
    for user, order in result:
        print(f"  {user[1]} ordered {order[1]}")


def demo_flatten():
    # Demonstrate flattening nested lists
    print("\nDemo 4: Flatten")
    
    nested = [[1, 2], [3, 4, 5], [6]]
    print(f"Nested: {nested}")
    
    g = Graph()
    data = g.input("nested", list)
    flat = g.flatten(data)
    g.output(flat)
    
    fn = g.compile()
    result = fn(nested=nested)
    
    print(f"Flattened: {result}")


def demo_complex_pipeline():
    # Demonstrate a complex pipeline with new intents
    print("\nDemo 5: Complex Data Pipeline")
    
    # Process e-commerce data
    transactions = [
        ("Alice", 150, "electronics"),
        ("Bob", 45, "books"),
        ("Alice", 89, "books"),
        ("Charlie", 200, "electronics"),
        ("Bob", 120, "electronics"),
        ("Alice", 30, "books"),
    ]
    
    print("Transactions:", transactions[:3], "...")
    
    g = Graph()
    data = g.input("transactions", list)
    
    # Filter high-value transactions
    high_value = g.filter(data, lambda x: x[1] > 50)
    
    # Group by category
    by_category = g.group_by(high_value, key=lambda x: x[2])
    
    g.output(by_category)
    
    print("\nGraph before optimization:")
    print(g.visualize())
    
    fn = g.compile()
    result = fn(transactions=transactions)
    
    print("\nHigh-value transactions by category:")
    for category, trans in result.items():
        total = sum(t[1] for t in trans)
        print(f"  {category}: ${total} from {len(trans)} transactions")


def demo_optimization():
    # Demonstrate graph optimizations
    print("\nDemo 6: Graph Optimization")
    
    g = Graph()
    data = g.input("data", list)
    
    # Inefficient: multiple filters and maps
    f1 = g.filter(data, lambda x: x > 0)
    f2 = g.filter(f1, lambda x: x < 100)
    m1 = g.map(f2, lambda x: x * 2)
    m2 = g.map(m1, lambda x: x + 10)
    
    # Add some dead code
    dead1 = g.filter(data, lambda x: x < -1000)
    dead2 = g.map(dead1, lambda x: x * 999)
    
    g.output(m2)
    
    print(f"Nodes before optimization: {len(g.nodes)}")
    
    # Create optimizer and show report
    optimizer = GraphOptimizer(g)
    optimizer.optimize()
    
    print(f"Nodes after optimization: {len(g.nodes)}")
    print("\n" + optimizer.get_optimization_report())
    
    # Verify it still works
    fn = g.compile(auto_optimize=False)  # Already optimized
    result = fn(data=[5, 50, 150, -10])
    expected = [20, 110]  # (5 and 50 pass filters) → *2 + 10
    
    print(f"\nResult: {result}")
    print(f"Expected: {expected}")
    assert result == expected, "Optimization changed behavior!"
    print("Optimization preserved correctness")


def main():
    print("\nIOC Phase 2 Features Demo")
    
    try:
        demo_sort_and_distinct()
        input("\nPress Enter to continue...")
        
        demo_group_by()
        input("\nPress Enter to continue...")
        
        demo_join()
        input("\nPress Enter to continue...")
        
        demo_flatten()
        input("\nPress Enter to continue...")
        
        demo_complex_pipeline()
        input("\nPress Enter to continue...")
        
        demo_optimization()
        
        print("\nDemo complete")
    except KeyboardInterrupt:
        print("\nDemo interrupted")


if __name__ == "__main__":
    main()
