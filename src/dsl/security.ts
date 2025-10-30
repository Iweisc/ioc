/**
 * Security utilities for safe code generation
 *
 * Prevents code injection in the compiler by validating and sanitizing inputs
 */

import { SafeValue } from './safe-types.js';

/**
 * Validate that a property path contains only safe identifiers
 * Prevents code injection via property access
 */
export function validatePropertyPath(path: string[]): void {
  const identifierRegex = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/;

  for (const segment of path) {
    if (!identifierRegex.test(segment)) {
      throw new Error(
        `Invalid property name: "${segment}". ` +
          `Property names must be valid JavaScript identifiers.`
      );
    }

    // Block dangerous property names
    const dangerousNames = ['__proto__', 'constructor', 'prototype', 'valueOf', 'toString'];

    if (dangerousNames.includes(segment)) {
      throw new Error(
        `Forbidden property name: "${segment}". ` +
          `This property name is blocked for security reasons.`
      );
    }
  }
}

/**
 * Validate regex pattern is safe (no code execution)
 */
export function validateRegexPattern(pattern: string): void {
  try {
    // Test that it's a valid regex
    new RegExp(pattern);

    // Block patterns that could cause ReDoS or other issues
    // This is a basic check - production systems would want more sophisticated validation
    if (pattern.length > 1000) {
      throw new Error('Regex pattern too long (max 1000 characters)');
    }

    // Block nested quantifiers that can cause exponential backtracking
    if (/(\*\+|\+\*|\*\*|\+\+|\*\{|\+\{)/.test(pattern)) {
      throw new Error('Regex pattern contains potentially dangerous nested quantifiers');
    }
  } catch (error: any) {
    throw new Error(`Invalid regex pattern: ${error.message}`);
  }
}

/**
 * Validate string arguments for string operations
 */
export function validateStringArg(arg: SafeValue): void {
  if (typeof arg !== 'string' && typeof arg !== 'number') {
    throw new Error('String operation arguments must be strings or numbers');
  }

  if (typeof arg === 'string' && arg.length > 10000) {
    throw new Error('String argument too long (max 10000 characters)');
  }
}

/**
 * Safely serialize a value for code generation
 * Uses JSON.stringify but adds additional validation
 */
export function safeSerialize(value: SafeValue): string {
  // Validate the value is actually safe
  if (!isSafeValue(value)) {
    throw new Error('Value contains unsafe types');
  }

  try {
    return JSON.stringify(value);
  } catch (error: any) {
    throw new Error(`Failed to serialize value: ${error.message}`);
  }
}

/**
 * Check if a value is safe (no functions, symbols, etc.)
 */
function isSafeValue(value: any): boolean {
  if (value === null || value === undefined) {
    return true;
  }

  const type = typeof value;

  // Primitives are safe
  if (type === 'number' || type === 'string' || type === 'boolean') {
    return true;
  }

  // Functions and symbols are never safe
  if (type === 'function' || type === 'symbol') {
    return false;
  }

  // Arrays: check all elements
  if (Array.isArray(value)) {
    return value.every(isSafeValue);
  }

  // Objects: check all values
  if (type === 'object') {
    // Don't allow objects with dangerous properties
    if ('__proto__' in value || 'constructor' in value || 'prototype' in value) {
      return false;
    }

    return Object.values(value).every(isSafeValue);
  }

  return false;
}

/**
 * Validate complexity to prevent DoS via expensive operations
 */
export function validateComplexity(inputSize: number, complexityClass: string): void {
  const maxSize = 1000000; // 1 million elements max

  if (inputSize > maxSize) {
    throw new Error(`Input size ${inputSize} exceeds maximum ${maxSize}`);
  }

  // Additional checks based on complexity class
  switch (complexityClass) {
    case 'O(n^2)':
    case 'O(n^3)':
      if (inputSize > 10000) {
        throw new Error(
          `Input size ${inputSize} too large for ${complexityClass} operation (max 10000)`
        );
      }
      break;

    case 'O(n log n)':
      if (inputSize > 100000) {
        throw new Error(
          `Input size ${inputSize} too large for ${complexityClass} operation (max 100000)`
        );
      }
      break;
  }
}

/**
 * Create a sandbox context for executing compiled functions
 * Limits access to dangerous globals
 */
export function createSandboxContext(): Record<string, any> {
  // Only allow safe built-ins
  return {
    // Math operations
    Math: Math,

    // Type checking
    Array: {
      isArray: Array.isArray,
    },

    // No access to:
    // - eval, Function
    // - require, import
    // - process, global, globalThis
    // - fetch, XMLHttpRequest
    // - fs, child_process
  };
}

/**
 * Compile code in a restricted context
 * This is a defense-in-depth measure
 */
export function compileInRestrictedContext(code: string, paramNames: string[]): Function {
  // Validate code doesn't contain dangerous patterns
  validateGeneratedCode(code);

  // Use Function constructor with limited scope
  // Note: This is still not a complete sandbox, but better than nothing
  try {
    // eslint-disable-next-line no-new-func
    return new Function(...paramNames, `'use strict'; return (${code})`);
  } catch (error: any) {
    throw new Error(`Failed to compile safe code: ${error.message}`);
  }
}

/**
 * Validate generated code doesn't contain dangerous patterns
 */
function validateGeneratedCode(code: string): void {
  // Block obvious code injection attempts
  const dangerousPatterns = [
    /eval\s*\(/,
    /Function\s*\(/,
    /require\s*\(/,
    /import\s*\(/,
    /process\./,
    /global\./,
    /globalThis\./,
    /__proto__/,
    /constructor\s*\(/,
    /prototype\./,
  ];

  for (const pattern of dangerousPatterns) {
    if (pattern.test(code)) {
      throw new Error(`Generated code contains potentially dangerous pattern: ${pattern}`);
    }
  }

  // Validate code length to prevent DoS
  if (code.length > 100000) {
    throw new Error('Generated code too long (max 100KB)');
  }
}

/**
 * Sanitize a string to be safe for use as a JavaScript identifier
 * Ensures only alphanumeric and underscore characters
 */
export function sanitizeIdentifier(id: string): string {
  // Replace any non-alphanumeric/underscore characters with underscore
  // Ensure it starts with a letter or underscore
  const sanitized = id.replace(/[^a-zA-Z0-9_]/g, '_');

  // Ensure it starts with a letter or underscore
  if (!/^[a-zA-Z_]/.test(sanitized)) {
    return `_${sanitized}`;
  }

  return sanitized;
}

/**
 * Escape a string for safe use in a JavaScript comment
 * Prevents comment injection attacks
 */
export function escapeForComment(str: string): string {
  // Remove or escape characters that could break out of a comment
  return str
    .replace(/\*\//g, '* /') // Prevent closing comment block
    .replace(/\n/g, ' ') // Remove newlines
    .replace(/\r/g, ' ') // Remove carriage returns
    .substring(0, 100); // Limit length
}

/**
 * Escape a string for safe use in a JavaScript string literal
 * Prevents breaking out of the string
 */
export function escapeForString(str: string): string {
  return str
    .replace(/\\/g, '\\\\') // Escape backslashes
    .replace(/'/g, "\\'") // Escape single quotes
    .replace(/"/g, '\\"') // Escape double quotes
    .replace(/\n/g, '\\n') // Escape newlines
    .replace(/\r/g, '\\r') // Escape carriage returns
    .replace(/\t/g, '\\t'); // Escape tabs
}
