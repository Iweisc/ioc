/**
 * Converts AST to SafeGraph
 *
 * Bridges the parsed .ioc language to the executable SafeGraph representation.
 */

import { SafeGraph } from '../dsl/safe-graph';
import {
  Program,
  ASTNode,
  FilterStatement,
  MapStatement,
  ReduceStatement,
  OutputStatement,
  PredicateExpression,
  TransformExpression,
  ComparisonPredicate,
  PropertyPredicate,
  ArithmeticPredicate,
  LogicalPredicate,
  TypeCheckPredicate,
  ArithmeticTransform,
  StringTransform,
  PropertyTransform,
  ConditionalTransform,
  ReductionOperation,
} from './ast';
import type { SafePredicate, SafeTransform, ReductionOp } from '../dsl/safe-types';

// Operator mappings at module level to avoid recreation on every call
const COMPARISON_OP_MAP: Record<string, string> = {
  gt: 'gt',
  lt: 'lt',
  gte: 'gte',
  lte: 'lte',
  eq: 'eq',
  neq: 'ne',
} as const;

const ARITHMETIC_OP_MAP: Record<string, string> = {
  multiply: 'multiply',
  add: 'add',
  subtract: 'subtract',
  divide: 'divide',
  mod: 'modulo',
} as const;

export class ASTToGraphConverter {
  private graph: SafeGraph;
  private variables: Map<string, string>; // name -> nodeId

  constructor() {
    this.graph = new SafeGraph();
    this.variables = new Map();
  }

  convert(program: Program): SafeGraph {
    for (const statement of program.statements) {
      this.processStatement(statement);
    }

    return this.graph;
  }

  private processStatement(node: ASTNode): void {
    switch (node.type) {
      case 'input':
        this.processInput(node);
        break;
      case 'filter':
        this.processFilter(node);
        break;
      case 'map':
        this.processMap(node);
        break;
      case 'reduce':
        this.processReduce(node);
        break;
      case 'output':
        this.processOutput(node);
        break;
      case 'if':
        // TODO: Implement if/else statements
        // Parser accepts them but they're not yet part of the .ioc language spec
        throw new Error(
          `'if' statements are not yet supported. ` +
            `Use conditional transforms in map operations instead.`
        );
      case 'let':
        // TODO: Implement let bindings
        // Parser accepts them but they're not yet part of the .ioc language spec
        throw new Error(
          `'let' statements are not yet supported. ` +
            `All variables must be created through input, filter, map, or reduce operations.`
        );
      default:
        throw new Error(`Unsupported statement type: ${(node as any).type}`);
    }
  }

  private processInput(node: ASTNode): void {
    if (node.type !== 'input') return;
    const nodeId = this.graph.input(node.name);
    this.variables.set(node.name, nodeId);
  }

  private processFilter(node: FilterStatement): void {
    const sourceId = this.getVariable(node.source);
    const predicate = this.convertPredicate(node.predicate);
    const resultId = this.graph.filter(sourceId, predicate);
    this.variables.set(node.target, resultId);
  }

  private processMap(node: MapStatement): void {
    const sourceId = this.getVariable(node.source);
    const transform = this.convertTransform(node.transform);
    const resultId = this.graph.map(sourceId, transform);
    this.variables.set(node.target, resultId);
  }

  private processReduce(node: ReduceStatement): void {
    const sourceId = this.getVariable(node.source);
    const operation = this.convertReductionOp(node.operation);
    const resultId = this.graph.reduce(sourceId, operation);
    this.variables.set(node.target, resultId);
  }

  private processOutput(node: OutputStatement): void {
    const sourceId = this.getVariable(node.source);
    this.graph.output(sourceId);
  }

  private getVariable(name: string): string {
    const nodeId = this.variables.get(name);
    if (!nodeId) {
      throw new Error(`Undefined variable: ${name}`);
    }
    return nodeId;
  }

  // Convert AST predicates to SafePredicate
  private convertPredicate(expr: PredicateExpression): SafePredicate {
    switch (expr.type) {
      case 'comparison':
        return this.convertComparisonPredicate(expr as ComparisonPredicate);
      case 'property':
        return this.convertPropertyPredicate(expr as PropertyPredicate);
      case 'arithmetic':
        return this.convertArithmeticPredicate(expr as ArithmeticPredicate);
      case 'logical':
        return this.convertLogicalPredicate(expr as LogicalPredicate);
      case 'typecheck':
        return this.convertTypeCheckPredicate(expr as TypeCheckPredicate);
      default:
        throw new Error(`Unsupported predicate type: ${(expr as any).type}`);
    }
  }

  private convertComparisonPredicate(expr: ComparisonPredicate): SafePredicate {
    return {
      type: 'compare',
      op: (COMPARISON_OP_MAP[expr.operator] || expr.operator) as any,
      value: expr.value,
    };
  }

  private convertPropertyPredicate(expr: PropertyPredicate): SafePredicate {
    return {
      type: 'compare_property',
      op: (COMPARISON_OP_MAP[expr.operator] || expr.operator) as any,
      property: expr.property,
      value: expr.value,
    };
  }

  private convertArithmeticPredicate(expr: ArithmeticPredicate): SafePredicate {
    // Convert arithmetic predicate like "x % 2 == 0" to compare_arithmetic
    return {
      type: 'compare_arithmetic',
      arithmeticOp: expr.arithmeticOp as any,
      arithmeticValue: expr.arithmeticValue,
      comparisonOp: (COMPARISON_OP_MAP[expr.comparisonOp] || expr.comparisonOp) as any,
      comparisonValue: expr.comparisonValue,
    };
  }

  private convertLogicalPredicate(expr: LogicalPredicate): SafePredicate {
    const predicates = expr.predicates.map((p) => this.convertPredicate(p));

    switch (expr.operator) {
      case 'and':
        return { type: 'and', predicates };
      case 'or':
        return { type: 'or', predicates };
      case 'not':
        if (predicates.length !== 1) {
          throw new Error("Logical 'not' must have exactly one predicate");
        }
        return { type: 'not', predicate: predicates[0]! };
      default:
        throw new Error(`Unknown logical operator: ${expr.operator}`);
    }
  }

  private convertTypeCheckPredicate(expr: TypeCheckPredicate): SafePredicate {
    return {
      type: 'type_check',
      expectedType: expr.checkType,
    };
  }

  // Convert AST transforms to SafeTransform
  private convertTransform(expr: TransformExpression): SafeTransform {
    switch (expr.type) {
      case 'arithmetic':
        return this.convertArithmeticTransform(expr as ArithmeticTransform);
      case 'string':
        return this.convertStringTransform(expr as StringTransform);
      case 'property':
        return this.convertPropertyTransform(expr as PropertyTransform);
      case 'conditional':
        return this.convertConditionalTransform(expr as ConditionalTransform);
      default:
        throw new Error(`Unsupported transform type: ${(expr as any).type}`);
    }
  }

  private convertArithmeticTransform(expr: ArithmeticTransform): SafeTransform {
    return {
      type: 'arithmetic',
      op: (ARITHMETIC_OP_MAP[expr.operator] || expr.operator) as any,
      operand: expr.value,
    };
  }

  private convertStringTransform(expr: StringTransform): SafeTransform {
    return {
      type: 'string',
      op: expr.operation as any,
      args: expr.value ? [expr.value] : undefined,
    };
  }

  private convertPropertyTransform(expr: PropertyTransform): SafeTransform {
    return {
      type: 'property',
      path: [expr.property],
    };
  }

  private convertConditionalTransform(expr: ConditionalTransform): SafeTransform {
    return {
      type: 'conditional',
      condition: this.convertPredicate(expr.condition),
      ifTrue: this.convertTransform(expr.thenTransform),
      ifFalse: this.convertTransform(expr.elseTransform),
    };
  }

  // Convert reduction operations
  private convertReductionOp(op: ReductionOperation): ReductionOp {
    switch (op) {
      case 'sum':
        return { type: 'sum' };
      case 'product':
        return { type: 'product' };
      case 'min':
        return { type: 'min' };
      case 'max':
        return { type: 'max' };
      case 'count':
        return { type: 'count' };
      case 'average':
        return { type: 'average' };
      case 'join':
        // Default separator is comma for join operations
        return { type: 'join', separator: ',' };
      case 'first':
        return { type: 'first' };
      case 'last':
        return { type: 'last' };
      default:
        // 'any' and 'all' require predicates which aren't available in ReductionOperation
        throw new Error(
          `Reduction operation '${op}' cannot be converted from AST. ` +
            `Operations 'any' and 'all' require predicates and must be handled differently.`
        );
    }
  }
}
