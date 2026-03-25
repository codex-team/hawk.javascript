import type { CatcherMessagePayload } from '@hawk.so/types';

export function makePayload(
  overrides: Partial<CatcherMessagePayload<'errors/javascript'>> = {}
): CatcherMessagePayload<'errors/javascript'> {
  return { title: 'Test error', catcherVersion: '0.0.0', ...overrides };
}