import { describe, expect, it, vi } from "vitest";
import { createCatcher, createTransport, getLastPayload, wait } from "./catcher.helpers";

vi.mock('@hawk.so/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@hawk.so/core')>();
  return { ...actual, StackParser: class { parse = vi.fn().mockResolvedValue([]); } };
});

describe('Catcher', () => {
  it('should include release version when configured', async () => {
    const { sendSpy, transport } = createTransport();

    createCatcher(transport, { release: '1.2.3' }).send(new Error('e'));
    await wait();

    expect(getLastPayload(sendSpy).release).toBe('1.2.3');
  });

  it('should omit release when not configured', async () => {
    const { sendSpy, transport } = createTransport();

    createCatcher(transport).send(new Error('e'));
    await wait();

    expect(getLastPayload(sendSpy).release).toBeFalsy();
  });
});
