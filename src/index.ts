// IOC (Intent-Oriented Computing) - Main Export

// Core
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

// Solvers
export { SolverKernel } from './solvers/kernel';
export { NaiveStrategy, OptimizedStrategy, VectorizedStrategy } from './solvers/strategies';
export type { Strategy, ExecutionContext } from './solvers/strategies';
export { PerformanceProfiler, getProfiler } from './solvers/profiler';
export type { ProfileRecord } from './solvers/profiler';
