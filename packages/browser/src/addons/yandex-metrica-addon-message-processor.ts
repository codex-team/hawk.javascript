import type { MessageProcessor, ProcessingPayload } from '@hawk.so/core';

/**
 * Addon key used to attach Yandex Metrica identifiers.
 */
export const YANDEX_METRICA_ADDON_KEY = 'yandexMetrica';

interface YandexMetricaFunction {
  (
    counterId: number,
    method: 'getClientID',
    callback: (clientId: unknown) => void
  ): void;
  a?: ArrayLike<ArrayLike<unknown>>;
}

type WindowWithYandexMetrica = Window & {
  ym?: YandexMetricaFunction;
};

/**
 * Reads Yandex Metrica counter ID, requests ClientID once during initialization,
 * and attaches both identifiers to subsequent events.
 *
 * Important: `window.ym.a[0][0]` relies on the Metrica initialization queue
 * and is not a public API contract. This is acceptable for the MVP, but the SDK
 * should accept `counterId` explicitly in the future because a page may have
 * multiple Yandex Metrica counters.
 *
 * @see https://yandex.ru/support/metrica/ru/objects/get-client-id
 */
export class YandexMetricaAddonMessageProcessor implements MessageProcessor<'errors/javascript'> {
  /**
   * Cached Yandex Metrica identifiers.
   */
  private identifiers: {
    counterId: number;
    clientId: string;
  } | null = null;

  /**
   * Reads the first initialized counter and requests its ClientID.
   */
  constructor() {
    const ym = (window as WindowWithYandexMetrica).ym;
    const counterId = Number(ym?.a?.[0]?.[0]);

    if (typeof ym !== 'function' || !Number.isSafeInteger(counterId) || counterId <= 0) {
      return;
    }

    try {
      ym(counterId, 'getClientID', (clientId) => {
        if (typeof clientId === 'string' && clientId.length > 0) {
          this.identifiers = {
            counterId,
            clientId,
          };
        }
      });
    } catch {
      /**
       * Yandex Metrica integration must not affect error reporting.
       */
    }
  }

  /**
   * Attaches cached Yandex Metrica identifiers when they are available.
   *
   * @param payload - event message payload to enrich
   * @returns {ProcessingPayload<'errors/javascript'>} enriched or original payload
   */
  public apply(
    payload: ProcessingPayload<'errors/javascript'>
  ): ProcessingPayload<'errors/javascript'> {
    if (this.identifiers) {
      (payload.addons as Record<string, unknown>)[YANDEX_METRICA_ADDON_KEY] = this.identifiers;
    }

    return payload;
  }
}
