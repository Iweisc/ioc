# IOC Compilation Backends

IOC supports multiple compilation backends, each optimized for different use cases.

## Architecture Overview

```
┌─────────────┐
│ .ioc Source │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   Parser    │  (Lexer → Parser → AST)
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  SafeGraph  │  (Intermediate Representation)
└──────┬──────┘
       │
       ├──────────┬─────────────┬──────────────┐
       │          │             │              │
       ▼          ▼             ▼              ▼
┌──────────┐ ┌────────┐  ┌──────────┐   ┌──────────┐
│JavaScript│ │  WASM  │  │   LLVM   │   │  Future  │
│ Backend  │ │Backend │  │ Backend  │   │ Backends │
└────┬─────┘ └───┬────┘  └────┬─────┘   └──────────┘
     │           │            │
     ▼           ▼            ▼
   JS Fn      WASM Bin    Native Code
```

## Available Backends

### 1. JavaScript Backend

**The Universal Choice**

- ✅ **Always available** - Works in Node.js, browsers, Deno, Bun
- ⚡ **Fast compilation** - ~1ms per node
- 🎯 **Moderate performance** - 6/10 score
- 📦 **No dependencies** - Built into IOC

**Best for:**

- Quick prototyping
- Development and testing
- Universal compatibility needed
- Lightweight deployments

**Example:**

```typescript
import { backendSelector } from '@ioc/compiler/backends';

const result = await backendSelector.compile(program, {
  backend: 'javascript',
});
```

---

### 2. WebAssembly Backend

**The Portable Powerhouse**

- 🌐 **Highly portable** - Runs in browsers, Node.js, edge runtimes
- 🔒 **Sandboxed** - Secure execution environment
- ⚡ **Good performance** - 8/10 score
- 🏗️ **Moderate compilation** - ~5ms per node

**Best for:**

- Browser execution
- Edge computing (Cloudflare Workers, etc.)
- Plugin systems requiring sandboxing
- Cross-platform binaries

**Example:**

```typescript
const result = await backendSelector.compile(program, {
  backend: 'wasm',
  optimizationLevel: 2,
});

// Get WASM binary
const wasmBinary = result.metadata.wasmBinary;
```

---

### 3. LLVM Backend

**The Performance King**

- 🚀 **Maximum performance** - 10/10 score
- 🎯 **Native code** - JIT-compiled machine code
- 🔧 **Advanced optimization** - O0 through O3 levels
- ⏱️ **Slower compilation** - ~20ms per node

**Requirements:**

- Node.js environment
- `llvm-bindings` package

**Installation:**

```bash
npm install llvm-bindings
```

**Best for:**

- Server-side compute
- Long-running processes
- Solver Kernel
- Performance-critical workloads

**Example:**

```typescript
const result = await backendSelector.compile(program, {
  backend: 'llvm',
  optimizationLevel: 3, // Maximum optimization
  targetArch: 'x86_64',
});

// Get LLVM IR (with debug flag)
const llvmIR = result.metadata.llvmIR;
```

---

## Backend Selection Strategy

IOC can automatically select the best backend based on your requirements:

### Fastest Compile

Prioritizes compilation speed:

```typescript
const backend = await backendSelector.selectBackend(program, {
  strategy: 'fastest_compile',
});
```

→ Usually selects: **JavaScript**

### Fastest Runtime

Prioritizes execution performance:

```typescript
const backend = await backendSelector.selectBackend(program, {
  strategy: 'fastest_runtime',
});
```

→ Usually selects: **LLVM** (if available), else **WebAssembly**

### Most Portable

Prioritizes cross-platform compatibility:

```typescript
const backend = await backendSelector.selectBackend(program, {
  strategy: 'most_portable',
});
```

→ Usually selects: **WebAssembly** or **JavaScript**

### Balanced (Default)

Balances compilation time and performance:

```typescript
const backend = await backendSelector.selectBackend(program, {
  strategy: 'balanced',
});
```

→ Scores each backend: 40% compile time + 60% performance

---

## Performance Comparison

| Backend     | Compile Time | Runtime Speed | Portability  | Score |
| ----------- | ------------ | ------------- | ------------ | ----- |
| JavaScript  | ⚡ Fastest   | 🟨 Moderate   | ✅ Universal | 6/10  |
| WebAssembly | 🟨 Moderate  | ⚡ Fast       | ✅ High      | 8/10  |
| LLVM        | 🔴 Slowest   | 🚀 Maximum    | 🟡 Node.js   | 10/10 |

### Benchmark Example

Processing 1,000,000 numbers through a filter-map-reduce pipeline:

```
JavaScript:  Compile: 15ms    Execute: 120ms
WebAssembly: Compile: 75ms    Execute: 45ms
LLVM:        Compile: 300ms   Execute: 15ms
```

**Conclusion:**

- For one-time execution → JavaScript
- For repeated execution → WebAssembly or LLVM
- For maximum throughput → LLVM

---

## CLI Usage

### List Available Backends

```bash
ioc backends
```

Output:

```
Available backends:
  ✓ javascript - Always available
  ✓ wasm       - WebAssembly support detected
  ✗ llvm       - Install llvm-bindings to enable
```

### Run with Specific Backend

```bash
ioc run pipeline.ioc --input '[1,2,3]' --backend wasm
ioc run compute.ioc --input data.json --backend llvm --opt-level 3
```

### Compile to WASM Binary

```bash
ioc compile pipeline.ioc --backend wasm --output pipeline.wasm
```

---

## API Examples

### Basic Compilation

```typescript
import { backendSelector, BackendType } from '@ioc/compiler/backends';
import { loadIOCFile } from '@ioc/compiler';

const program = await loadIOCFile('pipeline.ioc');

// Automatic backend selection
const result = await backendSelector.compile(program);

// Execute
const output = result.execute([1, 2, 3, 4, 5]);
console.log(output); // 30
```

### Explicit Backend

```typescript
const result = await backendSelector.compile(program, {
  backend: BackendType.LLVM,
  optimizationLevel: 3,
  debug: true,
});

console.log('Backend:', result.backend);
console.log('Code size:', result.codeSize, 'bytes');
console.log('Compilation time:', result.compilationTime, 'ms');
```

### Check Backend Availability

```typescript
const available = await backendSelector.getAvailableBackends();
console.log('Available:', available);

const hasLLVM = await backendSelector.isBackendAvailable(BackendType.LLVM);
if (!hasLLVM) {
  console.log('LLVM not available. Install: npm install llvm-bindings');
}
```

### Compare Backends

```typescript
async function benchmarkBackends(program, input) {
  const backends = await backendSelector.getAvailableBackends();

  for (const backend of backends) {
    const start = performance.now();
    const result = await backendSelector.compile(program, { backend });
    const compileTime = performance.now() - start;

    const execStart = performance.now();
    const output = result.execute(input);
    const execTime = performance.now() - execStart;

    console.log(`${backend}:`);
    console.log(`  Compile: ${compileTime.toFixed(2)}ms`);
    console.log(`  Execute: ${execTime.toFixed(2)}ms`);
    console.log(`  Code size: ${result.codeSize} bytes`);
  }
}
```

---

## Future Backends

### Planned

- **GPU Backend** - Compile to CUDA/OpenCL for parallel operations
- **Distributed Backend** - Distribute execution across multiple nodes
- **RISC-V Backend** - Native code for RISC-V architecture
- **eBPF Backend** - Kernel-space execution for networking/observability

### Proposed

- **FPGA Backend** - Hardware synthesis for maximum performance
- **Quantum Backend** - Quantum circuit compilation (research)

---

## Implementation Notes

### Adding a New Backend

To add a new compilation backend:

1. Implement the `CompilationBackend` interface:

```typescript
export class MyBackend implements CompilationBackend {
  readonly type = 'mybackend';
  readonly name = 'My Backend';

  async isAvailable(): Promise<boolean> {
    /* ... */
  }
  async compile(program, options): Promise<CompilationResult> {
    /* ... */
  }
  estimateCompilationTime(program): number {
    /* ... */
  }
  estimatePerformanceScore(): number {
    /* ... */
  }
}
```

2. Register in `BackendSelector`:

```typescript
this.backends.set('mybackend', new MyBackend());
```

3. Add to `BackendType` enum in `types.ts`

### Backend Requirements

All backends must:

- ✅ Implement `CompilationBackend` interface
- ✅ Handle all IOC node types
- ✅ Preserve semantic correctness
- ✅ Report compilation time and code size
- ✅ Support optimization levels (0-3)
- ✅ Handle errors gracefully

---

## Best Practices

### Development

- Use **JavaScript** backend for fast iteration
- Enable `debug: true` to inspect generated code
- Test with small inputs first

### Production

- Use **LLVM** for server-side compute
- Use **WebAssembly** for browser/edge deployment
- Cache compiled programs when possible
- Monitor compilation time vs execution time

### Optimization

- Start with O0, profile, then increase
- O3 can significantly increase compile time
- Consider compilation time amortization:
  - One-time execution → prefer JavaScript
  - 10+ executions → prefer LLVM

---

## Troubleshooting

### "LLVM backend not available"

Install llvm-bindings:

```bash
npm install llvm-bindings
```

Or use alternative backend:

```typescript
const result = await backendSelector.compile(program, {
  backend: 'wasm', // Fallback to WebAssembly
});
```

### "WebAssembly is not defined"

WebAssembly requires modern runtimes:

- Node.js 8+
- Modern browsers
- Deno
- Cloudflare Workers

Fallback to JavaScript:

```typescript
const available = await backendSelector.getAvailableBackends();
if (!available.includes('wasm')) {
  // Use JavaScript backend
}
```

---

## Contributing

We welcome new backend implementations! See `CONTRIBUTING.md` for guidelines.

Priority backends:

1. GPU backend (CUDA/OpenCL)
2. Distributed execution backend
3. RISC-V native backend

---

**The right backend for the right job.** 🚀
