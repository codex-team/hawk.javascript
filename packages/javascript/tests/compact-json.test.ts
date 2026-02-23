import { describe, expect, it } from 'vitest';
import { compactJson } from '../src/utils/compactJson';

describe('compactJson', () => {
  it('should keep non-empty primitive values', () => {
    const result = compactJson([
      ['name', 'hawk'],
      ['count', 0],
      ['enabled', false],
    ]);

    expect(result).toEqual({
      name: 'hawk',
      count: 0,
      enabled: false,
    });
  });

  it('should drop null, undefined and empty string values', () => {
    const result = compactJson([
      ['a', null],
      ['b', undefined],
      ['c', ''],
      ['d', 'ok'],
    ]);

    expect(result).toEqual({
      d: 'ok',
    });
  });

  it('should keep nested json objects', () => {
    const result = compactJson([
      ['meta', { source: 'test' }],
      ['duration', 123],
    ]);

    expect(result).toEqual({
      meta: { source: 'test' },
      duration: 123,
    });
  });
});
