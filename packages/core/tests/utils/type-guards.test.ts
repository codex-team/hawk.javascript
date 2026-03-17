import { describe, expect, it } from 'vitest';
import { isArray, isClassInstance, isClassPrototype, isPlainObject, isString } from '../../src';

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

describe('isArray', () => {
  it('should return true for empty array', () => expect(isArray([])).toBe(true));
  it('should return true for non-empty array', () => expect(isArray([1, 2, 3])).toBe(true));
  it('should return false for plain object', () => expect(isArray({})).toBe(false));
  it('should return false for string', () => expect(isArray('hello')).toBe(false));
  it('should return false for number', () => expect(isArray(42)).toBe(false));
  it('should return false for boolean', () => expect(isArray(true)).toBe(false));
  it('should return false for null', () => expect(isArray(null)).toBe(false));
  it('should return false for undefined', () => expect(isArray(undefined)).toBe(false));
  it('should return false for class prototype', () => expect(isArray(Foo)).toBe(false));
  it('should return false for class instance', () => expect(isArray(fooInstance)).toBe(false));
});

describe('isClassPrototype', () => {
  it('should return true for class prototype', () => expect(isClassPrototype(Foo)).toBe(true));
  it('should return false for class instance', () => expect(isClassPrototype(fooInstance)).toBe(false));
  it('should return false for plain object', () => expect(isClassPrototype({})).toBe(false));
  it('should return false for array', () => expect(isClassPrototype([])).toBe(false));
  it('should return false for string', () => expect(isClassPrototype('foo')).toBe(false));
  it('should return false for number', () => expect(isClassPrototype(42)).toBe(false));
  it('should return false for boolean', () => expect(isClassPrototype(true)).toBe(false));
  it('should return false for null', () => expect(isClassPrototype(null)).toBe(false));
  it('should return false for undefined', () => expect(isClassPrototype(undefined)).toBe(false));
});

describe('isClassInstance', () => {
  it('should return true for class instance', () => expect(isClassInstance(fooInstance)).toBe(true));
  it('should return false for class prototype', () => expect(isClassInstance(Foo)).toBe(false));
  it('should return false for plain object', () => expect(isClassInstance({})).toBe(false));
  it('should return false for array', () => expect(isClassInstance([])).toBe(false));
  it('should return false for string', () => expect(isClassInstance('foo')).toBe(false));
  it('should return false for number', () => expect(isClassInstance(42)).toBe(false));
  it('should return false for boolean', () => expect(isClassInstance(true)).toBe(false));
  it('should return false for null', () => expect(isClassInstance(null)).toBe(false));
  it('should return false for undefined', () => expect(isClassInstance(undefined)).toBe(false));
});

describe('isString', () => {
  it('should return true for string', () => expect(isString('hello')).toBe(true));
  it('should return true for empty string', () => expect(isString('')).toBe(true));
  it('should return false for plain object', () => expect(isString({})).toBe(false));
  it('should return false for array', () => expect(isString([])).toBe(false));
  it('should return false for number', () => expect(isString(42)).toBe(false));
  it('should return false for boolean', () => expect(isString(true)).toBe(false));
  it('should return false for null', () => expect(isString(null)).toBe(false));
  it('should return false for undefined', () => expect(isString(undefined)).toBe(false));
  it('should return false for class prototype', () => expect(isString(Foo)).toBe(false));
  it('should return false for class instance', () => expect(isString(fooInstance)).toBe(false));
});
