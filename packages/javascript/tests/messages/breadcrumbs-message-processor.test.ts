import { describe, expect, it } from 'vitest';
import { BreadcrumbsMessageProcessor } from '@hawk.so/core';
import { makePayload } from './message-processor.helpers';

describe('BreadcrumbsMessageProcessor', () => {
  const processor = new BreadcrumbsMessageProcessor();

  it('should attach breadcrumbs from hint to payload', () => {
    const breadcrumbs = [{ message: 'click', timestamp: 1 }];

    const result = processor.apply(makePayload(), { breadcrumbs });

    expect(result?.breadcrumbs).toEqual(breadcrumbs);
  });

  it('should not set payload breadcrumbs when hint has empty array', () => {
    const result = processor.apply(makePayload(), { breadcrumbs: [] });

    expect(result?.breadcrumbs).toBeUndefined();
  });

  it('should not set payload breadcrumbs when hint is absent', () => {
    const result = processor.apply(makePayload());

    expect(result?.breadcrumbs).toBeUndefined();
  });
});
