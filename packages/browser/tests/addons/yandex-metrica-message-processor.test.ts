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

  it('should attach counterId and ClientID from Yandex Metrica', () => {
    const ym = vi.fn((_counterId, _method, callback) => callback('client-id')) as YandexMetricaMock;

    ym.a = [[456, 'init', {}]];
    setYandexMetrica(ym);

    const result = new YandexMetricaAddonMessageProcessor().apply(makePayload());

    expect(ym).toHaveBeenCalledWith(456, 'getClientID', expect.any(Function));
    expect(result.addons).toHaveProperty(YANDEX_METRICA_ADDON_KEY, {
      counterId: 456,
      clientId: 'client-id',
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

  it('should attach identifiers only after getClientID resolves', () => {
    let resolveClientId: ((clientId: unknown) => void) | undefined;
    const ym = vi.fn((_counterId, _method, callback) => {
      resolveClientId = callback;
    }) as YandexMetricaMock;

    ym.a = [[456, 'init', {}]];
    setYandexMetrica(ym);

    const processor = new YandexMetricaAddonMessageProcessor();

    expect(processor.apply(makePayload()).addons).toEqual({});

    resolveClientId?.('client-id');

    expect(processor.apply(makePayload()).addons).toHaveProperty(YANDEX_METRICA_ADDON_KEY, {
      counterId: 456,
      clientId: 'client-id',
    });
  });
});
