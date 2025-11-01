import { describe, it, expect } from 'vitest';
import { NaiveStrategy, OptimizedStrategy, VectorizedStrategy } from '../solvers/strategies';
import { IntentType } from '../core/graph';

describe('NaiveStrategy', () => {
  const strategy = new NaiveStrategy();

  it('should handle filter intent', () => {
    expect(strategy.canHandle(IntentType.FILTER)).toBe(true);
  });

  it('should handle map intent', () => {
    expect(strategy.canHandle(IntentType.MAP)).toBe(true);
  });

  it('should handle reduce intent', () => {
    expect(strategy.canHandle(IntentType.REDUCE)).toBe(true);
  });

  it('should handle all supported intents', () => {
    const supportedTypes = [
      IntentType.FILTER,
      IntentType.MAP,
      IntentType.REDUCE,
      IntentType.INPUT,
      IntentType.OUTPUT,
      IntentType.CONSTANT,
      IntentType.SORT,
      IntentType.GROUP_BY,
      IntentType.JOIN,
      IntentType.FLATTEN,
      IntentType.DISTINCT,
      IntentType.ASSERT,
    ];

    supportedTypes.forEach((type) => {
      expect(strategy.canHandle(type)).toBe(true);
    });
  });

  describe('Code generation', () => {
    it('should generate code for input node', () => {
      const node = {
        id: 'test',
        intentType: IntentType.INPUT,
        inputs: [],
        params: { name: 'data' },
        outputType: {} as any,
        metadata: {},
      };

      const code = strategy.generateCode(node, { variables: {}, nodeResults: {} });
      expect(code).toContain('test');
      expect(code).toContain('data');
    });

    it('should generate code for constant node', () => {
      const node = {
        id: 'test',
        intentType: IntentType.CONSTANT,
        inputs: [],
        params: { value: 42 },
        outputType: {} as any,
        metadata: {},
      };

      const code = strategy.generateCode(node, { variables: {}, nodeResults: {} });
      expect(code).toContain('42');
    });

    it('should generate code for filter node', () => {
      const node = {
        id: 'test',
        intentType: IntentType.FILTER,
        inputs: ['input1'],
        params: { predicate: (x: any) => x > 0 },
        outputType: {} as any,
        metadata: {},
      };

      const context = { variables: {}, nodeResults: {} };
      const code = strategy.generateCode(node, context);
      expect(code).toContain('for');
      expect(code).toContain('if');
      expect(Object.keys(context.variables).length).toBeGreaterThan(0);
    });

    it('should generate code for map node', () => {
      const node = {
        id: 'test',
        intentType: IntentType.MAP,
        inputs: ['input1'],
        params: { transform: (x: any) => x * 2 },
        outputType: {} as any,
        metadata: {},
      };

      const context = { variables: {}, nodeResults: {} };
      const code = strategy.generateCode(node, context);
      expect(code).toContain('for');
      expect(Object.keys(context.variables).length).toBeGreaterThan(0);
    });

    it('should generate code for reduce with initial value', () => {
      const node = {
        id: 'test',
        intentType: IntentType.REDUCE,
        inputs: ['input1'],
        params: {
          operation: (a: any, b: any) => a + b,
          initial: 0,
        },
        outputType: {} as any,
        metadata: {},
      };

      const context = { variables: {}, nodeResults: {} };
      const code = strategy.generateCode(node, context);
      expect(code).toContain('for');
      expect(code).toContain('0');
    });

    it('should generate code for reduce without initial value', () => {
      const node = {
        id: 'test',
        intentType: IntentType.REDUCE,
        inputs: ['input1'],
        params: {
          operation: (a: any, b: any) => a + b,
        },
        outputType: {} as any,
        metadata: {},
      };

      const context = { variables: {}, nodeResults: {} };
      const code = strategy.generateCode(node, context);
      expect(code).toContain('_items');
    });

    it('should generate code for sort', () => {
      const node = {
        id: 'test',
        intentType: IntentType.SORT,
        inputs: ['input1'],
        params: {},
        outputType: {} as any,
        metadata: {},
      };

      const code = strategy.generateCode(node, { variables: {}, nodeResults: {} });
      expect(code).toContain('sort');
    });

    it('should generate code for groupBy', () => {
      const node = {
        id: 'test',
        intentType: IntentType.GROUP_BY,
        inputs: ['input1'],
        params: { key: (x: any) => x.category },
        outputType: {} as any,
        metadata: {},
      };

      const context = { variables: {}, nodeResults: {} };
      const code = strategy.generateCode(node, context);
      expect(code).toContain('for');
      expect(Object.keys(context.variables).length).toBeGreaterThan(0);
    });

    it('should generate code for join', () => {
      const node = {
        id: 'test',
        intentType: IntentType.JOIN,
        inputs: ['left', 'right'],
        params: {
          leftKey: (x: any) => x.id,
          rightKey: (x: any) => x.id,
        },
        outputType: {} as any,
        metadata: {},
      };

      const context = { variables: {}, nodeResults: {} };
      const code = strategy.generateCode(node, context);
      expect(code).toContain('for');
    });

    it('should generate code for flatten', () => {
      const node = {
        id: 'test',
        intentType: IntentType.FLATTEN,
        inputs: ['input1'],
        params: { depth: 1 },
        outputType: {} as any,
        metadata: {},
      };

      const code = strategy.generateCode(node, { variables: {}, nodeResults: {} });
      expect(code).toContain('for');
    });

    it('should generate code for distinct', () => {
      const node = {
        id: 'test',
        intentType: IntentType.DISTINCT,
        inputs: ['input1'],
        params: {},
        outputType: {} as any,
        metadata: {},
      };

      const context = { variables: {}, nodeResults: {} };
      const code = strategy.generateCode(node, context);
      expect(code).toContain('Set');
    });

    it('should generate code for assert', () => {
      const node = {
        id: 'test',
        intentType: IntentType.ASSERT,
        inputs: ['input1'],
        params: {
          predicate: (x: any) => x > 0,
          message: 'Value must be positive',
        },
        outputType: {} as any,
        metadata: {},
      };

      const context = { variables: {}, nodeResults: {} };
      const code = strategy.generateCode(node, context);
      expect(code).toContain('if');
      expect(code).toContain('throw');
    });
  });

  describe('Cost estimation', () => {
    it('should estimate cost for filter', () => {
      const node = {
        id: 'test',
        intentType: IntentType.FILTER,
        inputs: [],
        params: {},
        outputType: {} as any,
        metadata: {},
      };

      const cost = strategy.getCostEstimate(node, [100]);
      expect(cost).toBeGreaterThan(0);
    });

    it('should handle empty input sizes', () => {
      const node = {
        id: 'test',
        intentType: IntentType.MAP,
        inputs: [],
        params: {},
        outputType: {} as any,
        metadata: {},
      };

      const cost = strategy.getCostEstimate(node, []);
      expect(cost).toBeGreaterThan(0);
    });
  });
});

describe('OptimizedStrategy', () => {
  const strategy = new OptimizedStrategy();

  it('should handle same intents as naive', () => {
    const supportedTypes = [
      IntentType.FILTER,
      IntentType.MAP,
      IntentType.REDUCE,
      IntentType.INPUT,
      IntentType.OUTPUT,
      IntentType.CONSTANT,
      IntentType.SORT,
      IntentType.GROUP_BY,
      IntentType.JOIN,
      IntentType.FLATTEN,
      IntentType.DISTINCT,
      IntentType.ASSERT,
    ];

    supportedTypes.forEach((type) => {
      expect(strategy.canHandle(type)).toBe(true);
    });
  });

  describe('Code generation', () => {
    it('should generate optimized code for filter', () => {
      const node = {
        id: 'test',
        intentType: IntentType.FILTER,
        inputs: ['input1'],
        params: { predicate: (x: any) => x > 0 },
        outputType: {} as any,
        metadata: {},
      };

      const context = { variables: {}, nodeResults: {} };
      const code = strategy.generateCode(node, context);
      expect(code).toContain('.filter(');
    });

    it('should generate optimized code for map', () => {
      const node = {
        id: 'test',
        intentType: IntentType.MAP,
        inputs: ['input1'],
        params: { transform: (x: any) => x * 2 },
        outputType: {} as any,
        metadata: {},
      };

      const context = { variables: {}, nodeResults: {} };
      const code = strategy.generateCode(node, context);
      expect(code).toContain('.map(');
    });

    it('should generate optimized code for reduce with initial', () => {
      const node = {
        id: 'test',
        intentType: IntentType.REDUCE,
        inputs: ['input1'],
        params: {
          operation: (a: any, b: any) => a + b,
          initial: 0,
        },
        outputType: {} as any,
        metadata: {},
      };

      const context = { variables: {}, nodeResults: {} };
      const code = strategy.generateCode(node, context);
      expect(code).toContain('.reduce(');
    });

    it('should generate optimized code for reduce without initial', () => {
      const node = {
        id: 'test',
        intentType: IntentType.REDUCE,
        inputs: ['input1'],
        params: {
          operation: (a: any, b: any) => a + b,
        },
        outputType: {} as any,
        metadata: {},
      };

      const context = { variables: {}, nodeResults: {} };
      const code = strategy.generateCode(node, context);
      expect(code).toContain('.reduce(');
    });

    it('should generate optimized code for flatten', () => {
      const node = {
        id: 'test',
        intentType: IntentType.FLATTEN,
        inputs: ['input1'],
        params: { depth: 2 },
        outputType: {} as any,
        metadata: {},
      };

      const code = strategy.generateCode(node, { variables: {}, nodeResults: {} });
      expect(code).toContain('.flat(');
    });

    it('should generate optimized code for distinct', () => {
      const node = {
        id: 'test',
        intentType: IntentType.DISTINCT,
        inputs: ['input1'],
        params: {},
        outputType: {} as any,
        metadata: {},
      };

      const context = { variables: {}, nodeResults: {} };
      const code = strategy.generateCode(node, context);
      expect(code).toContain('Set');
    });

    it('should generate optimized code for join', () => {
      const node = {
        id: 'test',
        intentType: IntentType.JOIN,
        inputs: ['left', 'right'],
        params: {
          leftKey: (x: any) => x.id,
          rightKey: (x: any) => x.id,
        },
        outputType: {} as any,
        metadata: {},
      };

      const context = { variables: {}, nodeResults: {} };
      const code = strategy.generateCode(node, context);
      expect(code).toContain('.flatMap(');
    });
  });

  describe('Cost estimation', () => {
    it('should estimate lower cost than naive', () => {
      const node = {
        id: 'test',
        intentType: IntentType.FILTER,
        inputs: [],
        params: {},
        outputType: {} as any,
        metadata: {},
      };

      const cost = strategy.getCostEstimate(node, [100]);
      expect(cost).toBeLessThan(100);
    });
  });
});

describe('VectorizedStrategy', () => {
  const strategy = new VectorizedStrategy();

  it('should not handle any intents yet', () => {
    expect(strategy.canHandle(IntentType.FILTER)).toBe(false);
    expect(strategy.canHandle(IntentType.MAP)).toBe(false);
  });

  it('should throw error on generate code', () => {
    const node = {
      id: 'test',
      intentType: IntentType.FILTER,
      inputs: [],
      params: {},
      outputType: {} as any,
      metadata: {},
    };

    expect(() => strategy.generateCode(node, { variables: {}, nodeResults: {} })).toThrow();
  });

  it('should return high cost for small inputs', () => {
    const node = {
      id: 'test',
      intentType: IntentType.FILTER,
      inputs: [],
      params: {},
      outputType: {} as any,
      metadata: {},
    };

    const cost = strategy.getCostEstimate(node, [100]);
    expect(cost).toBe(Infinity);
  });

  it('should return low cost for large inputs', () => {
    const node = {
      id: 'test',
      intentType: IntentType.FILTER,
      inputs: [],
      params: {},
      outputType: {} as any,
      metadata: {},
    };

    const cost = strategy.getCostEstimate(node, [10000]);
    expect(cost).toBeLessThan(1);
  });
});
