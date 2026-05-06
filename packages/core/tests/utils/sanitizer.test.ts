import { describe, expect, it } from 'vitest';
import { Sanitizer } from '../../src';

describe('Sanitizer', () => {
  describe('sanitize', () => {
    it('should pass through strings within the length limit', () => {
      expect(Sanitizer.sanitize('hello')).toBe('hello');
    });

    it('should trim strings longer than maxStringLen', () => {
      const long = 'a'.repeat(201);
      const result = Sanitizer.sanitize(long);

      expect(result).toBe('a'.repeat(200) + '…');
    });

    it('should pass through short arrays unchanged', () => {
      expect(Sanitizer.sanitize([1, 2, 3])).toEqual([1, 2, 3]);
    });

    it('should truncate arrays over maxArrayLength items and append placeholder', () => {
      const arr = Array.from({ length: 12 }, (_, i) => i);
      const result = Sanitizer.sanitize(arr);

      expect(result).toHaveLength(11);
      expect(result[10]).toBe('<2 more items...>');
    });

    it('should sanitize nested objects recursively', () => {
      const longStr = 'a'.repeat(201);
      const longArr = Array.from({ length: 12 }, (_, i) => i);
      const obj = {
        foo: 'x',
        bar: longStr,
        baz: longArr
      }
      const result = Sanitizer.sanitize(obj);

      expect(result.foo).toBe('x');
      expect(result.bar).toBe('a'.repeat(200) + '…');
      expect(result.baz).toHaveLength(11);
      expect(result.baz[10]).toBe('<2 more items...>');
    });

    it('should replace objects with more than 20 keys with placeholder', () => {
      const big: Record<string, number> = {};

      for (let i = 0; i < 21; i++) {
        big[`k${i}`] = i;
      }

      expect(Sanitizer.sanitize(big)).toBe('<big object>');
    });

    it('should replace deeply nested objects with placeholder', () => {
      const deep = { a: { b: { c: { d: { e: { f: 'bottom' } } } } } };
      const result = Sanitizer.sanitize(deep);

      expect(result.a.b.c.d.e).toBe('<deep object>');
    });

    it('should format a class (not constructed) as "<class Name>"', () => {
      class Foo {}

      expect(Sanitizer.sanitize(Foo)).toBe('<class Foo>');
    });

    it('should format a class instance as "<instance of Name>"', () => {
      class Foo {}

      expect(Sanitizer.sanitize(new Foo())).toBe('<instance of Foo>');
    });

    it('should replace circular references with placeholder', () => {
      const obj: any = { a: 1 };

      obj.self = obj;

      const result = Sanitizer.sanitize(obj);

      expect(result.self).toBe('<circular>');
    });

    it.each([
      { label: 'number', value: 42 },
      { label: 'boolean', value: true },
      { label: 'null', value: null },
    ])('should pass through $label primitives unchanged', ({ value }) => {
      expect(Sanitizer.sanitize(value)).toBe(value);
    });
  });
});
