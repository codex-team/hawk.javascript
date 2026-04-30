import { describe, it, expect, vi } from 'vitest';
import { createCatcher, createTransport, wait, getLastPayload } from './catcher.helpers';

describe('Catcher', () => {
  it('should send event as-is when beforeSend returns it unchanged', async () => {
    const { sendSpy, transport } = createTransport();
    const hawk = createCatcher(transport, { beforeSend: (event) => event });

    hawk.send(new Error('hello'));
    await wait();

    expect(sendSpy).toHaveBeenCalledOnce();
    expect(getLastPayload(sendSpy).title).toBe('hello');
  });

  it('should send modified event when beforeSend mutates and returns it', async () => {
    const { sendSpy, transport } = createTransport();
    const hawk = createCatcher(transport, {
      beforeSend: (event) => {
        event.context = { sanitized: true };

        return event;
      },
    });

    hawk.send(new Error('modify'));
    await wait();

    expect(sendSpy).toHaveBeenCalledOnce();
    expect(getLastPayload(sendSpy).context).toEqual({ sanitized: true });
  });

  it('should not send event when beforeSend returns false', async () => {
    const { sendSpy, transport } = createTransport();
    const hawk = createCatcher(transport, { beforeSend: () => false });

    hawk.send(new Error('drop'));
    await wait();

    expect(sendSpy).not.toHaveBeenCalled();
  });

  it.each([
    { label: 'undefined', value: undefined },
    { label: 'null', value: null },
    { label: 'number (42)', value: 42 },
    { label: 'string ("oops")', value: 'oops' },
    { label: 'true', value: true },
  ])('should send original event when beforeSend returns $label', async ({ value }) => {
    const { sendSpy, transport } = createTransport();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hawk = createCatcher(transport, { beforeSend: () => value as any });

    hawk.send(new Error('invalid'));
    await wait();

    expect(sendSpy).toHaveBeenCalledOnce();
    expect(getLastPayload(sendSpy).title).toBe('invalid');
  });

  it('should send original event when beforeSend deletes required field (title)', async () => {
    const { sendSpy, transport } = createTransport();
    const hawk = createCatcher(transport, {
      beforeSend: (event) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (event as any).title;

        return event;
      },
    });

    hawk.send(new Error('required-field'));
    await wait();

    expect(sendSpy).toHaveBeenCalledOnce();
    expect(getLastPayload(sendSpy).title).toBe('required-field');
  });

  it('should still send event when structuredClone throws (non-cloneable payload)', async () => {
    const { sendSpy, transport } = createTransport();
    const hawk = createCatcher(transport, { beforeSend: (event) => event });
    const cloneSpy = vi.spyOn(globalThis, 'structuredClone').mockImplementation(() => {
      throw new DOMException('could not be cloned', 'DataCloneError');
    });

    hawk.send(new Error('non-cloneable'));
    await wait();

    expect(sendSpy).toHaveBeenCalledOnce();
    expect(getLastPayload(sendSpy).title).toBe('non-cloneable');

    cloneSpy.mockRestore();
  });

  it('should send event without deleted optional fields', async () => {
    const { sendSpy, transport } = createTransport();
    const hawk = createCatcher(transport, {
      beforeSend: (event) => {
        delete event.release;

        return event;
      },
    });

    hawk.send(new Error('optional'));
    await wait();

    expect(sendSpy).toHaveBeenCalledOnce();
    expect(getLastPayload(sendSpy).release).toBeUndefined();
  });

  it('should not throw when beforeSend throws unexpectedly', async () => {
    const { transport } = createTransport();

    const act = async () => {
      createCatcher(transport, {
        beforeSend: () => { throw new Error('beforeSend crashed'); },
      } as never).send(new Error('e'));
      await wait();
    };

    await expect(act()).resolves.toBeUndefined();
  });

  it('should send original event unchanged when beforeSend mutates clone and returns undefined', async () => {
    const { sendSpy, transport } = createTransport();
    const hawk = createCatcher(transport, {
      beforeSend: (event) => { (event as any).title = 'mutated'; return undefined as any; },
    });

    hawk.send(new Error('original'));
    await wait();

    expect(sendSpy).toHaveBeenCalledOnce();
    expect(getLastPayload(sendSpy).title).toBe('original');
  });

  it('should send new event object when beforeSend returns a brand-new object', async () => {
    const { sendSpy, transport } = createTransport();
    const hawk = createCatcher(transport, {
      beforeSend: (event) => ({ ...event, title: 'brand new title' }),
    });

    hawk.send(new Error('original'));
    await wait();

    expect(sendSpy).toHaveBeenCalledOnce();
    expect(getLastPayload(sendSpy).title).toBe('brand new title');
  });
});
