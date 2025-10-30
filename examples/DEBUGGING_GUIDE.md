# Debugging IOC Programs

## Why IOC is EASIER to Debug

Traditional code debugging is hard because:

- ❌ Code paths are complex and branching
- ❌ Side effects make state unpredictable
- ❌ Stack traces are deep and confusing
- ❌ Infinite loops can occur

IOC debugging is easier because:

- ✅ **Pure data flow** - No side effects, ever
- ✅ **Guaranteed termination** - Can't have infinite loops
- ✅ **Visual structure** - Programs are DAGs you can visualize
- ✅ **Step-by-step tracing** - Know exactly what happened at each node
- ✅ **Serializable state** - Can replay executions perfectly

## Debug Mode

Run any program with `--debug` flag:

```bash
npx tsx src/cli/ioc.ts run examples/pipeline.ioc --input '[1,-2,3,-4,5]' --debug
```

Output shows:

- Execution plan (order of operations)
- Each node's ID and type
- Final result

## Manual Debugging Techniques

### 1. Break Complex Pipelines into Steps

Instead of one long chain:

```ioc
# Hard to debug
result = reduce (map (filter data where x > 0) with x * 2) by sum
```

Break it apart:

```ioc
# Easy to debug - inspect each step
step1 = filter data where x > 0
step2 = map step1 with x * 2
result = reduce step2 by sum

# Can add multiple outputs to see intermediate values
output step1
output step2
output result
```

### 2. Use Multiple Outputs

You can output ANY variable to inspect it:

```ioc
input numbers: number[]

filtered = filter numbers where x > 0
doubled = map filtered with x * 2
total = reduce doubled by sum

# Output everything to see what's happening
output filtered   # See what passed the filter
output doubled    # See the transformed values
output total      # See the final result
```

### 3. Test with Small Data First

```bash
# Start small
ioc run program.ioc --input '[1,2,3]'

# Then scale up
ioc run program.ioc --input '[1,2,3,4,5,6,7,8,9,10]'
```

### 4. Validate Before Running

```bash
# Always validate first
ioc validate program.ioc

# This catches:
# - Syntax errors
# - Invalid operations
# - Complexity issues
```

## Understanding Error Messages

### Parse Error

```
Parse error at line 3, column 15: Expected IDENTIFIER, got NUMBER
```

**Fix:** Check syntax at that line/column. Common issues:

- Missing variable name
- Invalid operators
- Typos in keywords

### Execution Error

```
Execution failed at node filter_abc123 (FILTER): Cannot read property 'age' of undefined
```

**Fix:** Your data doesn't match expectations:

- Check input structure matches what filter expects
- Ensure objects have required properties

### Verification Error

```
Filter predicate failed verification: Exceeded complexity budget
```

**Fix:** Your predicate is too complex. Simplify the logic.

## Inspecting the Compiled Program

Save the program to JSON to see its structure:

```typescript
import { Lexer, Parser, ASTToGraphConverter } from '@ioc/compiler';
import * as fs from 'fs';

const source = fs.readFileSync('program.ioc', 'utf-8');
const lexer = new Lexer(source);
const parser = new Parser(lexer.tokenize());
const ast = parser.parse();

const converter = new ASTToGraphConverter();
const graph = converter.convert(ast);

// Inspect the JSON representation
const json = graph.toIOC();
console.log(json);

// Or save it
fs.writeFileSync('program.json', json);
```

## Visual Debugging (Future)

Since IOC programs are DAGs, they can be visualized:

```
     [input]
        ↓
    [filter x>0]
        ↓
    [map x*2]
        ↓
    [reduce sum]
        ↓
    [output]
```

Each node shows:

- Input data
- Transformation applied
- Output data
- Execution time

## Common Debugging Scenarios

### "My filter isn't working"

```ioc
# Debug: Output the filtered result
input data: number[]
filtered = filter data where x > 10
output filtered  # Inspect this!
```

If filtered is empty, your predicate might be wrong:

- Check operator: `>` vs `>=`
- Check value: Is 10 the right threshold?
- Check data: Does input have values > 10?

### "My map produces wrong results"

```ioc
# Debug: Check before and after
input numbers: number[]
doubled = map numbers with x * 2

output numbers   # Original data
output doubled   # Transformed data
```

Compare inputs to outputs. If wrong:

- Check arithmetic: `x * 2` vs `x + 2`
- Check property access: `x.amount` (does x have that property?)

### "My reduce gives unexpected total"

```ioc
# Debug: Check what's being reduced
input values: number[]
total = reduce values by sum

output values  # What are we summing?
output total   # What's the result?
```

If wrong:

- Check operation: `sum` vs `average` vs `product`
- Check data type: Are values actually numbers?

## Pro Tips

1. **Start Simple**: Test with `[1,2,3]` before real data
2. **One Change at a Time**: Don't change multiple things at once
3. **Output Everything**: Add outputs for all intermediate steps
4. **Use Validate**: Catch errors before running
5. **Check Complexity**: If slow, check the validation output

## Example: Debugging Session

```bash
# 1. Validate first
$ ioc validate complex-pipeline.ioc
✓ Program is valid

# 2. Run with small data
$ ioc run complex-pipeline.ioc --input '[1,2,3]'
Result: 12

# 3. Run with debug mode
$ ioc run complex-pipeline.ioc --input '[1,2,3]' --debug
=== DEBUG MODE ===
Execution Plan:
  input_abc123: INPUT
  filter_def456: FILTER
  map_ghi789: MAP
  reduce_jkl012: REDUCE
...

# 4. Looks good! Scale up to real data
$ ioc run complex-pipeline.ioc --input "$(cat production-data.json)"
```

## The Big Advantage

In traditional programming, debugging means:

1. Add console.logs everywhere
2. Recompile
3. Re-run
4. Remove console.logs
5. Repeat...

In IOC:

1. Add more `output` statements
2. Run (no recompile needed!)
3. Done.

**Plus:** Every IOC execution is deterministic - same input ALWAYS produces same output. No "works on my machine" issues!
