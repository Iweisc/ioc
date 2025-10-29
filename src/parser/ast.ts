/**
 * Abstract Syntax Tree (AST) types for .ioc language
 *
 * Represents the parsed structure of .ioc programs before compilation.
 */

export type ASTNode =
  | InputDeclaration
  | FilterStatement
  | MapStatement
  | ReduceStatement
  | OutputStatement
  | IfStatement
  | LetStatement;

export interface InputDeclaration {
  type: 'input';
  name: string;
  dataType?: string; // optional type annotation like 'number[]'
}

export interface FilterStatement {
  type: 'filter';
  target: string; // variable name to assign result to
  source: string; // variable name to filter from
  predicate: PredicateExpression;
}

export interface MapStatement {
  type: 'map';
  target: string;
  source: string;
  transform: TransformExpression;
}

export interface ReduceStatement {
  type: 'reduce';
  target: string;
  source: string;
  operation: ReductionOperation;
}

export interface IfStatement {
  type: 'if';
  target: string;
  condition: PredicateExpression;
  thenBranch: string; // variable name or expression
  elseBranch: string; // variable name or expression
}

export interface LetStatement {
  type: 'let';
  target: string;
  value: Expression;
}

export interface OutputStatement {
  type: 'output';
  source: string; // variable name to output
}

// Predicate expressions (for filters and conditionals)
export type PredicateExpression =
  | ComparisonPredicate
  | PropertyPredicate
  | LogicalPredicate
  | TypeCheckPredicate;

export interface ComparisonPredicate {
  type: 'comparison';
  operator: 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'neq';
  value: number | string | boolean;
}

export interface PropertyPredicate {
  type: 'property';
  property: string;
  operator: 'eq' | 'neq' | 'gt' | 'lt' | 'gte' | 'lte';
  value: number | string | boolean;
}

export interface LogicalPredicate {
  type: 'logical';
  operator: 'and' | 'or' | 'not';
  predicates: PredicateExpression[];
}

export interface TypeCheckPredicate {
  type: 'typecheck';
  checkType: 'string' | 'number' | 'boolean' | 'object' | 'array';
}

// Transform expressions (for map operations)
export type TransformExpression =
  | ArithmeticTransform
  | StringTransform
  | PropertyTransform
  | ConditionalTransform;

export interface ArithmeticTransform {
  type: 'arithmetic';
  operator: 'multiply' | 'add' | 'subtract' | 'divide' | 'mod';
  value: number;
}

export interface StringTransform {
  type: 'string';
  operation: 'uppercase' | 'lowercase' | 'trim' | 'concat';
  value?: string; // for concat
}

export interface PropertyTransform {
  type: 'property';
  property: string;
}

export interface ConditionalTransform {
  type: 'conditional';
  condition: PredicateExpression;
  thenTransform: TransformExpression;
  elseTransform: TransformExpression;
}

// Reduction operations
export type ReductionOperation =
  | 'sum'
  | 'product'
  | 'max'
  | 'min'
  | 'average'
  | 'count'
  | 'first'
  | 'last'
  | 'join';

// Generic expression type
export type Expression =
  | { type: 'variable'; name: string }
  | { type: 'literal'; value: number | string | boolean }
  | TransformExpression;

/**
 * Complete program AST
 */
export interface Program {
  statements: ASTNode[];
}
