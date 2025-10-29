// IOC (Intent-Oriented Computing) - Main Export

// Core (Legacy)
export { Graph, IntentType } from './core/graph';
export type { IntentNode, IntentMetadata } from './core/graph';
export type { IOCType } from './core/types';
export { IntType, FloatType, BoolType, ListType, AnyType, inferType } from './core/types';
export { GraphOptimizer } from './core/optimizer';
export { Provenance, ProvenanceTracker } from './core/provenance';
export type { SourceLocation, TransformationRecord } from './core/provenance';
export { IOCDebugger, DebugMode } from './core/debugger';
export type { ExecutionTrace } from './core/debugger';
export { DifferentialTester, createTestSuite } from './core/differential';
export type { DifferentialTestResult, ExecutionResult } from './core/differential';

// Solvers (Legacy)
export { SolverKernel } from './solvers/kernel';
export { NaiveStrategy, OptimizedStrategy, VectorizedStrategy } from './solvers/strategies';
export type { Strategy, ExecutionContext } from './solvers/strategies';
export { PerformanceProfiler, getProfiler } from './solvers/profiler';
export type { ProfileRecord } from './solvers/profiler';

// Safe DSL (New!)
export { SafeGraph } from './dsl/safe-graph';
export { Predicate, Transform, Reduce, ComplexityClass, validateSafeValue } from './dsl/safe-types';
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
export {
  compilePredicate,
  compileTransform,
  compileReduction,
  compilePredicateFunction,
  compileTransformFunction,
  compileReductionFunction,
} from './dsl/compiler';
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
export {
  TerminationVerifier,
  BudgetEnforcer,
  estimateBudget,
  DEFAULT_BUDGETS,
} from './core/verifier';
export type { ExecutionBudget, VerificationResult } from './core/verifier';

// Parser and CLI
export { Lexer, TokenType } from './parser/lexer';
export type { Token } from './parser/lexer';
export { Parser } from './parser/parser';
export { ASTToGraphConverter } from './parser/ast-to-graph';
export type { Program, ASTNode } from './parser/ast';
