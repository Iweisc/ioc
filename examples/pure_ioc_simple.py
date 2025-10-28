#!/usr/bin/env python3

"""
Pure IOC Program - Simple Data Processing

This program is written ENTIRELY using IOC - no manual loops or conditions!
Demonstrates what a program looks like when written in pure IOC.
"""

import sys
sys.path.insert(0, '.')

from core.graph import Graph


def main():
    print("=" * 70)
    print("PURE IOC PROGRAM: E-Commerce Order Analysis")
    print("=" * 70)
    print()
    
    # Input data: E-commerce orders
    orders = [
        {"id": 1, "customer": "Alice", "amount": 150, "status": "completed"},
        {"id": 2, "customer": "Bob", "amount": 45, "status": "pending"},
        {"id": 3, "customer": "Alice", "amount": 230, "status": "completed"},
        {"id": 4, "customer": "Charlie", "amount": 89, "status": "completed"},
        {"id": 5, "customer": "Bob", "amount": 120, "status": "completed"},
        {"id": 6, "customer": "Alice", "amount": 75, "status": "cancelled"},
        {"id": 7, "customer": "David", "amount": 310, "status": "completed"},
        {"id": 8, "customer": "Bob", "amount": 55, "status": "pending"},
        {"id": 9, "customer": "Charlie", "amount": 180, "status": "completed"},
        {"id": 10, "customer": "David", "amount": 95, "status": "completed"},
    ]
    
    print(f"Input: {len(orders)} orders")
    print()
    
    # ================================================================
    # PURE IOC PROGRAM
    # No loops, no if statements, just intent declarations!
    # ================================================================
    
    graph = Graph()
    
    # Step 1: Input
    all_orders = graph.input("orders", list)
    
    # Step 2: Filter only completed orders
    completed = graph.filter(
        all_orders,
        lambda order: order["status"] == "completed"
    )
    
    # Step 3: Assert we have data
    validated = graph.assert_invariant(
        completed,
        lambda orders: len(orders) > 0,
        "Must have at least one completed order"
    )
    
    # Step 4: Filter high-value orders (> $100)
    high_value = graph.filter(
        validated,
        lambda order: order["amount"] > 100
    )
    
    # Step 5: Apply discount (10% off)
    with_discount = graph.map(
        high_value,
        lambda order: {
            **order,
            "original": order["amount"],
            "discounted": order["amount"] * 0.9,
            "saved": order["amount"] * 0.1
        }
    )
    
    # Step 6: Sort by discount amount (descending)
    sorted_orders = graph.sort(
        with_discount,
        key=lambda order: order["saved"],
        reverse=True
    )
    
    # Step 7: Output
    graph.output(sorted_orders)
    
    # ================================================================
    # END OF PURE IOC PROGRAM
    # ================================================================
    
    # Show execution plan
    print("IOC Execution Plan:")
    print("-" * 70)
    print(graph.explain())
    print()
    
    # Compile and execute
    print("Compiling with automatic optimization...")
    compiled = graph.compile()
    
    print("Executing pure IOC program...")
    print()
    
    result = compiled(orders=orders)
    
    # Display results
    print("=" * 70)
    print("RESULTS: High-Value Completed Orders (>$100 with 10% discount)")
    print("=" * 70)
    print()
    
    total_saved = 0
    for i, order in enumerate(result, 1):
        print(f"{i}. Order #{order['id']} - {order['customer']}")
        print(f"   Original: ${order['original']:.2f}")
        print(f"   Discounted: ${order['discounted']:.2f}")
        print(f"   You Saved: ${order['saved']:.2f}")
        print()
        total_saved += order['saved']
    
    print("-" * 70)
    print(f"Total Savings: ${total_saved:.2f}")
    print("=" * 70)
    print()
    print("✓ Program completed - 100% IOC, 0% manual loops!")


if __name__ == "__main__":
    main()
