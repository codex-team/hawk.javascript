import type { ProcessingPayload } from '@hawk.so/core';

export function makePayload(
  overrides: Partial<ProcessingPayload<'errors/javascript'>> = {}
): ProcessingPayload<'errors/javascript'> {
  return { title: 'Test error', catcherVersion: '0.0.0', addons: {}, ...overrides };
}
