/**
 * Type system for IOC
 * Maps to LLVM types for native compilation
 */

/**
 * Base interface for all IOC types
 */
export interface IOCType {
  /**
   * Check if a value matches this type
   */
  matches(value: unknown): boolean;

  /**
   * Convert to string representation
   */
  toString(): string;

  /**
   * Get corresponding LLVM type name
   */
  toLLVMType(): string;
}

/**
 * Any type - matches everything
 */
export class AnyType implements IOCType {
  matches(_value: unknown): boolean {
    return true;
  }

  toString(): string {
    return 'Any';
  }

  toLLVMType(): string {
    return 'i8*'; // Generic pointer in LLVM
  }
}

/**
 * Integer type with optional constraints
 */
export class IntType implements IOCType {
  constructor(
    public readonly minValue?: number,
    public readonly maxValue?: number,
    public readonly bits: 32 | 64 = 32
  ) {}

  matches(value: unknown): boolean {
    if (typeof value !== 'number') return false;
    if (!Number.isInteger(value)) return false;
    if (this.minValue !== undefined && value < this.minValue) return false;
    if (this.maxValue !== undefined && value > this.maxValue) return false;
    return true;
  }

  toString(): string {
    const constraints: string[] = [];
    if (this.minValue !== undefined) constraints.push(`>=${this.minValue}`);
    if (this.maxValue !== undefined) constraints.push(`<=${this.maxValue}`);

    const base = `Int${this.bits}`;
    return constraints.length > 0 ? `${base}[${constraints.join(', ')}]` : base;
  }

  toLLVMType(): string {
    return `i${this.bits}`;
  }
}

/**
 * Floating point type with optional constraints
 */
export class FloatType implements IOCType {
  constructor(
    public readonly minValue?: number,
    public readonly maxValue?: number,
    public readonly precision: 'single' | 'double' = 'double'
  ) {}

  matches(value: unknown): boolean {
    if (typeof value !== 'number') return false;
    if (this.minValue !== undefined && value < this.minValue) return false;
    if (this.maxValue !== undefined && value > this.maxValue) return false;
    return true;
  }

  toString(): string {
    const constraints: string[] = [];
    if (this.minValue !== undefined) constraints.push(`>=${this.minValue}`);
    if (this.maxValue !== undefined) constraints.push(`<=${this.maxValue}`);

    const base = this.precision === 'single' ? 'Float32' : 'Float64';
    return constraints.length > 0 ? `${base}[${constraints.join(', ')}]` : base;
  }

  toLLVMType(): string {
    return this.precision === 'single' ? 'float' : 'double';
  }
}

/**
 * Boolean type
 */
export class BoolType implements IOCType {
  matches(value: unknown): boolean {
    return typeof value === 'boolean';
  }

  toString(): string {
    return 'Bool';
  }

  toLLVMType(): string {
    return 'i1'; // LLVM uses i1 for booleans
  }
}

/**
 * List type with optional element type and length constraints
 */
export class ListType implements IOCType {
  constructor(
    public readonly elementType: IOCType = new AnyType(),
    public readonly minLength?: number,
    public readonly maxLength?: number
  ) {}

  matches(value: unknown): boolean {
    if (!Array.isArray(value)) return false;
    if (this.minLength !== undefined && value.length < this.minLength) return false;
    if (this.maxLength !== undefined && value.length > this.maxLength) return false;
    return value.every((item) => this.elementType.matches(item));
  }

  toString(): string {
    const constraints: string[] = [];
    if (this.minLength !== undefined) constraints.push(`len>=${this.minLength}`);
    if (this.maxLength !== undefined) constraints.push(`len<=${this.maxLength}`);

    const base = `List[${this.elementType.toString()}]`;
    return constraints.length > 0 ? `${base}(${constraints.join(', ')})` : base;
  }

  toLLVMType(): string {
    // LLVM representation: pointer to array structure
    return `%List_${this.elementType.toLLVMType()}*`;
  }
}

/**
 * Infer IOC type from a JavaScript value
 */
export function inferType(value: unknown): IOCType {
  if (typeof value === 'boolean') {
    return new BoolType();
  }
  if (typeof value === 'number') {
    return Number.isInteger(value) ? new IntType() : new FloatType();
  }
  if (Array.isArray(value)) {
    if (value.length === 0) {
      return new ListType(new AnyType());
    }
    // Infer element type from first element
    const elemType = inferType(value[0]);
    return new ListType(elemType);
  }
  return new AnyType();
}
