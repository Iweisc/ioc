/**
 * Tests for main index exports
 */
import { describe, it, expect } from 'vitest';
import { createSimpleProgram } from './test-helpers';

// Import all exports to ensure they're defined
import {
  // Parser
  Lexer,
  TokenType,
  Parser,
  ASTToGraphConverter,

  // IOC Program Format
  IOCIntentType,
  serializeIOC,
  deserializeIOC,
  loadIOCFile,
  saveIOCFile,
  validateIOCProgram,
  getExecutionOrder,
  calculateNodeCapability,

  // Compiler
  compilePredicate,
  compileTransform,
  compileReduction,
  compilePredicateFunction,
  compileTransformFunction,
  compileReductionFunction,

  // Type System
  ComplexityClass,
  validateSafeValue,

  // Verification and Safety
  TerminationVerifier,
  BudgetEnforcer,
  estimateBudget,
  DEFAULT_BUDGETS,

  // Security
  validatePropertyPath,
  validateRegexPattern,
  validateStringArg,
  safeSerialize,
  validateComplexity,
  createSandboxContext,
  compileInRestrictedContext,

  // Backends
  BackendSelector,
  backendSelector,
  JavaScriptBackend,
  WebAssemblyBackend,
  LLVMBackend,
  BackendType,
  BackendStrategy,
} from '../index';

describe('Module exports', () => {
  describe('Parser exports', () => {
    it('should export Lexer class', () => {
      expect(Lexer).toBeDefined();
      expect(typeof Lexer).toBe('function');
    });

    it('should export TokenType enum', () => {
      expect(TokenType).toBeDefined();
      expect(typeof TokenType).toBe('object');
    });

    it('should export Parser class', () => {
      expect(Parser).toBeDefined();
      expect(typeof Parser).toBe('function');
    });

    it('should export ASTToGraphConverter class', () => {
      expect(ASTToGraphConverter).toBeDefined();
      expect(typeof ASTToGraphConverter).toBe('function');
    });
  });

  describe('IOC Format exports', () => {
    it('should export IOCIntentType', () => {
      expect(IOCIntentType).toBeDefined();
    });

    it('should export serializeIOC function', () => {
      expect(serializeIOC).toBeDefined();
      expect(typeof serializeIOC).toBe('function');
    });

    it('should export deserializeIOC function', () => {
      expect(deserializeIOC).toBeDefined();
      expect(typeof deserializeIOC).toBe('function');
    });

    it('should export loadIOCFile function', () => {
      expect(loadIOCFile).toBeDefined();
      expect(typeof loadIOCFile).toBe('function');
    });

    it('should export saveIOCFile function', () => {
      expect(saveIOCFile).toBeDefined();
      expect(typeof saveIOCFile).toBe('function');
    });

    it('should export validateIOCProgram function', () => {
      expect(validateIOCProgram).toBeDefined();
      expect(typeof validateIOCProgram).toBe('function');
    });

    it('should export getExecutionOrder function', () => {
      expect(getExecutionOrder).toBeDefined();
      expect(typeof getExecutionOrder).toBe('function');
    });

    it('should export calculateNodeCapability function', () => {
      expect(calculateNodeCapability).toBeDefined();
      expect(typeof calculateNodeCapability).toBe('function');
    });
  });

  describe('Compiler exports', () => {
    it('should export compilePredicate function', () => {
      expect(compilePredicate).toBeDefined();
      expect(typeof compilePredicate).toBe('function');
    });

    it('should export compileTransform function', () => {
      expect(compileTransform).toBeDefined();
      expect(typeof compileTransform).toBe('function');
    });

    it('should export compileReduction function', () => {
      expect(compileReduction).toBeDefined();
      expect(typeof compileReduction).toBe('function');
    });

    it('should export compilePredicateFunction', () => {
      expect(compilePredicateFunction).toBeDefined();
      expect(typeof compilePredicateFunction).toBe('function');
    });

    it('should export compileTransformFunction', () => {
      expect(compileTransformFunction).toBeDefined();
      expect(typeof compileTransformFunction).toBe('function');
    });

    it('should export compileReductionFunction', () => {
      expect(compileReductionFunction).toBeDefined();
      expect(typeof compileReductionFunction).toBe('function');
    });
  });

  describe('Type System exports', () => {
    it('should export ComplexityClass enum', () => {
      expect(ComplexityClass).toBeDefined();
      expect(ComplexityClass.CONSTANT).toBe('O(1)');
      expect(ComplexityClass.LINEAR).toBe('O(n)');
      expect(ComplexityClass.QUADRATIC).toBe('O(n²)');
    });

    it('should export validateSafeValue function', () => {
      expect(validateSafeValue).toBeDefined();
      expect(typeof validateSafeValue).toBe('function');

      // Quick functionality test
      expect(validateSafeValue(42)).toBe(true);
      expect(validateSafeValue('hello')).toBe(true);
      expect(validateSafeValue([1, 2, 3])).toBe(true);
      expect(validateSafeValue({ key: 'value' })).toBe(true);
    });
  });

  describe('Verification exports', () => {
    it('should export TerminationVerifier class', () => {
      expect(TerminationVerifier).toBeDefined();
      expect(typeof TerminationVerifier).toBe('function');
    });

    it('should export BudgetEnforcer class', () => {
      expect(BudgetEnforcer).toBeDefined();
      expect(typeof BudgetEnforcer).toBe('function');
    });

    it('should export estimateBudget function', () => {
      expect(estimateBudget).toBeDefined();
      expect(typeof estimateBudget).toBe('function');
    });

    it('should export DEFAULT_BUDGETS', () => {
      expect(DEFAULT_BUDGETS).toBeDefined();
      expect(typeof DEFAULT_BUDGETS).toBe('object');
    });
  });

  describe('Security exports', () => {
    it('should export validatePropertyPath function', () => {
      expect(validatePropertyPath).toBeDefined();
      expect(typeof validatePropertyPath).toBe('function');
    });

    it('should export validateRegexPattern function', () => {
      expect(validateRegexPattern).toBeDefined();
      expect(typeof validateRegexPattern).toBe('function');
    });

    it('should export validateStringArg function', () => {
      expect(validateStringArg).toBeDefined();
      expect(typeof validateStringArg).toBe('function');
    });

    it('should export safeSerialize function', () => {
      expect(safeSerialize).toBeDefined();
      expect(typeof safeSerialize).toBe('function');
    });

    it('should export validateComplexity function', () => {
      expect(validateComplexity).toBeDefined();
      expect(typeof validateComplexity).toBe('function');
    });

    it('should export createSandboxContext function', () => {
      expect(createSandboxContext).toBeDefined();
      expect(typeof createSandboxContext).toBe('function');
    });

    it('should export compileInRestrictedContext function', () => {
      expect(compileInRestrictedContext).toBeDefined();
      expect(typeof compileInRestrictedContext).toBe('function');
    });
  });

  describe('Backend exports', () => {
    it('should export BackendSelector class', () => {
      expect(BackendSelector).toBeDefined();
      expect(typeof BackendSelector).toBe('function');
    });

    it('should export backendSelector singleton', () => {
      expect(backendSelector).toBeDefined();
      expect(backendSelector).toBeInstanceOf(BackendSelector);
    });

    it('should export JavaScriptBackend class', () => {
      expect(JavaScriptBackend).toBeDefined();
      expect(typeof JavaScriptBackend).toBe('function');
    });

    it('should export WebAssemblyBackend class', () => {
      expect(WebAssemblyBackend).toBeDefined();
      expect(typeof WebAssemblyBackend).toBe('function');
    });

    it('should export LLVMBackend class', () => {
      expect(LLVMBackend).toBeDefined();
      expect(typeof LLVMBackend).toBe('function');
    });

    it('should export BackendType enum', () => {
      expect(BackendType).toBeDefined();
      expect(BackendType.JAVASCRIPT).toBeDefined();
      expect(BackendType.WASM).toBeDefined();
      expect(BackendType.LLVM).toBeDefined();
    });

    it('should export BackendStrategy enum', () => {
      expect(BackendStrategy).toBeDefined();
      expect(BackendStrategy.FASTEST_COMPILE).toBeDefined();
      expect(BackendStrategy.FASTEST_RUNTIME).toBeDefined();
      expect(BackendStrategy.BALANCED).toBeDefined();
    });
  });

  describe('Integration - Basic usage', () => {
    it('should be able to create a basic IOC program', () => {
      const program = createSimpleProgram();
      expect(() => validateIOCProgram(program)).not.toThrow();
    });

    it('should be able to serialize and deserialize', () => {
      const program = createSimpleProgram();

      const serialized = serializeIOC(program);
      expect(typeof serialized).toBe('string');

      const deserialized = deserializeIOC(serialized);
      expect(deserialized).toEqual(program);
    });

    it('should be able to use security functions', () => {
      expect(() => validatePropertyPath(['user', 'name'])).not.toThrow();
      expect(() => validatePropertyPath(['__proto__'])).toThrow();

      expect(() => validateRegexPattern('[a-z]+')).not.toThrow();
      expect(() => validateRegexPattern('**')).toThrow();

      expect(safeSerialize(42)).toBe('42');
      expect(safeSerialize('hello')).toBe('"hello"');
    });
  });
});
