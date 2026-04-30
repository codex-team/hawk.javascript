import { describe, it, expect, afterEach, vi } from 'vitest';
import Socket from '../src/modules/socket';
import type { CatcherMessage } from '@hawk.so/types';

const MOCK_WEBSOCKET_URL = 'ws://localhost:1234';

/**
 * vi.fn() replacement has no WebSocket.OPEN/CLOSED; Socket uses them in switch — without this,
 * `undefined === undefined` always hits the first `case WebSocket.OPEN` and reconnect never runs.
 */
function patchWebSocketMockConstructor(ctor: { CONNECTING?: number; OPEN?: number; CLOSING?: number; CLOSED?: number }): void {
  ctor.CONNECTING = 0;
  ctor.OPEN = 1;
  ctor.CLOSING = 2;
  ctor.CLOSED = 3;
}

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

/**
 * Regression: queued events must be flushed after reconnect / init, not only on first constructor connect.
 */
describe('Socket — events queue after connection loss', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  function mockWebSocketFactory(sockets: MockWebSocket[], closeSpy: ReturnType<typeof vi.fn>) {
    const ctor = vi.fn<(url: string) => void>().mockImplementation(function (
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
      sockets.push(this);
    });
    patchWebSocketMockConstructor(ctor);

    return ctor;
  }

  it('should flush queued event after reconnect when socket is CLOSED', async () => {
    const sockets: MockWebSocket[] = [];
    const closeSpy = vi.fn(function (this: MockWebSocket) {
      this.readyState = WebSocket.CLOSED;
      this.onclose?.({ code: 1001 } as CloseEvent);
    });

    const WebSocketConstructor = mockWebSocketFactory(sockets, closeSpy);
    globalThis.WebSocket = WebSocketConstructor as unknown as typeof WebSocket;

    const socket = new Socket({
      collectorEndpoint: MOCK_WEBSOCKET_URL,
      reconnectionTimeout: 10,
    });

    const ws1 = sockets[0];
    ws1.readyState = WebSocket.OPEN;
    ws1.onopen?.(new Event('open'));
    await Promise.resolve();

    ws1.readyState = WebSocket.CLOSED;

    const payload = { type: 'errors/javascript', title: 'queued-after-drop' } as unknown as CatcherMessage<'errors/javascript'>;
    const sendPromise = socket.send(payload);

    const ws2 = sockets[1];
    expect(ws2).toBeDefined();
    ws2.readyState = WebSocket.OPEN;
    ws2.onopen?.(new Event('open'));
    await sendPromise;

    expect(ws2.send).toHaveBeenCalledTimes(1);
    expect(ws2.send).toHaveBeenCalledWith(JSON.stringify(payload));
  });

  it('should flush queued event when ws is null after pagehide and send()', async () => {
    const closeSpy = vi.fn(function (this: MockWebSocket) {
      this.readyState = WebSocket.CLOSED;
      this.onclose?.({ code: 1000 } as CloseEvent);
    });

    const sockets: MockWebSocket[] = [];
    const WebSocketConstructor = mockWebSocketFactory(sockets, closeSpy);
    globalThis.WebSocket = WebSocketConstructor as unknown as typeof WebSocket;

    const socket = new Socket({ collectorEndpoint: MOCK_WEBSOCKET_URL });
    sockets[0].readyState = WebSocket.OPEN;
    sockets[0].onopen?.(new Event('open'));
    await Promise.resolve();

    window.dispatchEvent(new Event('pagehide'));

    const queued = { foo: 'bar' } as unknown as CatcherMessage<'errors/javascript'>;
    const sendPromise = socket.send(queued);
    sockets[1].readyState = WebSocket.OPEN;
    sockets[1].onopen?.(new Event('open'));
    await sendPromise;

    expect(sockets[1].send).toHaveBeenCalledTimes(1);
    expect(sockets[1].send).toHaveBeenCalledWith(JSON.stringify(queued));
  });
});
