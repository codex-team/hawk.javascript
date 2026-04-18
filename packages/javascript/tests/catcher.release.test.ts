import { describe, expect, it } from "vitest";
import { createCatcher, createTransport, getLastPayload, wait } from "./catcher.helpers";

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
