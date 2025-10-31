/**
 * Tests for parser refactoring:
 * - parseArithmeticOperator(consume) method
 * - try-catch logic in parseComparisonPredicate
 */

import { describe, it, expect } from 'vitest';
import { Lexer } from '../parser/lexer';
import { Parser } from '../parser/parser';
import { ASTToGraphConverter } from '../parser/ast-to-graph';

describe('Parser Refactoring - parseArithmeticOperator', () => {
  describe('Arithmetic Operator Detection (consume: false)', () => {
    it('should detect arithmetic operator in predicate without consuming', () => {
      const source = `
input numbers: number[]
evens = filter numbers where x % 2 == 0
output evens
      `.trim();

      const lexer = new Lexer(source);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      const filterStmt = ast.statements[1];
      expect(filterStmt!.type).toBe('filter');
      if (filterStmt!.type === 'filter') {
        expect(filterStmt!.predicate.type).toBe('arithmetic');
      }
    });

    it('should detect multiplication operator', () => {
      const source = `
input numbers: number[]
result = filter numbers where x * 2 > 10
output result
      `.trim();

      const lexer = new Lexer(source);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      const filterStmt = ast.statements[1];
      if (filterStmt!.type === 'filter' && filterStmt!.predicate.type === 'arithmetic') {
        expect(filterStmt!.predicate.arithmeticOp).toBe('multiply');
      }
    });

    it('should detect addition operator', () => {
      const source = `
input numbers: number[]
result = filter numbers where x + 5 < 20
output result
      `.trim();

      const lexer = new Lexer(source);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      const filterStmt = ast.statements[1];
      if (filterStmt!.type === 'filter' && filterStmt!.predicate.type === 'arithmetic') {
        expect(filterStmt!.predicate.arithmeticOp).toBe('add');
      }
    });

    it('should detect subtraction operator', () => {
      const source = `
input numbers: number[]
result = filter numbers where x - 10 >= 0
output result
      `.trim();

      const lexer = new Lexer(source);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      const filterStmt = ast.statements[1];
      if (filterStmt!.type === 'filter' && filterStmt!.predicate.type === 'arithmetic') {
        expect(filterStmt!.predicate.arithmeticOp).toBe('subtract');
      }
    });

    it('should detect division operator', () => {
      const source = `
input numbers: number[]
result = filter numbers where x / 2 <= 5
output result
      `.trim();

      const lexer = new Lexer(source);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      const filterStmt = ast.statements[1];
      if (filterStmt!.type === 'filter' && filterStmt!.predicate.type === 'arithmetic') {
        expect(filterStmt!.predicate.arithmeticOp).toBe('divide');
      }
    });

    it('should detect modulo operator', () => {
      const source = `
input numbers: number[]
result = filter numbers where x % 3 != 0
output result
      `.trim();

      const lexer = new Lexer(source);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      const filterStmt = ast.statements[1];
      if (filterStmt!.type === 'filter' && filterStmt!.predicate.type === 'arithmetic') {
        expect(filterStmt!.predicate.arithmeticOp).toBe('mod');
      }
    });
  });

  describe('Arithmetic Operator Consumption (consume: true)', () => {
    it('should consume operator in map transform', () => {
      const source = `
input numbers: number[]
doubled = map numbers with x * 2
output doubled
      `.trim();

      const lexer = new Lexer(source);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      const mapStmt = ast.statements[1];
      expect(mapStmt!.type).toBe('map');
      if (mapStmt!.type === 'map') {
        expect(mapStmt!.transform.type).toBe('arithmetic');
        if (mapStmt!.transform.type === 'arithmetic') {
          expect(mapStmt!.transform.operator).toBe('multiply');
          expect(mapStmt!.transform.value).toBe(2);
        }
      }
    });

    it('should handle all arithmetic operators in map', () => {
      const operations = [
        { op: '+', expected: 'add', value: 5 },
        { op: '-', expected: 'subtract', value: 3 },
        { op: '*', expected: 'multiply', value: 2 },
        { op: '/', expected: 'divide', value: 4 },
        { op: '%', expected: 'mod', value: 7 },
      ];

      operations.forEach(({ op, expected, value }) => {
        const source = `
input numbers: number[]
result = map numbers with x ${op} ${value}
output result
        `.trim();

        const lexer = new Lexer(source);
        const parser = new Parser(lexer.tokenize());
        const ast = parser.parse();

        const mapStmt = ast.statements[1];
        if (mapStmt!.type === 'map' && mapStmt!.transform.type === 'arithmetic') {
          expect(mapStmt!.transform.operator).toBe(expected);
          expect(mapStmt!.transform.value).toBe(value);
        }
      });
    });
  });

  describe('Try-Catch Logic in parseComparisonPredicate', () => {
    it('should fall through to simple comparison when no arithmetic operator', () => {
      const source = `
input numbers: number[]
positive = filter numbers where x > 0
output positive
      `.trim();

      const lexer = new Lexer(source);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      const filterStmt = ast.statements[1];
      expect(filterStmt!.type).toBe('filter');
      if (filterStmt!.type === 'filter') {
        expect(filterStmt!.predicate.type).toBe('comparison');
        if (filterStmt!.predicate.type === 'comparison') {
          expect(filterStmt!.predicate.operator).toBe('gt');
          expect(filterStmt!.predicate.value).toBe(0);
        }
      }
    });

    it('should handle comparison operators correctly in simple predicates', () => {
      const comparisons = [
        { op: '>', expected: 'gt', value: 10 },
        { op: '<', expected: 'lt', value: 5 },
        { op: '>=', expected: 'gte', value: 18 },
        { op: '<=', expected: 'lte', value: 65 },
        { op: '==', expected: 'eq', value: 42 },
        { op: '!=', expected: 'neq', value: 0 },
      ];

      comparisons.forEach(({ op, expected, value }) => {
        const source = `
input numbers: number[]
result = filter numbers where x ${op} ${value}
output result
        `.trim();

        const lexer = new Lexer(source);
        const parser = new Parser(lexer.tokenize());
        const ast = parser.parse();

        const filterStmt = ast.statements[1];
        if (filterStmt!.type === 'filter' && filterStmt!.predicate.type === 'comparison') {
          expect(filterStmt!.predicate.operator).toBe(expected);
          expect(filterStmt!.predicate.value).toBe(value);
        }
      });
    });

    it('should correctly distinguish between arithmetic and simple predicates', () => {
      const source = `
input numbers: number[]
simple = filter numbers where x > 5
arithmetic = filter numbers where x % 2 == 0
output arithmetic
      `.trim();

      const lexer = new Lexer(source);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      // First filter: simple comparison
      const simpleFilter = ast.statements[1];
      expect(simpleFilter!.type).toBe('filter');
      if (simpleFilter!.type === 'filter') {
        expect(simpleFilter!.predicate.type).toBe('comparison');
      }

      // Second filter: arithmetic predicate
      const arithmeticFilter = ast.statements[2];
      expect(arithmeticFilter!.type).toBe('filter');
      if (arithmeticFilter!.type === 'filter') {
        expect(arithmeticFilter!.predicate.type).toBe('arithmetic');
      }
    });
  });

  describe('Arithmetic Predicate Execution After Refactoring', () => {
    it('should correctly execute modulo predicate', () => {
      const source = `
input numbers: number[]
evens = filter numbers where x % 2 == 0
output evens
      `.trim();

      const lexer = new Lexer(source);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      const converter = new ASTToGraphConverter();
      const graph = converter.convert(ast);
      const compiledFn = graph.compile();

      expect(compiledFn([1, 2, 3, 4, 5, 6])).toEqual([2, 4, 6]);
    });

    it('should correctly execute multiplication predicate', () => {
      const source = `
input numbers: number[]
result = filter numbers where x * 3 > 10
output result
      `.trim();

      const lexer = new Lexer(source);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      const converter = new ASTToGraphConverter();
      const graph = converter.convert(ast);
      const compiledFn = graph.compile();

      expect(compiledFn([1, 2, 3, 4, 5])).toEqual([4, 5]);
    });

    it('should correctly execute simple comparison after try-catch fallthrough', () => {
      const source = `
input numbers: number[]
positive = filter numbers where x > 0
output positive
      `.trim();

      const lexer = new Lexer(source);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      const converter = new ASTToGraphConverter();
      const graph = converter.convert(ast);
      const compiledFn = graph.compile();

      expect(compiledFn([1, -2, 3, -4, 5])).toEqual([1, 3, 5]);
    });

    it('should correctly execute map operations', () => {
      const source = `
input numbers: number[]
doubled = map numbers with x * 2
output doubled
      `.trim();

      const lexer = new Lexer(source);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      const converter = new ASTToGraphConverter();
      const graph = converter.convert(ast);
      const compiledFn = graph.compile();

      expect(compiledFn([1, 2, 3])).toEqual([2, 4, 6]);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle negative values in arithmetic predicates', () => {
      const source = `
input numbers: number[]
result = filter numbers where x + -5 == 0
output result
      `.trim();

      const lexer = new Lexer(source);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      const converter = new ASTToGraphConverter();
      const graph = converter.convert(ast);
      const compiledFn = graph.compile();

      expect(compiledFn([5, -5, 0, 10])).toEqual([5]);
    });

    it('should handle decimal values in arithmetic operations', () => {
      const source = `
input numbers: number[]
result = filter numbers where x * 0.5 > 2
output result
      `.trim();

      const lexer = new Lexer(source);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      const converter = new ASTToGraphConverter();
      const graph = converter.convert(ast);
      const compiledFn = graph.compile();

      expect(compiledFn([1, 2, 3, 4, 5, 6])).toEqual([5, 6]);
    });

    it('should throw error on invalid operator in predicate', () => {
      const source = `
input numbers: number[]
result = filter numbers where x @ 2 == 0
output result
      `.trim();

      const lexer = new Lexer(source);

      // Lexer should fail on invalid operator
      expect(() => lexer.tokenize()).toThrow();
    });
  });

  describe('Complex Integration Tests', () => {
    it('should handle mixed arithmetic and simple predicates in pipeline', () => {
      const source = `
input numbers: number[]
positive = filter numbers where x > 0
evens = filter positive where x % 2 == 0
large = filter evens where x > 10
output large
      `.trim();

      const lexer = new Lexer(source);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      const converter = new ASTToGraphConverter();
      const graph = converter.convert(ast);
      const compiledFn = graph.compile();

      expect(compiledFn([1, 2, 4, 8, 12, 15, 20])).toEqual([12, 20]);
    });

    it('should handle arithmetic in both predicates and transforms', () => {
      const source = `
input numbers: number[]
multiples_of_three = filter numbers where x % 3 == 0
doubled = map multiples_of_three with x * 2
large = filter doubled where x > 10
output large
      `.trim();

      const lexer = new Lexer(source);
      const parser = new Parser(lexer.tokenize());
      const ast = parser.parse();

      const converter = new ASTToGraphConverter();
      const graph = converter.convert(ast);
      const compiledFn = graph.compile();

      // Multiples of 3: [3, 6, 9, 12, 15]
      // Doubled: [6, 12, 18, 24, 30]
      // Large (>10): [12, 18, 24, 30]
      expect(compiledFn([1, 2, 3, 6, 9, 12, 15])).toEqual([12, 18, 24, 30]);
    });
  });
});
