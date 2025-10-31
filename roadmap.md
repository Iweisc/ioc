---

# IOC Project Roadmap

### Our Goal

This document lays out the plan for IOC. Our goal is to see if we can create a new way to handle data processing—one that's declarative, safe by design, and eventually, self-optimizing.

The roadmap is broken into three phases. The first is about building a solid, useful tool that works today. The later phases describe our long-term vision for where this project could go.

---

### Phase 1: The Foundation - A Solid Compiler (Current Focus)

Before we can get to the more ambitious ideas, we need to build something practical and reliable. The immediate focus is on creating a solid ahead-of-time (AOT) compiler that solves a real problem: running data transformations in a safe, sandboxed, and predictable way. This is the foundation everything else will be built on.

**What's Done:**

*   The core language syntax (`input`, `filter`, `map`, `reduce`, `output`).
*   A working CLI for running, compiling, and validating programs.
*   The JavaScript backend is stable and works everywhere.
*   The WebAssembly backend is functional for performance-sensitive tasks.
*   A basic API for using the compiler in other JavaScript/TypeScript projects.

**What We're Working On Next:**

*   **Making the language more useful.** We'll be adding core data types like `string`, `boolean`, and `date`, along with the expected functions for them (`uppercase`, `length`, etc.). We also plan to add a `sort` operation.
*   **Improving the developer experience.** Right now, the compiler's error messages can be cryptic. We're going to overhaul them to be clear and helpful. We're also working on official documentation and a proper VS Code extension for syntax highlighting.

---

### Phase 2: Making It Smart - A Better Compiler and Toolchain

Once the core is stable and usable, the next step is to make the compiler smarter and the surrounding tools better. This phase is about improving performance through optimization and making the day-to-day workflow much smoother.

**The Main Goals for This Phase:**

*   **Compiler Optimizations.** This is the most important part. We'll teach the compiler to perform optimizations that would be tedious to do by hand. The first major goal is "operation fusion"—the ability to combine a chain of `filter` and `map` steps into a single, efficient pass over the data. This will reduce memory usage and make programs run significantly faster. We'll also work on basics like dead code elimination.
*   **A More Powerful Language.** We plan to add support for nested objects and a simple module system to share logic between `.ioc` files. We're also exploring how to add pure, user-defined functions to make code less repetitive.
*   **Serious Tooling.** The VS Code extension will get full language support, with linting and auto-completion. We also plan to start work on an **LLVM backend**, which would allow IOC to compile down to native machine code for maximum performance in server environments.

---

### Phase 3: The Long Term - The Dynamic Runtime

This is where we return to the original, more radical vision for IOC. The first two phases give us a robust compiler. This phase is about building a dynamic runtime—a "Kernel"—that can execute intent graphs in a much more intelligent way.

This is the ambitious, long-term goal that the earlier work makes possible.

**Where We Want to Go:**

*   **From AOT to JIT.** We plan to build a standalone runtime that doesn't just run pre-compiled code, but can execute the program's graph representation directly. This runtime would include a Just-In-Time (JIT) compiler to generate machine code (via Wasm or LLVM) on the fly, optimized for the specific machine it's running on.
*   **True Self-Optimization.** A dynamic runtime can watch how the code performs. We want to build profiling hooks that let the runtime measure the performance of different strategies. For example, it could learn which sorting algorithm is best for a given data size and automatically use it. This is the core of the "self-optimizing" idea.
*   **Beyond a Single Syntax.** Once the underlying graph representation and runtime are solid, the `.ioc` language becomes just one "view" on that graph. We could build other frontends—a visual editor for building pipelines, or a Python-like syntax—that all compile to the same intermediate graph and run on the same dynamic kernel.
*   **Distributed Execution.** The ultimate goal is a runtime smart enough to look at a complex program graph and automatically distribute the work across multiple CPU cores, or even across a cluster of machines.

This is a long road, and each phase builds on the last. Our priority right now is making Phase 1 a success.
