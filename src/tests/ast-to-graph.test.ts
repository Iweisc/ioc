/**
 * AST to Graph Converter Tests
 *
 * Tests for converting parsed AST to SafeGraph, especially for new arithmetic predicates
 */

import { describe, it, expect } from 'vitest';
import { ASTToGraphConverter } from '../parser/ast-to-graph';
import { Lexer } from '../parser/lexer';
import { Parser } from '../parser/parser';
import type { ArithmeticPredicate } from '../parser/ast';
import { SafeGraph } from '../dsl/safe-graph';

describe('ASTToGraphConverter', () => {
  describe('Arithmetic Predicate Conversion', () => {
    it('should convert modulo arithmetic predicate to SafeGraph', () => {
      const source = `
        input numbers: number[]
        filtered = filter numbers where x % 2 == 0
        output filtered
      `;

      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      const converter = new ASTToGraphConverter();
      const graph = converter.convert(ast);

      expect(graph).toBeInstanceOf(SafeGraph);

      const program = graph.toProgram();
      const filterNode = program.nodes.find((n) => n.type === 'filter');
      expect(filterNode).toBeDefined();
      expect(filterNode?.params).toHaveProperty('predicate');

      const predicate = (filterNode?.params as any).predicate;
      expect(predicate.type).toBe('compare_arithmetic');
      expect(predicate.arithmeticOp).toBe('mod');
      expect(predicate.arithmeticValue).toBe(2);
      expect(predicate.comparisonOp).toBe('eq');
      expect(predicate.comparisonValue).toBe(0);
    });

    it('should convert multiplication arithmetic predicate', () => {
      const source = `
        input data: number[]
        filtered = filter data where x * 3 > 10
        output filtered
      `;

      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      const converter = new ASTToGraphConverter();
      const graph = converter.convert(ast);

      const program = graph.toProgram();
      const filterNode = program.nodes.find((n) => n.type === 'filter');
      const predicate = (filterNode?.params as any).predicate;

      expect(predicate.type).toBe('compare_arithmetic');
      expect(predicate.arithmeticOp).toBe('multiply');
      expect(predicate.arithmeticValue).toBe(3);
      expect(predicate.comparisonOp).toBe('gt');
      expect(predicate.comparisonValue).toBe(10);
    });

    it('should convert addition arithmetic predicate', () => {
      const source = `
        input values: number[]
        filtered = filter values where x + 5 >= 10
        output filtered
      `;

      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      const converter = new ASTToGraphConverter();
      const graph = converter.convert(ast);

      const program = graph.toProgram();
      const filterNode = program.nodes.find((n) => n.type === 'filter');
      const predicate = (filterNode?.params as any).predicate;

      expect(predicate.arithmeticOp).toBe('add');
      expect(predicate.arithmeticValue).toBe(5);
      expect(predicate.comparisonOp).toBe('gte');
    });

    it('should convert subtraction arithmetic predicate', () => {
      const source = `
        input items: number[]
        filtered = filter items where x - 10 < 50
        output filtered
      `;

      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      const converter = new ASTToGraphConverter();
      const graph = converter.convert(ast);

      const program = graph.toProgram();
      const filterNode = program.nodes.find((n) => n.type === 'filter');
      const predicate = (filterNode?.params as any).predicate;

      expect(predicate.arithmeticOp).toBe('subtract');
      expect(predicate.arithmeticValue).toBe(10);
      expect(predicate.comparisonOp).toBe('lt');
      expect(predicate.comparisonValue).toBe(50);
    });

    it('should convert division arithmetic predicate', () => {
      const source = `
        input numbers: number[]
        filtered = filter numbers where x / 2 <= 25
        output filtered
      `;

      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      const converter = new ASTToGraphConverter();
      const graph = converter.convert(ast);

      const program = graph.toProgram();
      const filterNode = program.nodes.find((n) => n.type === 'filter');
      const predicate = (filterNode?.params as any).predicate;

      expect(predicate.arithmeticOp).toBe('divide');
      expect(predicate.arithmeticValue).toBe(2);
      expect(predicate.comparisonOp).toBe('lte');
      expect(predicate.comparisonValue).toBe(25);
    });

    it('should convert not-equal arithmetic predicate', () => {
      const source = `
        input data: number[]
        filtered = filter data where x % 3 != 0
        output filtered
      `;

      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      const converter = new ASTToGraphConverter();
      const graph = converter.convert(ast);

      const program = graph.toProgram();
      const filterNode = program.nodes.find((n) => n.type === 'filter');
      const predicate = (filterNode?.params as any).predicate;

      expect(predicate.comparisonOp).toBe('ne');
    });
  });

  describe('Arithmetic Predicate Compilation', () => {
    it('should create compilable graph with arithmetic predicate', () => {
      const source = `
        input numbers: number[]
        evens = filter numbers where x % 2 == 0
        output evens
      `;

      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      const converter = new ASTToGraphConverter();
      const graph = converter.convert(ast);
      const compiled = graph.compile();

      const result = compiled([1, 2, 3, 4, 5, 6, 7, 8]);
      expect(result).toEqual([2, 4, 6, 8]);
    });

    it('should filter using multiplication predicate', () => {
      const source = `
        input values: number[]
        filtered = filter values where x * 2 > 10
        output filtered
      `;

      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      const converter = new ASTToGraphConverter();
      const graph = converter.convert(ast);
      const compiled = graph.compile();

      const result = compiled([3, 5, 6, 10]);
      expect(result).toEqual([6, 10]);
    });

    it('should filter using addition predicate', () => {
      const source = `
        input items: number[]
        filtered = filter items where x + 10 >= 20
        output filtered
      `;

      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      const converter = new ASTToGraphConverter();
      const graph = converter.convert(ast);
      const compiled = graph.compile();

      const result = compiled([5, 10, 15, 20]);
      expect(result).toEqual([10, 15, 20]);
    });

    it('should handle complex pipeline with arithmetic predicate', () => {
      const source = `
        input numbers: number[]
        evens = filter numbers where x % 2 == 0
        doubled = map evens with x * 2
        total = reduce doubled by sum
        output total
      `;

      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      const converter = new ASTToGraphConverter();
      const graph = converter.convert(ast);
      const compiled = graph.compile();

      const result = compiled([1, 2, 3, 4, 5, 6]);
      expect(result).toBe(24); // (2 + 4 + 6) * 2 = 24
    });
  });

  describe('Edge Cases', () => {
    it('should handle negative arithmetic values in predicates', () => {
      const source = `
        input data: number[]
        filtered = filter data where x + -5 == 0
        output filtered
      `;

      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      const converter = new ASTToGraphConverter();
      const graph = converter.convert(ast);
      const compiled = graph.compile();

      const result = compiled([5, 10, 15]);
      expect(result).toEqual([5]);
    });

    it('should handle decimal arithmetic values', () => {
      const source = `
        input numbers: number[]
        filtered = filter numbers where x * 1.5 > 10
        output filtered
      `;

      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      const converter = new ASTToGraphConverter();
      const graph = converter.convert(ast);
      const compiled = graph.compile();

      const result = compiled([5, 7, 8, 10]);
      expect(result).toEqual([7, 8, 10]);
    });

    it('should handle zero as arithmetic value', () => {
      const source = `
        input items: number[]
        filtered = filter items where x + 0 == 5
        output filtered
      `;

      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      const converter = new ASTToGraphConverter();
      const graph = converter.convert(ast);
      const compiled = graph.compile();

      const result = compiled([3, 5, 7, 5, 10]);
      expect(result).toEqual([5, 5]);
    });
  });

  describe('Operator Mapping', () => {
    it('should map comparison operators correctly', () => {
      const operators = [
        { source: 'x % 2 == 0', expected: 'eq' },
        { source: 'x % 2 != 0', expected: 'ne' },
        { source: 'x * 2 > 10', expected: 'gt' },
        { source: 'x * 2 >= 10', expected: 'gte' },
        { source: 'x + 5 < 100', expected: 'lt' },
        { source: 'x + 5 <= 100', expected: 'lte' },
      ];

      operators.forEach(({ source: predicateStr, expected }) => {
        const fullSource = `
          input data: number[]
          filtered = filter data where ${predicateStr}
          output filtered
        `;

        const lexer = new Lexer(fullSource);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();

        const converter = new ASTToGraphConverter();
        const graph = converter.convert(ast);

        const program = graph.toProgram();
        const filterNode = program.nodes.find((n) => n.type === 'filter');
        const predicate = (filterNode?.params as any).predicate;

        expect(predicate.comparisonOp).toBe(expected);
      });
    });

    it('should map arithmetic operators correctly', () => {
      const operators = [
        { source: 'x * 2', expected: 'multiply' },
        { source: 'x + 2', expected: 'add' },
        { source: 'x - 2', expected: 'subtract' },
        { source: 'x / 2', expected: 'divide' },
        { source: 'x % 2', expected: 'mod' },
      ];

      operators.forEach(({ source: arithStr, expected }) => {
        const fullSource = `
          input data: number[]
          filtered = filter data where ${arithStr} == 0
          output filtered
        `;

        const lexer = new Lexer(fullSource);
        const tokens = lexer.tokenize();
        const parser = new Parser(tokens);
        const ast = parser.parse();

        const converter = new ASTToGraphConverter();
        const graph = converter.convert(ast);

        const program = graph.toProgram();
        const filterNode = program.nodes.find((n) => n.type === 'filter');
        const predicate = (filterNode?.params as any).predicate;

        expect(predicate.arithmeticOp).toBe(expected === 'mod' ? 'mod' : expected);
      });
    });
  });

  describe('Integration with existing predicates', () => {
    it('should work alongside simple comparison predicates', () => {
      // Test that arithmetic predicates don't break existing functionality
      const source1 = `
        input numbers: number[]
        filtered1 = filter numbers where x > 10
        output filtered1
      `;

      const lexer1 = new Lexer(source1);
      const parser1 = new Parser(lexer1.tokenize());
      const ast1 = parser1.parse();
      const graph1 = new ASTToGraphConverter().convert(ast1);
      const compiled1 = graph1.compile();

      expect(compiled1([5, 15, 25])).toEqual([15, 25]);

      const source2 = `
        input numbers: number[]
        filtered2 = filter numbers where x % 2 == 0
        output filtered2
      `;

      const lexer2 = new Lexer(source2);
      const parser2 = new Parser(lexer2.tokenize());
      const ast2 = parser2.parse();
      const graph2 = new ASTToGraphConverter().convert(ast2);
      const compiled2 = graph2.compile();

      expect(compiled2([1, 2, 3, 4])).toEqual([2, 4]);
    });

    it('should work alongside property predicates', () => {
      const source = `
        input items: object[]
        filtered = filter items where x.value > 10
        output filtered
      `;

      const lexer = new Lexer(source);
      const tokens = lexer.tokenize();
      const parser = new Parser(tokens);
      const ast = parser.parse();

      const converter = new ASTToGraphConverter();
      const graph = converter.convert(ast);
      const compiled = graph.compile();

      const result = compiled([{ value: 5 }, { value: 15 }, { value: 25 }]);
      expect(result).toEqual([{ value: 15 }, { value: 25 }]);
    });
  });
});