# Benchmark suite to populate the cost model with real performance data

import time
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from core.graph import Graph
from solvers.profiler import get_profiler


def benchmark_filter(sizes=[10, 100, 1000, 10000]):
    # Benchmark filter operation with different data sizes
    print("Benchmarking filter...")
    
    for size in sizes:
        # Create test data
        data = list(range(size))
        
        # Build graph
        g = Graph()
        input_node = g.input("data", list)
        filtered = g.filter(input_node, lambda x: x % 2 == 0)
        g.output(filtered)
        
        # Compile and run multiple times for accurate measurement
        fn = g.compile(optimize_for="speed")
        
        # Warm up
        fn(data=data)
        
        # Measure
        times = []
        for _ in range(10):
            start = time.perf_counter()
            result = fn(data=data)
            end = time.perf_counter()
            times.append((end - start) * 1000)
        
        avg_time = sum(times) / len(times)
        print(f"  size={size:6}: {avg_time:.3f}ms (result size: {len(result)})")


def benchmark_map(sizes=[10, 100, 1000, 10000]):
    # Benchmark map operation with different data sizes
    print("\nBenchmarking map...")
    
    for size in sizes:
        data = list(range(size))
        
        g = Graph()
        input_node = g.input("data", list)
        mapped = g.map(input_node, lambda x: x * 2)
        g.output(mapped)
        
        fn = g.compile(optimize_for="speed")
        fn(data=data)  # Warm up
        
        times = []
        for _ in range(10):
            start = time.perf_counter()
            result = fn(data=data)
            end = time.perf_counter()
            times.append((end - start) * 1000)
        
        avg_time = sum(times) / len(times)
        print(f"  size={size:6}: {avg_time:.3f}ms")


def benchmark_reduce(sizes=[10, 100, 1000, 10000]):
    # Benchmark reduce operation with different data sizes
    print("\nBenchmarking reduce...")
    
    for size in sizes:
        data = list(range(1, size + 1))
        
        g = Graph()
        input_node = g.input("data", list)
        reduced = g.reduce(input_node, lambda a, b: a + b, initial=0)
        g.output(reduced)
        
        fn = g.compile(optimize_for="speed")
        fn(data=data)  # Warm up
        
        times = []
        for _ in range(10):
            start = time.perf_counter()
            result = fn(data=data)
            end = time.perf_counter()
            times.append((end - start) * 1000)
        
        avg_time = sum(times) / len(times)
        print(f"  size={size:6}: {avg_time:.3f}ms (result: {result})")


def benchmark_sort(sizes=[10, 100, 1000, 10000]):
    # Benchmark sort operation with different data sizes
    print("\nBenchmarking sort...")
    
    for size in sizes:
        import random
        data = list(range(size))
        random.shuffle(data)
        
        g = Graph()
        input_node = g.input("data", list)
        sorted_node = g.sort(input_node)
        g.output(sorted_node)
        
        fn = g.compile(optimize_for="speed")
        fn(data=data)  # Warm up
        
        times = []
        for _ in range(10):
            test_data = data.copy()
            random.shuffle(test_data)
            start = time.perf_counter()
            result = fn(data=test_data)
            end = time.perf_counter()
            times.append((end - start) * 1000)
        
        avg_time = sum(times) / len(times)
        print(f"  size={size:6}: {avg_time:.3f}ms")


def benchmark_group_by(sizes=[10, 100, 1000, 5000]):
    # Benchmark group_by operation with different data sizes
    print("\nBenchmarking group_by...")
    
    for size in sizes:
        data = [{"id": i, "category": i % 10} for i in range(size)]
        
        g = Graph()
        input_node = g.input("data", list)
        grouped = g.group_by(input_node, lambda x: x["category"])
        g.output(grouped)
        
        fn = g.compile(optimize_for="speed")
        fn(data=data)  # Warm up
        
        times = []
        for _ in range(10):
            start = time.perf_counter()
            result = fn(data=data)
            end = time.perf_counter()
            times.append((end - start) * 1000)
        
        avg_time = sum(times) / len(times)
        print(f"  size={size:6}: {avg_time:.3f}ms (groups: {len(result)})")


def benchmark_flatten(sizes=[10, 100, 1000, 5000]):
    # Benchmark flatten operation with different data sizes
    print("\nBenchmarking flatten...")
    
    for size in sizes:
        # Create nested lists
        data = [[i, i+1] for i in range(0, size, 2)]
        
        g = Graph()
        input_node = g.input("data", list)
        flattened = g.flatten(input_node)
        g.output(flattened)
        
        fn = g.compile(optimize_for="speed")
        fn(data=data)  # Warm up
        
        times = []
        for _ in range(10):
            start = time.perf_counter()
            result = fn(data=data)
            end = time.perf_counter()
            times.append((end - start) * 1000)
        
        avg_time = sum(times) / len(times)
        print(f"  size={size:6}: {avg_time:.3f}ms (result size: {len(result)})")


def benchmark_distinct(sizes=[10, 100, 1000, 5000]):
    # Benchmark distinct operation with different data sizes
    print("\nBenchmarking distinct...")
    
    for size in sizes:
        # Create data with duplicates
        data = [i % (size // 2) for i in range(size)]
        
        g = Graph()
        input_node = g.input("data", list)
        distinct_node = g.distinct(input_node)
        g.output(distinct_node)
        
        fn = g.compile(optimize_for="speed")
        fn(data=data)  # Warm up
        
        times = []
        for _ in range(10):
            start = time.perf_counter()
            result = fn(data=data)
            end = time.perf_counter()
            times.append((end - start) * 1000)
        
        avg_time = sum(times) / len(times)
        print(f"  size={size:6}: {avg_time:.3f}ms (distinct: {len(result)})")


def main():
    print("IOC Performance Benchmarking Suite")
    print("=" * 60)
    print("Populating cost model with real performance measurements...")
    print()
    
    # Run all benchmarks
    benchmark_filter()
    benchmark_map()
    benchmark_reduce()
    benchmark_sort()
    benchmark_group_by()
    benchmark_flatten()
    benchmark_distinct()
    
    # Show profiler report
    profiler = get_profiler()
    print("\n" + "=" * 60)
    print(profiler.get_report())
    print("\nProfile data saved to .ioc_profile.json")


if __name__ == "__main__":
    main()
