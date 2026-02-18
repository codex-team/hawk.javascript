import { describe, it, expect, afterEach, vi } from 'vitest';
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

describe('Socket', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should close websocket on pagehide and recreate connection on next send()', async () => {
    const closeSpy = vi.fn(function (this: MockWebSocket) {
      this.readyState = WebSocket.CLOSED;
      this.onclose?.({ code: 1000 } as CloseEvent);
    });

    let webSocket!: MockWebSocket;
    const WebSocketConstructor = vi.fn<(url: string) => void>().mockImplementation(function (
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
      webSocket = this;
    });
    globalThis.WebSocket = WebSocketConstructor;

    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

    // initialize socket and open fake websocket connection
    const socket = new Socket({ collectorEndpoint: MOCK_WEBSOCKET_URL });
    webSocket.readyState = WebSocket.OPEN;
    webSocket.onopen?.(new Event('open'));

    // capture pagehide handler to verify it's properly removed
    const pagehideCall = addEventListenerSpy.mock.calls.find(([event]) => event === 'pagehide');
    expect(pagehideCall).toBeDefined();
    const pagehideHandler = pagehideCall![1] as EventListener;

    // trigger pagehide event
    window.dispatchEvent(new Event('pagehide'));

    // websocket connection should be closed
    expect(closeSpy).toHaveBeenCalledOnce();
    expect(removeEventListenerSpy).toHaveBeenCalledWith('pagehide', pagehideHandler, { capture: true });

    // send socket method should make websocket reconnect
    const sendPromise = socket.send({ foo: 'bar' } as CatcherMessage);
    webSocket.readyState = WebSocket.OPEN;
    webSocket.onopen?.(new Event('open'));
    await sendPromise;

    expect(WebSocketConstructor).toHaveBeenCalledTimes(2);
  });
});
