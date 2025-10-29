/**
 * Parser tests
 */

import { describe, it, expect } from 'vitest';
import { Lexer } from '../parser/lexer';
import { Parser } from '../parser/parser';
import { ASTToGraphConverter } from '../parser/ast-to-graph';

describe('IOC Parser', () => {
  it('should parse simple pipeline', () => {
    const source = `
input numbers: number[]
positive = filter numbers where x > 0
doubled = map positive with x * 2
total = reduce doubled by sum
output total
    `.trim();

    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const parser = new Parser(tokens);
    const ast = parser.parse();

    expect(ast.statements).toHaveLength(5);
    expect(ast.statements[0]!.type).toBe('input');
    expect(ast.statements[1]!.type).toBe('filter');
    expect(ast.statements[2]!.type).toBe('map');
    expect(ast.statements[3]!.type).toBe('reduce');
    expect(ast.statements[4]!.type).toBe('output');
  });

  it('should parse property access', () => {
    const source = `
input users: object[]
adults = filter users where x.age >= 18
output adults
    `.trim();

    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const parser = new Parser(tokens);
    const ast = parser.parse();

    const filterStmt = ast.statements[1];
    expect(filterStmt!.type).toBe('filter');
    if (filterStmt!.type === 'filter') {
      expect(filterStmt.predicate.type).toBe('property');
    }
  });

  it('should compile to SafeGraph and execute', () => {
    const source = `
input numbers: number[]
doubled = map numbers with x * 2
output doubled
    `.trim();

    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const parser = new Parser(tokens);
    const ast = parser.parse();

    const converter = new ASTToGraphConverter();
    const graph = converter.convert(ast);

    const compiledFn = graph.compile();
    const result = compiledFn([1, 2, 3, 4, 5]);

    expect(result).toEqual([2, 4, 6, 8, 10]);
  });

  it('should handle full pipeline with filter, map, reduce', () => {
    const source = `
input numbers: number[]
positive = filter numbers where x > 0
doubled = map positive with x * 2
total = reduce doubled by sum
output total
    `.trim();

    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const parser = new Parser(tokens);
    const ast = parser.parse();

    const converter = new ASTToGraphConverter();
    const graph = converter.convert(ast);

    const compiledFn = graph.compile();
    const result = compiledFn([1, -2, 3, -4, 5]);

    // Filter: [1, 3, 5]
    // Map *2: [2, 6, 10]
    // Sum: 18
    expect(result).toBe(18);
  });

  it('should handle string operations', () => {
    const source = `
input words: string[]
uppercased = map words with uppercase(x)
output uppercased
    `.trim();

    const lexer = new Lexer(source);
    const tokens = lexer.tokenize();

    const parser = new Parser(tokens);
    const ast = parser.parse();

    const converter = new ASTToGraphConverter();
    const graph = converter.convert(ast);

    const compiledFn = graph.compile();
    const result = compiledFn(['hello', 'world']);

    expect(result).toEqual(['HELLO', 'WORLD']);
  });
});
