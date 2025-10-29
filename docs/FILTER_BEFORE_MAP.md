# Filter-Before-Map Optimization

## Overview

The filter-before-map optimization reorders `map -> filter` patterns to `filter -> map` when the filter predicate is independent of the map transformation. This reduces the number of elements that undergo expensive transformations.

## Implementation Strategy

### The Challenge

Given: `source -> map(f) -> filter(p)`  
Goal: `source -> filter(p') -> map(f)`

The key challenge is determining when this transformation is **safe** (semantically equivalent) and **beneficial** (improves performance).

### Our Solution: Runtime Independence Detection

We use **runtime testing** to detect predicate independence:

1. Generate diverse test datasets (numbers, strings, various values)
2. For each dataset, compare two execution paths:
   - Path A: `map(f)` then `filter(p)` 
   - Path B: `filter(p)` then `map(f)`
3. If both paths produce identical results, the predicate is independent
4. Only apply optimization if all tests pass

### Safety Checks

The optimizer includes multiple safety checks:

1. **Single consumer check**: Only reorder if map has exactly one consumer (the filter)
2. **Independence testing**: Multiple test datasets with diverse types
3. **Exception handling**: Gracefully handle predicates that fail on untransformed data

### When It Helps

This optimization is most beneficial when:

- **High filter selectivity**: Filter removes many elements (e.g., >90%)
- **Expensive transformations**: Map operation is computationally expensive
- **Downstream operations**: Additional operations benefit from smaller dataset

### Examples

#### Example 1: Independent (CAN optimize)

```python
# Original: map then filter
data.map(lambda x: x.upper()).filter(lambda x: len(x) > 3)

# Optimized: filter then map
data.filter(lambda x: len(x) > 3).map(lambda x: x.upper())

# Why it works: len(x) is the same before and after upper()
```

#### Example 2: Dependent (CANNOT optimize)

```python
# Original: map then filter
data.map(lambda x: x * 2).filter(lambda x: x > 10)

# Cannot optimize: predicate checks transformed value
# Original value 7 fails predicate, but transformed value 14 passes
```

## Implementation Details

### Core Function: `_is_predicate_independent`

Located in `core/optimizer.py:356-397`

```python
def _is_predicate_independent(self, transform, predicate) -> bool:
    # Test with multiple diverse datasets
    test_cases = [
        [1, 2, 3, ...],      # Numbers
        ["a", "ab", ...],     # Strings
        [0, 1, -1, ...]       # Edge cases
    ]
    
    for test_data in test_cases:
        # Method 1: map then filter
        result1 = [m for m in [transform(x) for x in test_data] if predicate(m)]
        
        # Method 2: filter then map
        result2 = [transform(x) for x in test_data if predicate(x)]
        
        if result1 != result2:
            return False  # Not independent
    
    return True  # All tests passed
```

### Main Optimization: `_filter_before_map`

Located in `core/optimizer.py:286-355`

1. Find all `map -> filter` patterns
2. Verify map has single consumer (the filter)
3. Test predicate independence
4. If safe, reorder nodes:
   - Filter takes map's input
   - Map takes filter's output
   - Update all references

## Test Coverage

Four comprehensive tests in `test_optimizer.py`:

1. **Independent predicate**: Verifies reordering works
2. **Dependent predicate**: Ensures no incorrect reordering
3. **Multiple consumers**: Safety check prevents reordering
4. **End-to-end**: Real-world correctness validation

## Performance Impact

### Theoretical Analysis

- **Before**: `n * cost(transform) + m * cost(predicate)` where `m ≤ n`
- **After**: `n * cost(predicate) + m * cost(transform)` where `m ≤ n`

If `cost(transform) > cost(predicate)` and `m << n` (high selectivity), the optimization wins.

### Practical Example

Dataset: 1000 elements  
Filter selectivity: 10% (removes 900 elements)  
Transform cost: 10x predicate cost

- **Before**: 1000 transforms + 1000 predicate checks = 11,000 units
- **After**: 1000 predicate checks + 100 transforms = 2,000 units
- **Speedup**: ~5.5x on this operation

## Future Enhancements

1. **Cost-based decisions**: Only apply if profiler shows benefit
2. **User annotations**: `@independent` decorator for explicit hints
3. **AST analysis**: Static analysis to detect independence
4. **More test patterns**: Expand test dataset coverage
5. **Algebraic rewriting**: Handle invertible transformations

## References

- Implementation: `core/optimizer.py:286-397`
- Tests: `test_optimizer.py:294-419`
- Example: `examples/example6_filter_before_map.py`
