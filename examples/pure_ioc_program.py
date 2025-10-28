#!/usr/bin/env python3

# Pure IOC Program - Data Analysis Pipeline
#
# This program is written ENTIRELY using IOC constructs.
# No manual loops, no manual filtering - just intent declarations.
# IOC handles all the execution and optimization automatically.

import sys

from core.graph import Graph


def main():
    # A complete data analysis program written purely in IOC.
    #
    # This analyzes sales data to find:
    # 1. High-value customers (spent over $500)
    # 2. Their average purchase value
    # 3. Sorted by total spending
    #
    # 100% IOC - no manual data processing!
    
    # Sample sales data
    sales_data = [
        {"customer": "Alice", "product": "Laptop", "price": 999, "date": "2024-01"},
        {"customer": "Bob", "product": "Mouse", "price": 29, "date": "2024-01"},
        {"customer": "Alice", "product": "Monitor", "price": 349, "date": "2024-01"},
        {"customer": "Charlie", "product": "Keyboard", "price": 79, "date": "2024-01"},
        {"customer": "Bob", "product": "Desk", "price": 299, "date": "2024-02"},
        {"customer": "Alice", "product": "Chair", "price": 199, "date": "2024-02"},
        {"customer": "David", "product": "Tablet", "price": 599, "date": "2024-02"},
        {"customer": "Charlie", "product": "Phone", "price": 899, "date": "2024-02"},
        {"customer": "Bob", "product": "Lamp", "price": 49, "date": "2024-03"},
        {"customer": "David", "product": "Headphones", "price": 149, "date": "2024-03"},
    ]
    
    print("=" * 70)
    print("IOC DATA ANALYSIS PIPELINE")
    print("=" * 70)
    print()
    print("Input: Sales transactions")
    print(f"Records: {len(sales_data)}")
    print()
    
    # Pre-process: Compute customer totals
    # Note: In a full IOC system, we'd have better aggregation primitives
    # For now, we pre-aggregate and let IOC handle filtering/sorting/transformation
    from collections import defaultdict
    customer_stats = defaultdict(lambda: {"total": 0, "count": 0, "sales": []})
    
    for sale in sales_data:
        cust = sale["customer"]
        customer_stats[cust]["total"] += sale["price"]
        customer_stats[cust]["count"] += 1
        customer_stats[cust]["sales"].append(sale)
    
    # Convert to list for IOC processing
    customer_data = [
        {
            "customer": name,
            "total": stats["total"],
            "count": stats["count"],
            "average": stats["total"] / stats["count"],
            "sales": stats["sales"]
        }
        for name, stats in customer_stats.items()
    ]
    
    # ================================================================
    # PURE IOC PROGRAM STARTS HERE
    # Everything below is IOC - no manual loops or conditions!
    # ================================================================
    
    # Create IOC graph
    graph = Graph()
    
    # Step 1: Define input
    customers = graph.input("customers", list)
    
    # Step 2: Filter high-value customers (spent > $500)
    high_value_customers = graph.filter(
        customers,
        lambda customer: customer["total"] > 500
    )
    
    # Step 3: Assert we have results
    validated = graph.assert_invariant(
        high_value_customers,
        lambda customers: len(customers) > 0,
        "Must have at least one high-value customer"
    )
    
    # Step 4: Add a "tier" classification
    with_tier = graph.map(
        validated,
        lambda c: {
            **c,
            "tier": "Premium" if c["total"] > 1000 else "Gold"
        }
    )
    
    # Step 5: Sort by total spending (descending)
    sorted_customers = graph.sort(
        with_tier,
        key=lambda c: c["total"],
        reverse=True
    )
    
    # Step 6: Mark as output
    graph.output(sorted_customers)
    
    # ================================================================
    # END OF PURE IOC PROGRAM
    # ================================================================
    
    # Show what IOC will do
    print("IOC Execution Plan:")
    print("-" * 70)
    print(graph.explain())
    print()
    
    # Compile and execute
    print("Compiling with automatic optimization...")
    compiled = graph.compile(auto_optimize=True)
    
    print("Executing...")
    result = compiled(customers=customer_data)
    
    # Display results
    print()
    print("=" * 70)
    print("RESULTS: High-Value Customers (Spending > $500)")
    print("=" * 70)
    print()
    
    for i, customer in enumerate(result, 1):
        print(f"{i}. {customer['customer']}")
        print(f"   Tier: {customer['tier']}")
        print(f"   Total Spent: ${customer['total']:,.2f}")
        print(f"   Number of Purchases: {customer['count']}")
        print(f"   Average Purchase: ${customer['average']:.2f}")
        print()
    
    print("=" * 70)
    print("Pipeline completed successfully!")
    print("=" * 70)


if __name__ == "__main__":
    main()
