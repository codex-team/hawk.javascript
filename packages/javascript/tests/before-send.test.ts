import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { CatcherMessage } from '../src/types/catcher-message';
import type { Transport } from '../src/types/transport';
import type { HawkJavaScriptEvent } from '../src/types/event';
import Catcher from '../src/catcher';

const TEST_TOKEN = 'eyJpbnRlZ3JhdGlvbklkIjoiOTU3MmQyOWQtNWJhZS00YmYyLTkwN2MtZDk5ZDg5MGIwOTVmIiwic2VjcmV0IjoiZTExODFiZWItMjdlMS00ZDViLWEwZmEtZmUwYTM1Mzg5OWMyIn0=';
/**
 * Wait for fire-and-forget async calls inside hawk.send() to complete
 */
const wait = (): Promise<void> => new Promise((r) => setTimeout(r, 0));

function createTransport() {
  const sendSpy = vi.fn<(msg: CatcherMessage) => Promise<void>>().mockResolvedValue(undefined);
  const transport: Transport = { send: sendSpy };

  return { sendSpy, transport };
}

function getSentPayload(spy: ReturnType<typeof vi.fn>): HawkJavaScriptEvent | null {
  const calls = spy.mock.calls;

  return calls.length ? calls[calls.length - 1][0].payload : null;
}

/**
 * Shared Catcher config — no breadcrumbs, no global handlers, fake transport
 */
function createCatcher(transport: Transport, beforeSend: NonNullable<ConstructorParameters<typeof Catcher>[0] extends object ? ConstructorParameters<typeof Catcher>[0]['beforeSend'] : never>) {
  return new Catcher({
    token: TEST_TOKEN,
    disableGlobalErrorsHandling: true,
    breadcrumbs: false,
    transport,
    beforeSend,
  });
}

describe('beforeSend', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('should send event as-is when beforeSend returns it unchanged', async () => {
    // Arrange
    const { sendSpy, transport } = createTransport();
    const hawk = createCatcher(transport, (event) => event);

    // Act
    hawk.send(new Error('hello'));
    await wait();

    // Assert
    expect(sendSpy).toHaveBeenCalledOnce();
    expect(getSentPayload(sendSpy)!.title).toBe('hello');
  });

  it('should send modified event when beforeSend mutates and returns it', async () => {
    // Arrange
    const { sendSpy, transport } = createTransport();
    const hawk = createCatcher(transport, (event) => {
      event.context = { sanitized: true };

      return event;
    });

    // Act
    hawk.send(new Error('modify'));
    await wait();

    // Assert
    expect(sendSpy).toHaveBeenCalledOnce();
    expect(getSentPayload(sendSpy)!.context).toEqual({ sanitized: true });
  });

  it('should not send event when beforeSend returns false', async () => {
    // Arrange
    const { sendSpy, transport } = createTransport();
    const hawk = createCatcher(transport, () => false);

    // Act
    hawk.send(new Error('drop'));
    await wait();

    // Assert
    expect(sendSpy).not.toHaveBeenCalled();
  });

  it.each([
    { label: 'undefined', value: undefined },
    { label: 'null', value: null },
    { label: 'number (42)', value: 42 },
    { label: 'string ("oops")', value: 'oops' },
    { label: 'true', value: true },
  ])('should send original event and warn when beforeSend returns $label', async ({ value }) => {
    // Arrange
    const { sendSpy, transport } = createTransport();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const hawk = createCatcher(transport, () => value as any);

    // Act
    hawk.send(new Error('invalid'));
    await wait();

    // Assert
    expect(sendSpy).toHaveBeenCalledOnce();
    expect(getSentPayload(sendSpy)!.title).toBe('invalid');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Invalid beforeSend value'),
      expect.anything(),
      expect.anything()
    );
  });

  it('should send original event and warn when beforeSend deletes required field (title)', async () => {
    // Arrange
    const { sendSpy, transport } = createTransport();
    const hawk = createCatcher(transport, (event) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (event as any).title;

      return event;
    });

    // Act
    hawk.send(new Error('required-field'));
    await wait();

    // Assert — fallback to original payload, title preserved
    expect(sendSpy).toHaveBeenCalledOnce();
    expect(getSentPayload(sendSpy)!.title).toBe('required-field');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('Invalid beforeSend value'),
      expect.anything(),
      expect.anything()
    );
  });

  it('should still send event when structuredClone throws (non-cloneable payload)', async () => {
    // Arrange
    const { sendSpy, transport } = createTransport();
    const hawk = createCatcher(transport, (event) => event);
    const cloneSpy = vi.spyOn(globalThis, 'structuredClone').mockImplementation(() => {
      throw new DOMException('could not be cloned', 'DataCloneError');
    });

    // Act
    hawk.send(new Error('non-cloneable'));
    await wait();

    // Assert — event is still sent, reporting didn't crash
    expect(sendSpy).toHaveBeenCalledOnce();
    expect(getSentPayload(sendSpy)!.title).toBe('non-cloneable');

    cloneSpy.mockRestore();
  });

  it('should send event without deleted optional fields', async () => {
    // Arrange
    const { sendSpy, transport } = createTransport();
    const hawk = createCatcher(transport, (event) => {
      delete event.release;

      return event;
    });

    // Act
    hawk.send(new Error('optional'));
    await wait();

    // Assert
    expect(sendSpy).toHaveBeenCalledOnce();
    expect(getSentPayload(sendSpy)!.release).toBeUndefined();
  });
});
