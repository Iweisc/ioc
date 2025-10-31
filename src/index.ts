// IOC (Intent-Oriented Computing) - Pure Compiled Language
//
// IOC is a compiled language for data processing. Write .ioc files and compile them
// to JavaScript or WebAssembly using the CLI or programmatic compiler API.
//
// This module exports ONLY the compiler infrastructure - no framework/embedding APIs.

// Parser - Converts .ioc source code to AST
export { Lexer, TokenType } from './parser/lexer';
export type { Token } from './parser/lexer';
export { Parser } from './parser/parser';
export { ASTToGraphConverter } from './parser/ast-to-graph';
export type { Program, ASTNode } from './parser/ast';

// IOC Program Format - The internal representation
export {
  IOCIntentType,
  serializeIOC,
  deserializeIOC,
  loadIOCFile,
  saveIOCFile,
  validateIOCProgram,
  getExecutionOrder,
  calculateNodeCapability,
} from './dsl/ioc-format';
export type { IOCProgram, IOCNode, IOCNodeParams, IntentCapability } from './dsl/ioc-format';

// Compiler - Compiles IOC programs to executable code
export {
  compilePredicate,
  compileTransform,
  compileReduction,
  compilePredicateFunction,
  compileTransformFunction,
  compileReductionFunction,
} from './dsl/compiler';

// Type System
export { ComplexityClass, validateSafeValue } from './dsl/safe-types';
export type {
  SafePredicate,
  SafeTransform,
  SafeValue,
  ReductionOp,
  ComparisonOp,
  ArithmeticOp,
  StringOp,
  ArrayOp,
} from './dsl/safe-types';

// Verification and Safety
export {
  TerminationVerifier,
  BudgetEnforcer,
  estimateBudget,
  DEFAULT_BUDGETS,
} from './core/verifier';
export type { ExecutionBudget, VerificationResult } from './core/verifier';

// Security
export {
  validatePropertyPath,
  validateRegexPattern,
  validateStringArg,
  safeSerialize,
  validateComplexity,
  createSandboxContext,
  compileInRestrictedContext,
} from './dsl/security';

// Backends - Target code generation
export { BackendSelector, backendSelector } from './backends/backend-selector';
export { JavaScriptBackend } from './backends/javascript-backend';
export { WebAssemblyBackend } from './backends/wasm-backend';
export { LLVMBackend } from './backends/llvm-backend';
export { BackendType, BackendStrategy } from './backends/types';
export type {
  CompilationBackend,
  CompilationOptions,
  CompilationResult,
  BackendSelectorConfig,
} from './backends/types';
