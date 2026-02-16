import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Socket from '../src/modules/socket';
import type { CatcherMessage } from '@hawk.so/types';

const MOCK_WEBSOCKET_URL = 'ws://localhost:1234';

type MockWebSocket = {
  url: string;
  readyState: number;
  send: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  onopen?: (event: Event) => void;
  onclose?: (event: CloseEvent) => void;
  onerror?: (event: Event) => void;
  onmessage?: (event: MessageEvent) => void;
};

function createMockWebSocket() {
  const instances: MockWebSocket[] = [];

  const closeSpy = vi.fn(function (this: MockWebSocket) {
    this.readyState = WebSocket.CLOSED;
    this.onclose?.({ code: 1000 } as CloseEvent);
  });

  const ctor = vi.fn<(url: string) => MockWebSocket>().mockImplementation(function (
    this: MockWebSocket,
    url: string
  ) {
    this.url = url;
    this.readyState = WebSocket.CONNECTING;
    this.send = vi.fn();
    this.close = closeSpy;
    this.onopen = undefined;
    this.onclose = undefined;
    this.onerror = undefined;
    this.onmessage = undefined;

    instances.push(this);
  });

  return { ctor, closeSpy, instances };
}

describe('Socket', () => {
  let ctor: ReturnType<typeof vi.fn>;
  let closeSpy: ReturnType<typeof vi.fn>;
  let instances: MockWebSocket[];

  let addSpy: ReturnType<typeof vi.spyOn>;
  let removeSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    ({ ctor, closeSpy, instances } = createMockWebSocket());
    (globalThis as any).WebSocket = ctor;

    addSpy = vi.spyOn(window, 'addEventListener');
    removeSpy = vi.spyOn(window, 'removeEventListener');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should close websocket on pagehide and recreate connection on next send()', async () => {
    const socket = new Socket({ collectorEndpoint: MOCK_WEBSOCKET_URL });

    const first = instances[0];
    first.readyState = WebSocket.OPEN;
    first.onopen?.(new Event('open'));
    const pagehideHandler = addSpy.mock.calls.find(c => c[0] === 'pagehide')![1] as EventListener;

    window.dispatchEvent(new Event('pagehide'));

    expect(closeSpy).toHaveBeenCalledOnce();
    expect(removeSpy).toHaveBeenCalledWith('pagehide', pagehideHandler, { capture: true });

    const sendPromise = socket.send({ foo: 'bar' } as CatcherMessage);

    const second = instances[1];
    second.readyState = WebSocket.OPEN;
    second.onopen?.(new Event('open'));
    await sendPromise;

    expect(ctor).toHaveBeenCalledTimes(2);
    expect(second.url).toBe(MOCK_WEBSOCKET_URL);
  });
});
