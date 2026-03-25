import { describe, expect, it } from 'vitest';
import { DebugMessageProcessor } from '../../src/messages/debug-message-processor';
import { makePayload } from './message-processor.helpers';

describe('DebugMessageProcessor', () => {
  const processor = new DebugMessageProcessor();

  it('should add RAW_EVENT_DATA when hint.error is an Error instance', () => {
    const error = new TypeError('boom');

    const result = processor.apply(makePayload({ addons: {} as any }), { error });

    expect(result?.addons?.RAW_EVENT_DATA).toMatchObject({
      name: 'TypeError',
      message: 'boom',
      stack: expect.any(String),
    });
  });

  it('should not add RAW_EVENT_DATA when hint.error is a string', () => {
    const result = processor.apply(makePayload({ addons: {} as any }), { error: 'string reason' });

    expect(result?.addons?.RAW_EVENT_DATA).toBeUndefined();
  });

  it('should not add RAW_EVENT_DATA when hint is absent', () => {
    const result = processor.apply(makePayload({ addons: {} as any }));

    expect(result?.addons?.RAW_EVENT_DATA).toBeUndefined();
  });

  it('should return payload unchanged when payload has no addons', () => {
    const payload = makePayload();

    const result = processor.apply(payload, { error: new Error('x') });

    expect(result).toBe(payload);
  });
});
