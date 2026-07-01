import type { MessageProcessor, ProcessingPayload } from '@hawk.so/core';

/**
 * Addon key used to attach Yandex Metrika counters ClientIDs.
 */
export const YANDEX_METRIKA_ADDON_KEY = 'yandexMetrika';

/**
 * Maximum number of Yandex Metrika initialization queue entries to inspect.
 */
const MAX_YANDEX_METRIKA_COUNTERS = 10;

/**
 * Yandex Metrika global function used to call public Metrika methods.
 */
interface YandexMetrikaFunction {
  (
    counterId: number,
    method: 'getClientID',
    callback: (clientId: unknown) => void
  ): void;
  a?: ArrayLike<ArrayLike<unknown>>;
}

/**
 * Browser window with optional Yandex Metrika global function.
 */
type WindowWithYandexMetrika = Window & {
  ym?: YandexMetrikaFunction;
};

/**
 * Yandex Metrika counter ID paired with its visitor ClientID.
 */
interface YandexMetrikaCounterClientId {
  /**
   * Yandex Metrika counter ID.
   */
  counterId: number;

  /**
   * Yandex Metrika visitor ClientID.
   */
  clientId: string;
}

/**
 * Reads up to ten Yandex Metrika counter IDs, requests their ClientIDs once
 * during initialization, and attaches available counters ClientIDs to subsequent events.
 *
 * Important: `window.ym.a[index][0]` relies on the Metrika initialization queue
 * and is not a public API contract. This is acceptable for the MVP, but the SDK
 * should accept counter IDs explicitly in the future.
 *
 * @see https://yandex.ru/support/metrica/ru/objects/get-client-id
 */
export class YandexMetrikaAddonMessageProcessor implements MessageProcessor<'errors/javascript'> {
  /**
   * Cached Yandex Metrika counters ClientIDs keyed by their one-based queue position.
   */
  private countersClientIds: Record<number, YandexMetrikaCounterClientId> = {};

  /**
   * Reads up to ten initialized counters and requests their ClientIDs.
   */
  constructor() {
    const ym = this.getYandexMetrika();

    if (!ym) {
      return;
    }

    this.collectCountersClientIds(ym);
  }

  /**
   * Attaches cached Yandex Metrika counters ClientIDs when they are available.
   *
   * @param payload - event message payload to enrich
   * @returns {ProcessingPayload<'errors/javascript'>} enriched or original payload
   */
  public apply(
    payload: ProcessingPayload<'errors/javascript'>
  ): ProcessingPayload<'errors/javascript'> {
    if (Object.keys(this.countersClientIds).length > 0) {
      (payload.addons as Record<string, unknown>)[YANDEX_METRIKA_ADDON_KEY] = {
        ...this.countersClientIds,
      };
    }

    return payload;
  }

  /**
   * Returns Yandex Metrika global function when it is installed on the page.
   */
  private getYandexMetrika(): YandexMetrikaFunction | undefined {
    const ym = (window as WindowWithYandexMetrika).ym;

    return typeof ym === 'function' ? ym : undefined;
  }

  /**
   * Reads initialized Yandex Metrika counters from the queue and requests ClientIDs.
   *
   * @param ym - Yandex Metrika global function.
   */
  private collectCountersClientIds(ym: YandexMetrikaFunction): void {
    for (let queueIndex = 0; queueIndex < MAX_YANDEX_METRIKA_COUNTERS; queueIndex++) {
      this.collectCounterClientId(ym, queueIndex);
    }
  }

  /**
   * Requests ClientID for one valid Yandex Metrika counter queue entry.
   *
   * @param ym - Yandex Metrika global function.
   * @param queueIndex - Zero-based Metrika initialization queue entry index.
   */
  private collectCounterClientId(ym: YandexMetrikaFunction, queueIndex: number): void {
    const counterId = this.getCounterIdFromQueue(ym, queueIndex);

    if (counterId === undefined) {
      return;
    }

    this.requestClientId(ym, queueIndex, counterId);
  }

  /**
   * Returns valid counter ID from the Yandex Metrika initialization queue.
   *
   * @param ym - Yandex Metrika global function.
   * @param queueIndex - Zero-based Metrika initialization queue entry index.
   */
  private getCounterIdFromQueue(
    ym: YandexMetrikaFunction,
    queueIndex: number
  ): number | undefined {
    const queueEntry = ym.a?.[queueIndex];
    const counterId = this.parseCounterId(queueEntry?.[0]);
    const options = queueEntry?.[2] as { webvisor?: unknown } | undefined;

    if (counterId === undefined || options?.webvisor !== true) {
      return undefined;
    }

    return counterId;
  }

  /**
   * Converts raw counter ID from the Metrika queue to a positive integer.
   *
   * @param rawCounterId - Counter ID read from the Metrika queue.
   */
  private parseCounterId(rawCounterId: unknown): number | undefined {
    const counterId = typeof rawCounterId === 'number' || typeof rawCounterId === 'string'
      ? Number(rawCounterId)
      : NaN;

    if (!Number.isSafeInteger(counterId) || counterId <= 0) {
      return undefined;
    }

    return counterId;
  }

  /**
   * Requests ClientID from Yandex Metrika and caches it when it is available.
   *
   * @param ym - Yandex Metrika global function.
   * @param queueIndex - Zero-based Metrika initialization queue entry index.
   * @param counterId - Yandex Metrika counter ID.
   */
  private requestClientId(
    ym: YandexMetrikaFunction,
    queueIndex: number,
    counterId: number
  ): void {
    try {
      ym(counterId, 'getClientID', (clientId) => {
        this.saveCounterClientId(queueIndex, counterId, clientId);
      });
    } catch {
      /**
       * Yandex Metrika integration must not affect error reporting.
       */
    }
  }

  /**
   * Saves Yandex Metrika counter ID and ClientID under one-based queue position.
   *
   * @param queueIndex - Zero-based Metrika initialization queue entry index.
   * @param counterId - Yandex Metrika counter ID.
   * @param clientId - ClientID returned by Yandex Metrika.
   */
  private saveCounterClientId(queueIndex: number, counterId: number, clientId: unknown): void {
    if (typeof clientId !== 'string' || clientId.length === 0) {
      return;
    }

    this.countersClientIds[queueIndex + 1] = {
      counterId,
      clientId,
    };
  }
}
