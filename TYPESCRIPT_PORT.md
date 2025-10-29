# IOC TypeScript Port - Phase 3.1

## Overview

This document tracks the migration of IOC from Python to TypeScript with native LLVM compilation.

## Branch Structure

- **`prototype`** - Complete Python implementation (Phase 1 + 2)
- **`ioc-ts`** - TypeScript/LLVM implementation (current)
- **`main`** - Stable branch

## Why TypeScript?

### Strategic Advantages
1. **LLM Training Data**: Vastly more JS/TS code in LLM training sets → better AI assistance
2. **Built-in Type System**: TypeScript's types perfect for compiler work
3. **npm Ecosystem**: Millions of packages, @types/* definitions available
4. **Fast Iteration**: No compile times, instant feedback with `tsx`
5. **Modern Tooling**: Excellent VS Code integration, ESLint, Prettier
6. **Performance**: V8 JIT is fast for AST/graph manipulation
7. **Easy Deployment**: Single `node` runtime, works everywhere

### Why Not Python?
- Limited LLVM bindings (llvmlite has version constraints)
- Slower for compiler work
- Less LLM training data
- Runtime overhead for compiler itself

### Why Not Rust/C++?
- Complete rewrite from scratch (months of work)
- TypeScript gets us there faster with similar end-user performance
- LLVM → native code performance is the same regardless of compiler language

## Progress

### ✅ Completed (7/13 tasks)

1. **Project Structure**
   - package.json with TypeScript, Vitest, tsup
   - tsconfig.json with strict type checking
   - Prettier, ESLint configuration
   - Build and test scripts

2. **Core Type System** (`src/core/types.ts` - 180 lines)
   - `IOCType` interface with `toLLVMType()` method
   - `IntType` (32/64 bit, with constraints)
   - `FloatType` (single/double precision)
   - `BoolType` (LLVM i1)
   - `ListType` (with element type and length constraints)
   - `AnyType` (generic pointer)
   - `inferType()` function for JavaScript values

3. **Intent Graph** (`src/core/graph.ts` - 330 lines)
   - `IntentNode` interface
   - `IntentType` enum (14 types)
   - `Graph` class with all intent methods:
     - input, constant
     - filter, map, reduce
     - sort, groupBy, join
     - flatten, distinct
   - Topological sort for execution order
   - ASCII visualization
   - Output node marking

4. **Compiler Stub** (`src/solvers/kernel.ts`)
   - `SolverKernel` class
   - `CompiledFunction` interface
   - Stub `compile()` method (ready for LLVM)

5. **Tests** (`src/tests/types.test.ts`)
   - 18 tests, all passing ✅
   - Coverage: IntType, FloatType, BoolType, ListType
   - Type inference tests
   - LLVM type mapping tests

6. **Example** (`src/examples/basic.ts`)
   - Demonstrates graph construction
   - Shows visualization and execution order
   - Working end-to-end example

7. **Git Structure**
   - `prototype` branch pushed
   - `ioc-ts` branch created and pushed
   - Clean .gitignore for Node/TypeScript

### 🚧 In Progress

None currently

### ⏳ Pending (6/13 tasks)

1. **Install LLVM 14+** (blocked - needs system setup)
   - Install LLVM via Homebrew: `brew install llvm@14`
   - Configure npm: `npm config set cmake_LLVM_DIR $(llvm-config --cmakedir)`
   - Install llvm-bindings: `npm install llvm-bindings`

2. **LLVM IR Generator** (high priority)
   - Implement `LLVMCodeGen` class
   - Generate LLVM IR for filter, map, reduce
   - Handle type conversions
   - Memory management

3. **LLVM Execution Engine** (medium priority)
   - Initialize LLVM
   - Create execution engine
   - JIT compilation
   - Run compiled functions

4. **Optimizer Passes** (medium priority)
   - Port dead code elimination
   - Port common subexpression elimination
   - Port filter/map fusion
   - Port filter-before-map reordering

5. **Examples & Benchmarks** (medium priority)
   - Complex pipeline examples
   - Performance benchmarks vs Python
   - Memory usage comparison

6. **Documentation** (low priority)
   - API documentation
   - Architecture diagrams
   - Migration guide

## Project Structure

```
ioc/
├── src/
│   ├── core/
│   │   ├── types.ts       # Type system (✅)
│   │   └── graph.ts       # Intent Graph (✅)
│   ├── solvers/
│   │   ├── kernel.ts      # Compiler (stub)
│   │   ├── llvm.ts        # LLVM codegen (TODO)
│   │   └── optimizer.ts   # Optimizer passes (TODO)
│   ├── examples/
│   │   └── basic.ts       # Basic example (✅)
│   ├── tests/
│   │   ├── types.test.ts  # Type tests (✅)
│   │   ├── graph.test.ts  # Graph tests (TODO)
│   │   └── llvm.test.ts   # LLVM tests (TODO)
│   └── index.ts           # Main export (✅)
├── package.json           # Dependencies (✅)
├── tsconfig.json          # TypeScript config (✅)
├── vitest.config.ts       # Test config (✅)
└── tsup.config.ts         # Build config (✅)
```

## Testing

```bash
# Run all tests
npm test

# Type checking
npm run typecheck

# Build
npm run build

# Run example
npx tsx src/examples/basic.ts
```

## Current Status

**Tests**: 18/18 passing ✅
**Type Safety**: Strict mode enabled ✅
**Build**: Working ✅
**Python Port**: ~40% complete (type system + graph)

## Next Steps

1. Install LLVM 14+ on development machine
2. Integrate llvm-bindings npm package
3. Implement basic LLVM IR generation for filter/map
4. Test JIT execution with simple examples
5. Benchmark vs Python implementation

## Performance Goals

- **Compilation**: < 10ms for typical graphs
- **Execution**: 10-100x faster than Python (via LLVM optimization)
- **Memory**: Similar to hand-written C code

## References

- [llvm-bindings](https://github.com/ApsarasX/llvm-bindings) - Node.js LLVM bindings
- [LLVM Documentation](https://llvm.org/docs/)
- Python prototype in `prototype` branch
