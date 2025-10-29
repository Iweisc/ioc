/**
 * Lexer for .ioc language
 *
 * Tokenizes .ioc source code into a stream of tokens.
 */

export enum TokenType {
  // Keywords
  INPUT = 'INPUT',
  OUTPUT = 'OUTPUT',
  FILTER = 'FILTER',
  MAP = 'MAP',
  REDUCE = 'REDUCE',
  WHERE = 'WHERE',
  WITH = 'WITH',
  BY = 'BY',
  IF = 'IF',
  THEN = 'THEN',
  ELSE = 'ELSE',
  LET = 'LET',
  AND = 'AND',
  OR = 'OR',
  NOT = 'NOT',

  // Operators
  GT = 'GT', // >
  LT = 'LT', // <
  GTE = 'GTE', // >=
  LTE = 'LTE', // <=
  EQ = 'EQ', // ==
  NEQ = 'NEQ', // !=
  ASSIGN = 'ASSIGN', // =
  PLUS = 'PLUS', // +
  MINUS = 'MINUS', // -
  STAR = 'STAR', // *
  SLASH = 'SLASH', // /
  PERCENT = 'PERCENT', // %
  DOT = 'DOT', // .

  // Delimiters
  LPAREN = 'LPAREN', // (
  RPAREN = 'RPAREN', // )
  LBRACKET = 'LBRACKET', // [
  RBRACKET = 'RBRACKET', // ]
  COLON = 'COLON', // :
  COMMA = 'COMMA', // ,

  // Literals
  IDENTIFIER = 'IDENTIFIER',
  NUMBER = 'NUMBER',
  STRING = 'STRING',
  BOOLEAN = 'BOOLEAN',

  // Special
  NEWLINE = 'NEWLINE',
  EOF = 'EOF',
}

export interface Token {
  type: TokenType;
  value: string;
  line: number;
  column: number;
}

const KEYWORDS: Record<string, TokenType> = {
  input: TokenType.INPUT,
  output: TokenType.OUTPUT,
  filter: TokenType.FILTER,
  map: TokenType.MAP,
  reduce: TokenType.REDUCE,
  where: TokenType.WHERE,
  with: TokenType.WITH,
  by: TokenType.BY,
  if: TokenType.IF,
  then: TokenType.THEN,
  else: TokenType.ELSE,
  let: TokenType.LET,
  and: TokenType.AND,
  or: TokenType.OR,
  not: TokenType.NOT,
  true: TokenType.BOOLEAN,
  false: TokenType.BOOLEAN,
};

export class Lexer {
  private source: string;
  private position: number = 0;
  private line: number = 1;
  private column: number = 1;

  constructor(source: string) {
    this.source = source;
  }

  tokenize(): Token[] {
    const tokens: Token[] = [];

    while (this.position < this.source.length) {
      const token = this.nextToken();
      if (token) {
        tokens.push(token);
      }
    }

    tokens.push({
      type: TokenType.EOF,
      value: '',
      line: this.line,
      column: this.column,
    });

    return tokens;
  }

  private nextToken(): Token | null {
    this.skipWhitespace();

    if (this.position >= this.source.length) {
      return null;
    }

    const char = this.current();
    const startLine = this.line;
    const startColumn = this.column;

    // Comments
    if (char === '#') {
      this.skipComment();
      return this.nextToken();
    }

    // Newlines (significant for statement separation)
    if (char === '\n') {
      this.advance();
      return {
        type: TokenType.NEWLINE,
        value: '\n',
        line: startLine,
        column: startColumn,
      };
    }

    // Numbers
    if (this.isDigit(char)) {
      return this.readNumber(startLine, startColumn);
    }

    // Strings
    if (char === '"' || char === "'") {
      return this.readString(startLine, startColumn);
    }

    // Identifiers and keywords
    if (this.isAlpha(char) || char === '_') {
      return this.readIdentifier(startLine, startColumn);
    }

    // Operators and delimiters
    return this.readOperator(startLine, startColumn);
  }

  private readNumber(startLine: number, startColumn: number): Token {
    let value = '';
    while (
      this.position < this.source.length &&
      (this.isDigit(this.current()) || this.current() === '.')
    ) {
      value += this.current();
      this.advance();
    }
    return {
      type: TokenType.NUMBER,
      value,
      line: startLine,
      column: startColumn,
    };
  }

  private readString(startLine: number, startColumn: number): Token {
    const quote = this.current();
    this.advance(); // skip opening quote

    let value = '';
    while (this.position < this.source.length && this.current() !== quote) {
      if (this.current() === '\\') {
        this.advance();
        // Handle escape sequences
        const next = this.current();
        switch (next) {
          case 'n':
            value += '\n';
            break;
          case 't':
            value += '\t';
            break;
          case '\\':
            value += '\\';
            break;
          case '"':
            value += '"';
            break;
          case "'":
            value += "'";
            break;
          default:
            value += next;
        }
        this.advance();
      } else {
        value += this.current();
        this.advance();
      }
    }

    if (this.current() === quote) {
      this.advance(); // skip closing quote
    } else {
      throw new Error(`Unterminated string at line ${startLine}, column ${startColumn}`);
    }

    return {
      type: TokenType.STRING,
      value,
      line: startLine,
      column: startColumn,
    };
  }

  private readIdentifier(startLine: number, startColumn: number): Token {
    let value = '';
    while (
      this.position < this.source.length &&
      (this.isAlphaNumeric(this.current()) || this.current() === '_')
    ) {
      value += this.current();
      this.advance();
    }

    const type = KEYWORDS[value] || TokenType.IDENTIFIER;

    return {
      type,
      value,
      line: startLine,
      column: startColumn,
    };
  }

  private readOperator(startLine: number, startColumn: number): Token {
    const char = this.current();
    this.advance();

    // Two-character operators
    if (this.position < this.source.length) {
      const next = this.current();
      const twoChar = char + next;

      const twoCharOps: Record<string, TokenType> = {
        '>=': TokenType.GTE,
        '<=': TokenType.LTE,
        '==': TokenType.EQ,
        '!=': TokenType.NEQ,
      };

      if (twoCharOps[twoChar]) {
        this.advance();
        return {
          type: twoCharOps[twoChar],
          value: twoChar,
          line: startLine,
          column: startColumn,
        };
      }
    }

    // Single-character operators
    const singleCharOps: Record<string, TokenType> = {
      '>': TokenType.GT,
      '<': TokenType.LT,
      '=': TokenType.ASSIGN,
      '+': TokenType.PLUS,
      '-': TokenType.MINUS,
      '*': TokenType.STAR,
      '/': TokenType.SLASH,
      '%': TokenType.PERCENT,
      '.': TokenType.DOT,
      '(': TokenType.LPAREN,
      ')': TokenType.RPAREN,
      '[': TokenType.LBRACKET,
      ']': TokenType.RBRACKET,
      ':': TokenType.COLON,
      ',': TokenType.COMMA,
    };

    if (singleCharOps[char]) {
      return {
        type: singleCharOps[char],
        value: char,
        line: startLine,
        column: startColumn,
      };
    }

    throw new Error(`Unexpected character '${char}' at line ${startLine}, column ${startColumn}`);
  }

  private skipWhitespace(): void {
    while (this.position < this.source.length) {
      const char = this.current();
      if (char === ' ' || char === '\t' || char === '\r') {
        this.advance();
      } else {
        break;
      }
    }
  }

  private skipComment(): void {
    while (this.position < this.source.length && this.current() !== '\n') {
      this.advance();
    }
  }

  private current(): string {
    return this.source[this.position] || '';
  }

  private advance(): void {
    if (this.current() === '\n') {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
    this.position++;
  }

  private isDigit(char: string): boolean {
    return char >= '0' && char <= '9';
  }

  private isAlpha(char: string): boolean {
    return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z');
  }

  private isAlphaNumeric(char: string): boolean {
    return this.isAlpha(char) || this.isDigit(char);
  }
}
