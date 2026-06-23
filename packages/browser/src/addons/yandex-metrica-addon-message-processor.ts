import type { MessageProcessor, ProcessingPayload } from '@hawk.so/core';

/**
 * Addon key used to attach Yandex Metrica identifiers.
 */
export const YANDEX_METRICA_ADDON_KEY = 'yandexMetrica';

const MAX_YANDEX_METRICA_COUNTERS = 10;

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

interface YandexMetricaIdentifiers {
  counterId: number;
  clientId: string;
}

/**
 * Reads up to ten Yandex Metrica counter IDs, requests their ClientIDs once
 * during initialization, and attaches available identifiers to subsequent events.
 *
 * Important: `window.ym.a[index][0]` relies on the Metrica initialization queue
 * and is not a public API contract. This is acceptable for the MVP, but the SDK
 * should accept counter IDs explicitly in the future.
 *
 * @see https://yandex.ru/support/metrica/ru/objects/get-client-id
 */
export class YandexMetricaAddonMessageProcessor implements MessageProcessor<'errors/javascript'> {
  /**
   * Cached Yandex Metrica identifiers keyed by their one-based queue position.
   */
  private identifiers: Record<number, YandexMetricaIdentifiers> = {};

  /**
   * Reads up to ten initialized counters and requests their ClientIDs.
   */
  constructor() {
    const ym = (window as WindowWithYandexMetrica).ym;

    if (typeof ym !== 'function') {
      return;
    }

    for (let queueIndex = 0; queueIndex < MAX_YANDEX_METRICA_COUNTERS; queueIndex++) {
      const queueEntry = ym.a?.[queueIndex];
      const rawCounterId = queueEntry?.[0];
      const counterId = typeof rawCounterId === 'number' || typeof rawCounterId === 'string'
        ? Number(rawCounterId)
        : NaN;
      const options = queueEntry?.[2] as { webvisor?: unknown } | undefined;
      const isWebvisorEnabled = options?.webvisor === true;

      if (!Number.isSafeInteger(counterId) || counterId <= 0 || !isWebvisorEnabled) {
        continue;
      }

      try {
        ym(counterId, 'getClientID', (clientId) => {
          if (typeof clientId === 'string' && clientId.length > 0) {
            this.identifiers[queueIndex + 1] = {
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
    if (Object.keys(this.identifiers).length > 0) {
      (payload.addons as Record<string, unknown>)[YANDEX_METRICA_ADDON_KEY] = {
        ...this.identifiers,
      };
    }

    return payload;
  }
}
