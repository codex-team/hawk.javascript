import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  YANDEX_METRIKA_ADDON_KEY,
  YandexMetrikaAddonMessageProcessor
} from '../../src/addons/yandex-metrika-addon-message-processor';
import { makePayload } from './message-processor.helpers';

type YandexMetrikaMock = ReturnType<typeof vi.fn> & {
  a?: ArrayLike<ArrayLike<unknown>>;
};

function setYandexMetrika(ym?: YandexMetrikaMock): void {
  Object.defineProperty(window, 'ym', {
    configurable: true,
    value: ym,
  });
}

describe('YandexMetrikaAddonMessageProcessor', () => {
  afterEach(() => {
    setYandexMetrika();
    vi.restoreAllMocks();
  });

  it('should attach counterId and ClientID for multiple Yandex Metrika counters', () => {
    const ym = vi.fn((counterId, _method, callback) => callback(`client-${counterId}`)) as YandexMetrikaMock;

    ym.a = [
      [456, 'init', { webvisor: true }],
      [789, 'init', { webvisor: true }],
    ];
    setYandexMetrika(ym);

    const result = new YandexMetrikaAddonMessageProcessor().apply(makePayload());

    expect(ym).toHaveBeenCalledWith(456, 'getClientID', expect.any(Function));
    expect(ym).toHaveBeenCalledWith(789, 'getClientID', expect.any(Function));
    expect(result.addons).toHaveProperty(YANDEX_METRIKA_ADDON_KEY, {
      ['1']: {
        counterId: 456,
        clientId: 'client-456',
      },
      ['2']: {
        counterId: 789,
        clientId: 'client-789',
      },
    });
  });

  it('should leave payload unchanged when Yandex Metrika is not installed', () => {
    const payload = makePayload();
    const result = new YandexMetrikaAddonMessageProcessor().apply(payload);

    expect(result).toBe(payload);
    expect(result.addons).toEqual({});
  });

  it('should leave payload unchanged when counter ID is unavailable', () => {
    const ym = vi.fn() as YandexMetrikaMock;

    setYandexMetrika(ym);

    const payload = makePayload();
    const result = new YandexMetrikaAddonMessageProcessor().apply(payload);

    expect(ym).not.toHaveBeenCalled();
    expect(result.addons).toEqual({});
  });

  it('should leave payload unchanged when webvisor is disabled', () => {
    const ym = vi.fn() as YandexMetrikaMock;

    ym.a = [[456, 'init', { webvisor: false }]];
    setYandexMetrika(ym);

    const payload = makePayload();
    const result = new YandexMetrikaAddonMessageProcessor().apply(payload);

    expect(ym).not.toHaveBeenCalled();
    expect(result.addons).toEqual({});
  });

  it('should leave payload unchanged when webvisor option is missing', () => {
    const ym = vi.fn() as YandexMetrikaMock;

    ym.a = [[456, 'init', {}]];
    setYandexMetrika(ym);

    const payload = makePayload();
    const result = new YandexMetrikaAddonMessageProcessor().apply(payload);

    expect(ym).not.toHaveBeenCalled();
    expect(result.addons).toEqual({});
  });

  it('should preserve the queue position when an earlier counter is invalid', () => {
    const ym = vi.fn((_counterId, _method, callback) => callback('client-id')) as YandexMetrikaMock;

    ym.a = [
      [456, 'init', { webvisor: false }],
      [789, 'init', { webvisor: true }],
    ];
    setYandexMetrika(ym);

    const result = new YandexMetrikaAddonMessageProcessor().apply(makePayload());

    expect(result.addons).toHaveProperty(YANDEX_METRIKA_ADDON_KEY, {
      ['2']: {
        counterId: 789,
        clientId: 'client-id',
      },
    });
  });

  it('should process no more than ten Yandex Metrika counters', () => {
    const ym = vi.fn((counterId, _method, callback) => callback(`client-${counterId}`)) as YandexMetrikaMock;

    ym.a = Array.from({ length: 11 }, (_, index) => [
      100 + index,
      'init',
      { webvisor: true },
    ]);
    setYandexMetrika(ym);

    const result = new YandexMetrikaAddonMessageProcessor().apply(makePayload());
    const countersClientIds = result.addons[YANDEX_METRIKA_ADDON_KEY] as Record<string, unknown>;

    expect(ym).toHaveBeenCalledTimes(10);
    expect(countersClientIds).toHaveProperty('10', {
      counterId: 109,
      clientId: 'client-109',
    });
    expect(countersClientIds).not.toHaveProperty('11');
  });

  it('should attach counters ClientIDs only after getClientID resolves', () => {
    let resolveClientId: ((clientId: unknown) => void) | undefined;
    const ym = vi.fn((_counterId, _method, callback) => {
      resolveClientId = callback;
    }) as YandexMetrikaMock;

    ym.a = [[456, 'init', { webvisor: true }]];
    setYandexMetrika(ym);

    const processor = new YandexMetrikaAddonMessageProcessor();

    expect(processor.apply(makePayload()).addons).toEqual({});

    resolveClientId?.('client-id');

    expect(processor.apply(makePayload()).addons).toHaveProperty(YANDEX_METRIKA_ADDON_KEY, {
      ['1']: {
        counterId: 456,
        clientId: 'client-id',
      },
    });
  });
});
