import { describe, expect, it } from 'vitest';
import { DebugAddonMessageProcessor } from '../../src/messages/debug-addon-message-processor';
import { makePayload } from './message-processor.helpers';

describe('DebugMessageProcessor', () => {
  const processor = new DebugAddonMessageProcessor();

  it('should add RAW_EVENT_DATA when hint.error is an Error instance', () => {
    const error = new TypeError('boom');

    const result = processor.apply(makePayload(), { error });

    expect(result?.addons?.RAW_EVENT_DATA).toMatchObject({
      name: 'TypeError',
      message: 'boom',
      stack: expect.any(String),
    });
  });

  it('should not add RAW_EVENT_DATA when hint.error is a string', () => {
    const result = processor.apply(makePayload(), { error: 'string reason' });

    expect(result?.addons?.RAW_EVENT_DATA).toBeUndefined();
  });

  it('should not add RAW_EVENT_DATA when hint is absent', () => {
    const result = processor.apply(makePayload());

    expect(result?.addons?.RAW_EVENT_DATA).toBeUndefined();
  });
});
