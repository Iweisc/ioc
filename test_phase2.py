# Phase 2 Test Suite - New Intent Types

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from core.graph import Graph


def test_sort_basic():
    """Test basic sorting"""
    print("Test: Sort (basic)")
    
    g = Graph()
    data = g.input("numbers", list)
    sorted_data = g.sort(data)
    g.output(sorted_data)
    
    fn = g.compile(optimize_for="speed")
    result = fn(numbers=[3, 1, 4, 1, 5, 9, 2, 6])
    expected = [1, 1, 2, 3, 4, 5, 6, 9]
    
    assert result == expected, f"Expected {expected}, got {result}"
    print("  Pass")


def test_sort_reverse():
    """Test reverse sorting"""
    print("Test: Sort (reverse)")
    
    g = Graph()
    data = g.input("numbers", list)
    sorted_data = g.sort(data, reverse=True)
    g.output(sorted_data)
    
    fn = g.compile(optimize_for="speed")
    result = fn(numbers=[3, 1, 4, 1, 5, 9, 2, 6])
    expected = [9, 6, 5, 4, 3, 2, 1, 1]
    
    assert result == expected, f"Expected {expected}, got {result}"
    print("  Pass")


def test_sort_with_key():
    """Test sorting with key function"""
    print("Test: Sort (with key)")
    
    g = Graph()
    data = g.input("words", list)
    sorted_data = g.sort(data, key=lambda x: len(x))
    g.output(sorted_data)
    
    fn = g.compile(optimize_for="speed")
    result = fn(words=["apple", "pie", "banana", "cat"])
    expected = ["pie", "cat", "apple", "banana"]
    
    assert result == expected, f"Expected {expected}, got {result}"
    print("  Pass")


def test_group_by():
    """Test group_by operation"""
    print("Test: Group by")
    
    g = Graph()
    data = g.input("numbers", list)
    grouped = g.group_by(data, key=lambda x: x % 2)
    g.output(grouped)
    
    fn = g.compile(optimize_for="speed")
    result = fn(numbers=[1, 2, 3, 4, 5, 6])
    
    # Should group odds and evens
    assert 0 in result and 1 in result
    assert set(result[0]) == {2, 4, 6}
    assert set(result[1]) == {1, 3, 5}
    print("  Pass")


def test_join():
    """Test join operation"""
    print("Test: Join")
    
    g = Graph()
    left = g.input("left", list)
    right = g.input("right", list)
    joined = g.join(left, right, on=lambda l, r: l == r)
    g.output(joined)
    
    fn = g.compile(optimize_for="speed")
    result = fn(left=[1, 2, 3], right=[2, 3, 4])
    expected = [(2, 2), (3, 3)]
    
    assert result == expected, f"Expected {expected}, got {result}"
    print("  Pass")


def test_flatten():
    """Test flatten operation"""
    print("Test: Flatten")
    
    g = Graph()
    data = g.input("nested", list)
    flattened = g.flatten(data)
    g.output(flattened)
    
    fn = g.compile(optimize_for="speed")
    result = fn(nested=[[1, 2], [3, 4], [5, 6]])
    expected = [1, 2, 3, 4, 5, 6]
    
    assert result == expected, f"Expected {expected}, got {result}"
    print("  Pass")


def test_distinct():
    """Test distinct operation"""
    print("Test: Distinct")
    
    g = Graph()
    data = g.input("numbers", list)
    unique = g.distinct(data)
    g.output(unique)
    
    fn = g.compile(optimize_for="speed")
    result = fn(numbers=[1, 2, 2, 3, 3, 3, 4])
    expected = [1, 2, 3, 4]
    
    assert result == expected, f"Expected {expected}, got {result}"
    print("  Pass")


def test_complex_pipeline():
    """Test complex pipeline with new intents"""
    print("Test: Complex pipeline")
    
    # Filter -> Sort -> Distinct
    g = Graph()
    data = g.input("numbers", list)
    filtered = g.filter(data, lambda x: x > 5)
    sorted_data = g.sort(filtered)
    unique = g.distinct(sorted_data)
    g.output(unique)
    
    fn = g.compile(optimize_for="speed")
    result = fn(numbers=[3, 7, 5, 9, 7, 12, 6, 9, 15])
    expected = [6, 7, 9, 12, 15]
    
    assert result == expected, f"Expected {expected}, got {result}"
    print("  Pass")


def test_map_flatten_chain():
    """Test map + flatten chain"""
    print("Test: Map + Flatten")
    
    g = Graph()
    data = g.input("numbers", list)
    # Map each number to [n, n*2]
    mapped = g.map(data, lambda x: [x, x*2])
    flattened = g.flatten(mapped)
    g.output(flattened)
    
    fn = g.compile(optimize_for="speed")
    result = fn(numbers=[1, 2, 3])
    expected = [1, 2, 2, 4, 3, 6]
    
    assert result == expected, f"Expected {expected}, got {result}"
    print("  Pass")


def main():
    print("Phase 2 Test Suite - New Intent Types")
    
    tests = [
        test_sort_basic,
        test_sort_reverse,
        test_sort_with_key,
        test_group_by,
        test_join,
        test_flatten,
        test_distinct,
        test_complex_pipeline,
        test_map_flatten_chain,
    ]
    
    passed = 0
    failed = 0
    
    for test in tests:
        try:
            test()
            passed += 1
        except Exception as e:
            print(f"  FAIL: {e}")
            failed += 1
    
    print(f"\nResults: {passed} passed, {failed} failed")


if __name__ == "__main__":
    main()
