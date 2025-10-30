# Security in IOC

## Overview

IOC is designed with security as a core principle. All programs are validated and executed in a restricted environment to prevent code injection and other vulnerabilities.

## Security Guarantees

### 1. No Arbitrary Code Execution

IOC programs use a restricted DSL with only safe operations:

- **Predicates**: Comparison, property access, type checking
- **Transforms**: Arithmetic, string operations, property access
- **Reductions**: Built-in aggregation functions

No arbitrary JavaScript code can be executed.

### 2. Input Validation

All inputs to the compiler are validated:

- Property names must be valid JavaScript identifiers
- No access to dangerous properties (`__proto__`, `constructor`, `prototype`)
- Regex patterns are validated for safety
- String arguments are length-limited to prevent DoS
- All values are sanitized via JSON serialization

### 3. Code Generation Security

The compiler generates code using `new Function()`, but:

- All user inputs are sanitized before code generation
- Generated code is validated for dangerous patterns
- Property access uses optional chaining (safe)
- No eval() or dynamic require() possible
- Code length is limited to prevent DoS

### 4. Guaranteed Termination

All IOC programs are guaranteed to terminate:

- Structural guarantees (no loops/recursion)
- Complexity bounds enforced
- Empirical verification with test inputs
- Execution budgets enforced

## Security Best Practices

### Running Untrusted .ioc Files

By default, the CLI validates all programs before execution:

```bash
# Safe by default
ioc run untrusted.ioc --input '[1,2,3]'
```

If validation fails, the program won't execute. Only use `--unsafe` with trusted files:

```bash
# Skip validation (use only with trusted files!)
ioc run trusted.ioc --input '[1,2,3]' --unsafe
```

### Programmatic Usage

When using the TypeScript API, always validate:

```typescript
import { SafeGraph } from '@ioc/compiler';

const graph = new SafeGraph();
// ... build graph ...

// Validate before compilation
const validation = graph.validate();
if (!validation.valid) {
  throw new Error(`Invalid program: ${validation.errors.join(', ')}`);
}

// Safe to compile and execute
const compiled = graph.compile();
const result = compiled(data);
```

### Input Data Safety

IOC doesn't execute user data, but malicious data can still cause issues:

```typescript
// Dangerous: Extremely large arrays can cause memory issues
const hugeArray = new Array(1000000000);

// Safe: Validate input size first
if (data.length > 1000000) {
  throw new Error('Input too large');
}
```

### Regex Safety

IOC validates regex patterns to prevent ReDoS attacks:

- Patterns limited to 1000 characters
- Nested quantifiers blocked
- Invalid patterns rejected

```ioc
# Safe regex
valid = filter strings where x matches "^[a-z]+$"

# Would be rejected (nested quantifiers)
# dangerous = filter strings where x matches "^(a+)+$"
```

## Known Limitations

### Not a Complete Sandbox

While IOC has many security measures, it's not a complete sandbox:

1. **No VM isolation**: Generated functions run in the same V8 process
2. **Memory access**: Functions can access heap memory
3. **Timing attacks**: Execution time can leak information

For maximum security, run IOC in a separate process or container.

### Property Access

Property access uses optional chaining which is safe, but:

```typescript
// This is safe (won't throw)
const value = obj?.user?.name;

// But this can access prototype chain
const proto = obj?.__proto__; // Blocked by validation
```

IOC blocks access to dangerous properties, but new attack vectors may emerge.

### ReDoS Prevention

The regex validation is heuristic-based and may not catch all ReDoS patterns. For maximum security:

- Avoid user-provided regex patterns
- Use string operations instead when possible
- Set execution timeouts

## Threat Model

IOC defends against:

✅ Code injection via crafted predicates/transforms
✅ Property pollution via `__proto__`
✅ Infinite loops causing DoS
✅ ReDoS via malicious regex patterns
✅ Memory exhaustion via unbounded operations

IOC does NOT defend against:

❌ Timing side-channel attacks
❌ Memory side-channel attacks  
❌ OS-level attacks
❌ Attacks on the host process
❌ Supply chain attacks on dependencies

## Reporting Security Issues

If you find a security vulnerability, please report it to:

- Email: security@example.com (DO NOT file public issues)
- Include: Reproduction steps, affected versions, impact assessment

We aim to respond within 48 hours and release patches within 7 days.

## Security Checklist

When deploying IOC in production:

- [ ] Run IOC programs in isolated processes/containers
- [ ] Validate all .ioc files before execution
- [ ] Set execution timeouts
- [ ] Limit input data size
- [ ] Monitor resource usage
- [ ] Keep IOC updated to latest version
- [ ] Review generated code in audit logs
- [ ] Use CSP headers in web environments
- [ ] Implement rate limiting for API endpoints
- [ ] Log all validation failures

## Example: Secure Deployment

```typescript
import { SafeGraph, validateIOCProgram } from '@ioc/compiler';
import { Worker } from 'worker_threads';

async function runSecurely(iocCode: string, data: any) {
  // 1. Parse and validate
  const graph = parseAndBuild(iocCode);
  const validation = graph.validate();

  if (!validation.valid) {
    throw new Error('Validation failed');
  }

  // 2. Check complexity
  const program = graph.toProgram();
  const maxComplexity = program.nodes
    .map((n) => n.capability.maxComplexity)
    .reduce((max, curr) => (curr > max ? curr : max));

  if (maxComplexity === 'O(n^2)' && data.length > 10000) {
    throw new Error('Input too large for complexity');
  }

  // 3. Execute in worker thread with timeout
  return new Promise((resolve, reject) => {
    const worker = new Worker('./ioc-worker.js', {
      workerData: { program: graph.toProgram(), data },
    });

    const timeout = setTimeout(() => {
      worker.terminate();
      reject(new Error('Execution timeout'));
    }, 5000);

    worker.on('message', (result) => {
      clearTimeout(timeout);
      resolve(result);
    });

    worker.on('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
  });
}
```

## Conclusion

IOC provides strong security guarantees for a DSL, but it's not magic. Follow best practices, validate inputs, isolate execution, and stay updated.

Security is a continuous process - always review and improve your deployment.
