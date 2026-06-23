import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  YANDEX_METRICA_ADDON_KEY,
  YandexMetricaAddonMessageProcessor
} from '../../src/addons/yandex-metrica-addon-message-processor';
import { makePayload } from './message-processor.helpers';

type YandexMetricaMock = ReturnType<typeof vi.fn> & {
  a?: ArrayLike<ArrayLike<unknown>>;
};

function setYandexMetrica(ym?: YandexMetricaMock): void {
  Object.defineProperty(window, 'ym', {
    configurable: true,
    value: ym,
  });
}

describe('YandexMetricaAddonMessageProcessor', () => {
  afterEach(() => {
    setYandexMetrica();
    vi.restoreAllMocks();
  });

  it('should attach counterId and ClientID for multiple Yandex Metrica counters', () => {
    const ym = vi.fn((counterId, _method, callback) => callback(`client-${counterId}`)) as YandexMetricaMock;

    ym.a = [
      [456, 'init', { webvisor: true }],
      [789, 'init', { webvisor: true }],
    ];
    setYandexMetrica(ym);

    const result = new YandexMetricaAddonMessageProcessor().apply(makePayload());

    expect(ym).toHaveBeenCalledWith(456, 'getClientID', expect.any(Function));
    expect(ym).toHaveBeenCalledWith(789, 'getClientID', expect.any(Function));
    expect(result.addons).toHaveProperty(YANDEX_METRICA_ADDON_KEY, {
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

  it('should leave payload unchanged when Yandex Metrica is not installed', () => {
    const payload = makePayload();
    const result = new YandexMetricaAddonMessageProcessor().apply(payload);

    expect(result).toBe(payload);
    expect(result.addons).toEqual({});
  });

  it('should leave payload unchanged when counter ID is unavailable', () => {
    const ym = vi.fn() as YandexMetricaMock;

    setYandexMetrica(ym);

    const payload = makePayload();
    const result = new YandexMetricaAddonMessageProcessor().apply(payload);

    expect(ym).not.toHaveBeenCalled();
    expect(result.addons).toEqual({});
  });

  it('should leave payload unchanged when webvisor is disabled', () => {
    const ym = vi.fn() as YandexMetricaMock;

    ym.a = [[456, 'init', { webvisor: false }]];
    setYandexMetrica(ym);

    const payload = makePayload();
    const result = new YandexMetricaAddonMessageProcessor().apply(payload);

    expect(ym).not.toHaveBeenCalled();
    expect(result.addons).toEqual({});
  });

  it('should leave payload unchanged when webvisor option is missing', () => {
    const ym = vi.fn() as YandexMetricaMock;

    ym.a = [[456, 'init', {}]];
    setYandexMetrica(ym);

    const payload = makePayload();
    const result = new YandexMetricaAddonMessageProcessor().apply(payload);

    expect(ym).not.toHaveBeenCalled();
    expect(result.addons).toEqual({});
  });

  it('should preserve the queue position when an earlier counter is invalid', () => {
    const ym = vi.fn((_counterId, _method, callback) => callback('client-id')) as YandexMetricaMock;

    ym.a = [
      [456, 'init', { webvisor: false }],
      [789, 'init', { webvisor: true }],
    ];
    setYandexMetrica(ym);

    const result = new YandexMetricaAddonMessageProcessor().apply(makePayload());

    expect(result.addons).toHaveProperty(YANDEX_METRICA_ADDON_KEY, {
      ['2']: {
        counterId: 789,
        clientId: 'client-id',
      },
    });
  });

  it('should process no more than ten Yandex Metrica counters', () => {
    const ym = vi.fn((counterId, _method, callback) => callback(`client-${counterId}`)) as YandexMetricaMock;

    ym.a = Array.from({ length: 11 }, (_, index) => [
      100 + index,
      'init',
      { webvisor: true },
    ]);
    setYandexMetrica(ym);

    const result = new YandexMetricaAddonMessageProcessor().apply(makePayload());
    const identifiers = result.addons[YANDEX_METRICA_ADDON_KEY] as Record<string, unknown>;

    expect(ym).toHaveBeenCalledTimes(10);
    expect(identifiers).toHaveProperty('10', {
      counterId: 109,
      clientId: 'client-109',
    });
    expect(identifiers).not.toHaveProperty('11');
  });

  it('should attach identifiers only after getClientID resolves', () => {
    let resolveClientId: ((clientId: unknown) => void) | undefined;
    const ym = vi.fn((_counterId, _method, callback) => {
      resolveClientId = callback;
    }) as YandexMetricaMock;

    ym.a = [[456, 'init', { webvisor: true }]];
    setYandexMetrica(ym);

    const processor = new YandexMetricaAddonMessageProcessor();

    expect(processor.apply(makePayload()).addons).toEqual({});

    resolveClientId?.('client-id');

    expect(processor.apply(makePayload()).addons).toHaveProperty(YANDEX_METRICA_ADDON_KEY, {
      ['1']: {
        counterId: 456,
        clientId: 'client-id',
      },
    });
  });
});
