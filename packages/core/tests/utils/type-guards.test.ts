import { describe, expect, it } from 'vitest';
import { isPlainObject } from '../../src';

class Foo {}
const fooInstance = new Foo();

describe('isPlainObject', () => {
  it('should return true for plain object', () => expect(isPlainObject({})).toBe(true));
  it('should return true for plain object with properties', () => expect(isPlainObject({ a: 1 })).toBe(true));
  it('should return false for array', () => expect(isPlainObject([])).toBe(false));
  it('should return false for string', () => expect(isPlainObject('x')).toBe(false));
  it('should return false for number', () => expect(isPlainObject(42)).toBe(false));
  it('should return false for boolean', () => expect(isPlainObject(true)).toBe(false));
  it('should return false for null', () => expect(isPlainObject(null)).toBe(false));
  it('should return false for undefined', () => expect(isPlainObject(undefined)).toBe(false));
  it('should return false for class prototype', () => expect(isPlainObject(Foo)).toBe(false));
  it('should return false for class instance', () => expect(isPlainObject(fooInstance)).toBe(false));
});
