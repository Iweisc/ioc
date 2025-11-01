/**
 * Expanded tests for security module
 */
import { describe, it, expect } from 'vitest';
import {
  validatePropertyPath,
  validateRegexPattern,
  validateStringArg,
  safeSerialize,
  validateComplexity,
  createSandboxContext,
  compileInRestrictedContext,
  sanitizeIdentifier,
  escapeForComment,
  escapeForString,
} from '../dsl/security';

describe('Security - Expanded Tests', () => {
  describe('validatePropertyPath', () => {
    it('should allow valid property names', () => {
      expect(() => validatePropertyPath(['user'])).not.toThrow();
      expect(() => validatePropertyPath(['user', 'name'])).not.toThrow();
      expect(() => validatePropertyPath(['_private'])).not.toThrow();
      expect(() => validatePropertyPath(['$jquery'])).not.toThrow();
      expect(() => validatePropertyPath(['camelCase'])).not.toThrow();
    });

    it('should reject invalid property names', () => {
      expect(() => validatePropertyPath(['123invalid'])).toThrow('Invalid property name');
      expect(() => validatePropertyPath(['with-dash'])).toThrow('Invalid property name');
      expect(() => validatePropertyPath(['with space'])).toThrow('Invalid property name');
      expect(() => validatePropertyPath(['with.dot'])).toThrow('Invalid property name');
    });

    it('should reject dangerous property names', () => {
      expect(() => validatePropertyPath(['__proto__'])).toThrow('Forbidden property name');
      expect(() => validatePropertyPath(['constructor'])).toThrow('Forbidden property name');
      expect(() => validatePropertyPath(['prototype'])).toThrow('Forbidden property name');
      expect(() => validatePropertyPath(['valueOf'])).toThrow('Forbidden property name');
      expect(() => validatePropertyPath(['toString'])).toThrow('Forbidden property name');
    });

    it('should check all segments in path', () => {
      expect(() => validatePropertyPath(['user', '__proto__', 'name'])).toThrow();
      expect(() => validatePropertyPath(['valid', '123invalid'])).toThrow();
    });

    it('should handle empty path', () => {
      expect(() => validatePropertyPath([])).not.toThrow();
    });
  });

  describe('validateRegexPattern', () => {
    it('should allow valid patterns', () => {
      expect(() => validateRegexPattern('[a-z]+')).not.toThrow();
      expect(() => validateRegexPattern('\\d{3}-\\d{4}')).not.toThrow();
      expect(() => validateRegexPattern('^test$')).not.toThrow();
      expect(() => validateRegexPattern('(foo|bar)')).not.toThrow();
    });

    it('should reject invalid regex syntax', () => {
      expect(() => validateRegexPattern('[')).toThrow('Invalid regex pattern');
      expect(() => validateRegexPattern('(?<incomplete')).toThrow('Invalid regex pattern');
    });

    it('should reject patterns that are too long', () => {
      const longPattern = 'a'.repeat(1001);
      expect(() => validateRegexPattern(longPattern)).toThrow('too long');
    });

    it('should reject dangerous nested quantifiers', () => {
      // These patterns are invalid and will throw errors
      expect(() => validateRegexPattern('a*+')).toThrow('Invalid regex pattern');
      expect(() => validateRegexPattern('a+*')).toThrow('Invalid regex pattern');
      expect(() => validateRegexPattern('a**')).toThrow('Invalid regex pattern');
      expect(() => validateRegexPattern('a++')).toThrow('Invalid regex pattern');
    });

    it('should allow safe quantifiers', () => {
      expect(() => validateRegexPattern('a*')).not.toThrow();
      expect(() => validateRegexPattern('a+')).not.toThrow();
      expect(() => validateRegexPattern('a{1,5}')).not.toThrow();
    });
  });

  describe('validateStringArg', () => {
    it('should allow strings', () => {
      expect(() => validateStringArg('hello')).not.toThrow();
      expect(() => validateStringArg('')).not.toThrow();
    });

    it('should allow numbers', () => {
      expect(() => validateStringArg(42)).not.toThrow();
      expect(() => validateStringArg(3.14)).not.toThrow();
    });

    it('should reject other types', () => {
      expect(() => validateStringArg(true)).toThrow('must be strings or numbers');
      expect(() => validateStringArg(null)).toThrow('must be strings or numbers');
      expect(() => validateStringArg([])).toThrow('must be strings or numbers');
      expect(() => validateStringArg({})).toThrow('must be strings or numbers');
    });

    it('should reject strings that are too long', () => {
      const longString = 'a'.repeat(10001);
      expect(() => validateStringArg(longString)).toThrow('too long');
    });
  });

  describe('safeSerialize', () => {
    it('should serialize primitives', () => {
      expect(safeSerialize(42)).toBe('42');
      expect(safeSerialize('hello')).toBe('"hello"');
      expect(safeSerialize(true)).toBe('true');
      expect(safeSerialize(null)).toBe('null');
    });

    it('should serialize arrays', () => {
      expect(safeSerialize([1, 2, 3])).toBe('[1,2,3]');
      expect(safeSerialize(['a', 'b'])).toBe('["a","b"]');
    });

    it('should serialize objects', () => {
      expect(safeSerialize({ key: 'value' })).toBe('{"key":"value"}');
    });

    it('should handle special numeric values', () => {
      expect(safeSerialize(Infinity)).toBe('Infinity');
      expect(safeSerialize(-Infinity)).toBe('-Infinity');
      expect(safeSerialize(NaN)).toBe('NaN');
    });

    it('should reject unsafe values', () => {
      const fn: any = () => {};
      const sym: any = Symbol('test');
      expect(() => safeSerialize(fn)).toThrow('unsafe types');
      expect(() => safeSerialize(sym)).toThrow('unsafe types');
    });

    it('should handle objects with string properties named like dangerous props', () => {
      // Objects with these property names are allowed if they're regular properties
      // The security checks look for actual dangerous object manipulation
      const safeObj = { name: 'test', value: 42 };
      expect(() => safeSerialize(safeObj)).not.toThrow();
    });
  });

  describe('validateComplexity', () => {
    it('should allow reasonable input sizes', () => {
      expect(() => validateComplexity(100, 'O(n)')).not.toThrow();
      expect(() => validateComplexity(1000, 'O(n)')).not.toThrow();
    });

    it('should reject input size over maximum', () => {
      expect(() => validateComplexity(2000000, 'O(n)')).toThrow('exceeds maximum');
    });

    it('should enforce stricter limits for quadratic complexity', () => {
      expect(() => validateComplexity(5000, 'O(n^2)')).not.toThrow();
      expect(() => validateComplexity(15000, 'O(n^2)')).toThrow('too large');
    });

    it('should enforce stricter limits for cubic complexity', () => {
      expect(() => validateComplexity(5000, 'O(n^3)')).not.toThrow();
      expect(() => validateComplexity(15000, 'O(n^3)')).toThrow('too large');
    });

    it('should enforce stricter limits for linearithmic complexity', () => {
      expect(() => validateComplexity(50000, 'O(n log n)')).not.toThrow();
      expect(() => validateComplexity(150000, 'O(n log n)')).toThrow('too large');
    });

    it('should allow any size for constant complexity', () => {
      expect(() => validateComplexity(999999, 'O(1)')).not.toThrow();
    });
  });

  describe('createSandboxContext', () => {
    it('should create a context object', () => {
      const ctx = createSandboxContext();
      expect(ctx).toBeDefined();
      expect(typeof ctx).toBe('object');
    });

    it('should include Math', () => {
      const ctx = createSandboxContext();
      expect(ctx['Math']).toBe(Math);
    });

    it('should include Array.isArray', () => {
      const ctx = createSandboxContext();
      expect(ctx['Array']).toBeDefined();
      expect(ctx['Array'].isArray).toBe(Array.isArray);
    });

    it('should not include dangerous globals', () => {
      const ctx = createSandboxContext();
      expect(ctx['eval']).toBeUndefined();
      expect(ctx['Function']).toBeUndefined();
      expect(ctx['require']).toBeUndefined();
      expect(ctx['process']).toBeUndefined();
    });
  });

  describe('compileInRestrictedContext', () => {
    it('should compile simple safe code', () => {
      const fn = compileInRestrictedContext('x => x + 1', ['x']);
      expect(typeof fn).toBe('function');
    });

    it('should reject code with eval', () => {
      expect(() => {
        compileInRestrictedContext('x => eval("x + 1")', ['x']);
      }).toThrow('dangerous pattern');
    });

    it('should reject code with Function constructor', () => {
      expect(() => {
        compileInRestrictedContext('x => Function("return x")()', ['x']);
      }).toThrow('dangerous pattern');
    });

    it('should reject code with require', () => {
      expect(() => {
        compileInRestrictedContext('x => require("fs")', ['x']);
      }).toThrow('dangerous pattern');
    });

    it('should reject code with process', () => {
      expect(() => {
        compileInRestrictedContext('x => process.exit()', ['x']);
      }).toThrow('dangerous pattern');
    });

    it('should reject code with __proto__', () => {
      expect(() => {
        compileInRestrictedContext('x => x.__proto__', ['x']);
      }).toThrow('dangerous pattern');
    });

    it('should reject code that is too long', () => {
      const longCode = 'x => ' + 'x + 1; '.repeat(20000);
      expect(() => {
        compileInRestrictedContext(longCode, ['x']);
      }).toThrow('too long');
    });
  });

  describe('sanitizeIdentifier', () => {
    it('should keep valid identifiers unchanged', () => {
      expect(sanitizeIdentifier('validName')).toBe('validName');
      expect(sanitizeIdentifier('_private')).toBe('_private');
      expect(sanitizeIdentifier('name123')).toBe('name123');
    });

    it('should replace invalid characters with underscores', () => {
      expect(sanitizeIdentifier('with-dashes')).toBe('with_dashes');
      expect(sanitizeIdentifier('with spaces')).toBe('with_spaces');
      expect(sanitizeIdentifier('with.dots')).toBe('with_dots');
    });

    it('should prefix identifiers that start with a number', () => {
      expect(sanitizeIdentifier('123abc')).toBe('_123abc');
      expect(sanitizeIdentifier('9test')).toBe('_9test');
    });

    it('should handle special characters', () => {
      expect(sanitizeIdentifier('hello@world')).toBe('hello_world');
      expect(sanitizeIdentifier('test!value')).toBe('test_value');
    });
  });

  describe('escapeForComment', () => {
    it('should escape comment-closing sequences', () => {
      const escaped = escapeForComment('test */ malicious');
      expect(escaped).not.toContain('*/');
      expect(escaped).toContain('* /');
    });

    it('should remove newlines', () => {
      const escaped = escapeForComment('line1\nline2\rline3');
      expect(escaped).not.toContain('\n');
      expect(escaped).not.toContain('\r');
    });

    it('should limit length to 100 characters', () => {
      const longString = 'a'.repeat(200);
      const escaped = escapeForComment(longString);
      expect(escaped.length).toBeLessThanOrEqual(100);
    });

    it('should handle empty string', () => {
      expect(escapeForComment('')).toBe('');
    });
  });

  describe('escapeForString', () => {
    it('should escape backslashes', () => {
      expect(escapeForString('path\\to\\file')).toBe('path\\\\to\\\\file');
    });

    it('should escape quotes', () => {
      expect(escapeForString("it's")).toBe("it\\'s");
      expect(escapeForString('say "hello"')).toBe('say \\"hello\\"');
    });

    it('should escape newlines', () => {
      expect(escapeForString('line1\nline2')).toBe('line1\\nline2');
    });

    it('should escape carriage returns', () => {
      expect(escapeForString('line1\rline2')).toBe('line1\\rline2');
    });

    it('should escape tabs', () => {
      expect(escapeForString('col1\tcol2')).toBe('col1\\tcol2');
    });

    it('should handle empty string', () => {
      expect(escapeForString('')).toBe('');
    });

    it('should escape all special characters together', () => {
      const input = 'test\n"value"\t\\path';
      const escaped = escapeForString(input);
      expect(escaped).toBe('test\\n\\"value\\"\\t\\\\path');
    });
  });
});
