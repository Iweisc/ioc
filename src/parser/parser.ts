/**
 * Parser for .ioc language
 *
 * Converts token stream into Abstract Syntax Tree (AST).
 */

import { Token, TokenType } from './lexer';
import {
  Program,
  ASTNode,
  InputDeclaration,
  FilterStatement,
  MapStatement,
  ReduceStatement,
  OutputStatement,
  IfStatement,
  LetStatement,
  PredicateExpression,
  TransformExpression,
  ReductionOperation,
  ComparisonPredicate,
  PropertyPredicate,
  ArithmeticTransform,
  StringTransform,
  PropertyTransform,
} from './ast';

export class Parser {
  private tokens: Token[];
  private position: number = 0;

  constructor(tokens: Token[]) {
    // Filter out newlines for easier parsing (we don't need them for semantics)
    this.tokens = tokens.filter((t) => t.type !== TokenType.NEWLINE);
  }

  parse(): Program {
    const statements: ASTNode[] = [];

    while (!this.isAtEnd()) {
      const statement = this.parseStatement();
      if (statement) {
        statements.push(statement);
      }
    }

    return { statements };
  }

  private parseStatement(): ASTNode | null {
    const token = this.current();

    switch (token.type) {
      case TokenType.INPUT:
        return this.parseInput();
      case TokenType.OUTPUT:
        return this.parseOutput();
      case TokenType.IDENTIFIER:
        return this.parseAssignment();
      case TokenType.IF:
        return this.parseIf();
      case TokenType.LET:
        return this.parseLet();
      default:
        throw this.error(`Unexpected token: ${token.value}`);
    }
  }

  // input numbers: number[]
  private parseInput(): InputDeclaration {
    this.consume(TokenType.INPUT);
    const name = this.consume(TokenType.IDENTIFIER).value;

    let dataType: string | undefined;
    if (this.check(TokenType.COLON)) {
      this.advance();
      dataType = this.parseType();
    }

    return {
      type: 'input',
      name,
      dataType,
    };
  }

  // output result
  private parseOutput(): OutputStatement {
    this.consume(TokenType.OUTPUT);
    const source = this.consume(TokenType.IDENTIFIER).value;

    return {
      type: 'output',
      source,
    };
  }

  // Assignment statements: filtered = filter ...
  private parseAssignment(): ASTNode {
    const target = this.consume(TokenType.IDENTIFIER).value;
    this.consume(TokenType.ASSIGN);

    const keyword = this.current();

    switch (keyword.type) {
      case TokenType.FILTER:
        return this.parseFilter(target);
      case TokenType.MAP:
        return this.parseMap(target);
      case TokenType.REDUCE:
        return this.parseReduce(target);
      default:
        throw this.error(`Expected filter, map, or reduce after assignment`);
    }
  }

  // filtered = filter numbers where x > 10
  private parseFilter(target: string): FilterStatement {
    this.consume(TokenType.FILTER);
    const source = this.consume(TokenType.IDENTIFIER).value;
    this.consume(TokenType.WHERE);

    const predicate = this.parsePredicate();

    return {
      type: 'filter',
      target,
      source,
      predicate,
    };
  }

  // doubled = map numbers with x * 2
  private parseMap(target: string): MapStatement {
    this.consume(TokenType.MAP);
    const source = this.consume(TokenType.IDENTIFIER).value;
    this.consume(TokenType.WITH);

    const transform = this.parseTransform();

    return {
      type: 'map',
      target,
      source,
      transform,
    };
  }

  // total = reduce numbers by sum
  private parseReduce(target: string): ReduceStatement {
    this.consume(TokenType.REDUCE);
    const source = this.consume(TokenType.IDENTIFIER).value;
    this.consume(TokenType.BY);

    const operation = this.parseReductionOp();

    return {
      type: 'reduce',
      target,
      source,
      operation,
    };
  }

  // if condition then branch1 else branch2
  private parseIf(): IfStatement {
    this.consume(TokenType.IF);

    // Parse result target (optional syntactic sugar: result = if ...)
    let target = '_if_result';

    const condition = this.parsePredicate();
    this.consume(TokenType.THEN);
    const thenBranch = this.consume(TokenType.IDENTIFIER).value;
    this.consume(TokenType.ELSE);
    const elseBranch = this.consume(TokenType.IDENTIFIER).value;

    return {
      type: 'if',
      target,
      condition,
      thenBranch,
      elseBranch,
    };
  }

  // let x = value
  private parseLet(): LetStatement {
    this.consume(TokenType.LET);
    const target = this.consume(TokenType.IDENTIFIER).value;
    this.consume(TokenType.ASSIGN);

    // For now, only support variable references
    const value = {
      type: 'variable' as const,
      name: this.consume(TokenType.IDENTIFIER).value,
    };

    return {
      type: 'let',
      target,
      value,
    };
  }

  // Parse predicates: x > 10, x.age == 18, etc.
  private parsePredicate(): PredicateExpression {
    // Check for logical operators first
    if (this.match(TokenType.NOT)) {
      const pred = this.parsePredicate();
      return {
        type: 'logical',
        operator: 'not',
        predicates: [pred],
      };
    }

    const left = this.parseComparisonPredicate();

    // Check for AND/OR
    if (this.check(TokenType.AND) || this.check(TokenType.OR)) {
      const operator = this.match(TokenType.AND) ? 'and' : 'or';
      this.advance();
      const right = this.parsePredicate();

      return {
        type: 'logical',
        operator,
        predicates: [left, right],
      };
    }

    return left;
  }

  private parseComparisonPredicate(): PredicateExpression {
    // x.property comparator value
    const nextToken = this.peekAhead(1);
    if (this.check(TokenType.IDENTIFIER) && nextToken && nextToken.type === TokenType.DOT) {
      this.advance(); // skip 'x'
      this.consume(TokenType.DOT);
      const property = this.consume(TokenType.IDENTIFIER).value;
      const operator = this.parseComparisonOperator();
      const value = this.parseLiteralValue();

      return {
        type: 'property',
        property,
        operator,
        value,
      } as PropertyPredicate;
    }

    // x comparator value
    if (this.check(TokenType.IDENTIFIER)) {
      this.advance(); // skip 'x'
      const operator = this.parseComparisonOperator();
      const value = this.parseLiteralValue();

      return {
        type: 'comparison',
        operator,
        value,
      } as ComparisonPredicate;
    }

    throw this.error('Expected predicate expression');
  }

  private parseComparisonOperator(): 'gt' | 'lt' | 'gte' | 'lte' | 'eq' | 'neq' {
    const token = this.current();
    this.advance();

    switch (token.type) {
      case TokenType.GT:
        return 'gt';
      case TokenType.LT:
        return 'lt';
      case TokenType.GTE:
        return 'gte';
      case TokenType.LTE:
        return 'lte';
      case TokenType.EQ:
        return 'eq';
      case TokenType.NEQ:
        return 'neq';
      default:
        throw this.error('Expected comparison operator');
    }
  }

  // Parse transforms: x * 2, x + 10, uppercase(x), etc.
  private parseTransform(): TransformExpression {
    // Property access: x.name
    let nextToken = this.peekAhead(1);
    if (this.check(TokenType.IDENTIFIER) && nextToken && nextToken.type === TokenType.DOT) {
      this.advance(); // skip 'x'
      this.consume(TokenType.DOT);
      const property = this.consume(TokenType.IDENTIFIER).value;

      return {
        type: 'property',
        property,
      } as PropertyTransform;
    }

    // Function calls: uppercase(x), lowercase(x)
    nextToken = this.peekAhead(1);
    if (this.check(TokenType.IDENTIFIER) && nextToken && nextToken.type === TokenType.LPAREN) {
      const funcName = this.consume(TokenType.IDENTIFIER).value;
      this.consume(TokenType.LPAREN);
      this.consume(TokenType.IDENTIFIER); // skip 'x'
      this.consume(TokenType.RPAREN);

      return this.parseStringTransform(funcName);
    }

    // Arithmetic: x * 2, x + 10
    if (this.check(TokenType.IDENTIFIER)) {
      this.advance(); // skip 'x'
      const operator = this.parseArithmeticOperator();
      const value = parseFloat(this.consume(TokenType.NUMBER).value);

      return {
        type: 'arithmetic',
        operator,
        value,
      } as ArithmeticTransform;
    }

    throw this.error('Expected transform expression');
  }

  private parseArithmeticOperator(): 'multiply' | 'add' | 'subtract' | 'divide' | 'mod' {
    const token = this.current();
    this.advance();

    switch (token.type) {
      case TokenType.STAR:
        return 'multiply';
      case TokenType.PLUS:
        return 'add';
      case TokenType.MINUS:
        return 'subtract';
      case TokenType.SLASH:
        return 'divide';
      case TokenType.PERCENT:
        return 'mod';
      default:
        throw this.error('Expected arithmetic operator');
    }
  }

  private parseStringTransform(funcName: string): StringTransform {
    switch (funcName) {
      case 'uppercase':
        return { type: 'string', operation: 'uppercase' };
      case 'lowercase':
        return { type: 'string', operation: 'lowercase' };
      case 'trim':
        return { type: 'string', operation: 'trim' };
      default:
        throw this.error(`Unknown string function: ${funcName}`);
    }
  }

  private parseReductionOp(): ReductionOperation {
    const token = this.consume(TokenType.IDENTIFIER);
    const op = token.value.toLowerCase();

    const validOps = ['sum', 'product', 'max', 'min', 'average', 'count', 'first', 'last', 'join'];
    if (validOps.includes(op)) {
      return op as ReductionOperation;
    }

    throw this.error(`Unknown reduction operation: ${op}`);
  }

  private parseType(): string {
    let type = this.consume(TokenType.IDENTIFIER).value;

    // Handle array types: number[]
    if (this.check(TokenType.LBRACKET)) {
      this.advance();
      this.consume(TokenType.RBRACKET);
      type += '[]';
    }

    return type;
  }

  private parseLiteralValue(): number | string | boolean {
    const token = this.current();
    this.advance();

    switch (token.type) {
      case TokenType.NUMBER:
        return parseFloat(token.value);
      case TokenType.STRING:
        return token.value;
      case TokenType.BOOLEAN:
        return token.value === 'true';
      default:
        throw this.error('Expected literal value');
    }
  }

  // Utility methods
  private current(): Token {
    if (this.position >= this.tokens.length) {
      const lastToken = this.tokens[this.tokens.length - 1];
      if (!lastToken) {
        throw new Error('Empty token stream');
      }
      return lastToken; // Return EOF token
    }
    return this.tokens[this.position]!;
  }

  private check(type: TokenType): boolean {
    if (this.isAtEnd()) return false;
    return this.current().type === type;
  }

  private match(...types: TokenType[]): boolean {
    for (const type of types) {
      if (this.check(type)) {
        return true;
      }
    }
    return false;
  }

  private advance(): Token {
    if (!this.isAtEnd()) {
      this.position++;
    }
    const token = this.tokens[this.position - 1];
    if (!token) {
      throw new Error('Invalid token position');
    }
    return token;
  }

  private consume(type: TokenType): Token {
    if (this.check(type)) {
      return this.advance();
    }
    throw this.error(`Expected ${type}, got ${this.current().type}`);
  }

  private peekAhead(offset: number): Token | undefined {
    const pos = this.position + offset;
    if (pos >= this.tokens.length) return undefined;
    return this.tokens[pos];
  }

  private isAtEnd(): boolean {
    return this.current().type === TokenType.EOF;
  }

  private error(message: string): Error {
    const token = this.current();
    return new Error(`Parse error at line ${token.line}, column ${token.column}: ${message}`);
  }
}
