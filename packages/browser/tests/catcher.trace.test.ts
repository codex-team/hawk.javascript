import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HAWK_TRACE_HEADER } from '@hawk.so/core';
import { BrowserBreadcrumbStore } from '../src/addons/breadcrumbs';
import { createCatcher, createTransport, getLastPayload, wait } from './catcher.helpers';
import type { HawkInitialSettings } from '../src/types';

const mockParse = vi.hoisted(() => vi.fn().mockResolvedValue([]));

vi.mock('@hawk.so/core', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@hawk.so/core')>();

  return {
    ...actual,
    StackParser: class {
      public parse = mockParse;
    },
  };
});

const MATCHING_URL = '/api/projects';
const NON_MATCHING_URL = '/public/status';
const ADOPTED_TRACE_ID = 'mabc123-550e8400-e29b-41d4-a716-446655440000';

function getTraceHeader(init?: RequestInit): string | null {
  if (!init?.headers) {
    return null;
  }

  return new Headers(init.headers as HeadersInit).get(HAWK_TRACE_HEADER);
}

function findFetchCall(fetchMock: ReturnType<typeof vi.fn>, url: string) {
  return fetchMock.mock.calls.find(([input]) => {
    if (typeof input === 'string') {
      return input === url;
    }

    if (input instanceof URL) {
      return input.pathname === url;
    }

    return input.url === url;
  });
}

describe('Catcher trace', () => {
  let originalFetch: typeof fetch;

  beforeEach(() => {
    localStorage.clear();
    mockParse.mockResolvedValue([]);
    originalFetch = window.fetch;
  });

  afterEach(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (BrowserBreadcrumbStore as any).instance?.destroy();
    window.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('should add hawk-trace-id only to configured propagation targets', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('ok'));

    window.fetch = fetchMock as typeof fetch;

    const { sendSpy, transport } = createTransport();
    createCatcher(transport, {
      trace: {
        propagationTargets: [/^\/api\//],
      },
    }).send(new Error('init trace'));
    await wait();

    const traceId = getLastPayload(sendSpy).trace?.id;

    expect(traceId).toMatch(/^[0-9a-z]+-/);

    await window.fetch(MATCHING_URL);
    await window.fetch(NON_MATCHING_URL);

    const matchingCall = findFetchCall(fetchMock, MATCHING_URL);
    const nonMatchingCall = findFetchCall(fetchMock, NON_MATCHING_URL);

    expect(matchingCall).toBeDefined();
    expect(nonMatchingCall).toBeDefined();

    expect(getTraceHeader(matchingCall![1])).toBe(traceId);
    expect(getTraceHeader(nonMatchingCall![1])).toBeNull();
  });

  it('should adopt trace id from response header on configured targets', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('ok', {
      headers: {
        [HAWK_TRACE_HEADER]: ADOPTED_TRACE_ID,
      },
    }));

    window.fetch = fetchMock as typeof fetch;

    const { sendSpy, transport } = createTransport();
    const catcher = createCatcher(transport, {
      trace: {
        propagationTargets: [/^\/api\//],
      },
    });

    await window.fetch(MATCHING_URL);
    catcher.send(new Error('after adopt'));
    await wait();

    expect(getLastPayload(sendSpy).trace?.id).toBe(ADOPTED_TRACE_ID);
  });

  it.each<[string, Record<string, unknown>]>([
    ['trace settings are omitted', {}],
    ['trace object is empty', { trace: {} }],
    ['trace has no propagationTargets', { trace: { propagationTargets: undefined } }],
    ['propagationTargets is an empty array', { trace: { propagationTargets: [] } }],
    ['propagationTargets contains only invalid urls', { trace: { propagationTargets: ['', '   '] } }],
  ])('should not enable trace anywhere when %s', async (_label, options) => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('ok'));

    window.fetch = fetchMock as typeof fetch;

    const { sendSpy, transport } = createTransport();
    createCatcher(transport, options as Partial<HawkInitialSettings>).send(new Error('init trace'));
    await wait();

    expect(getLastPayload(sendSpy).trace).toBeUndefined();

    await window.fetch(MATCHING_URL);
    await window.fetch(NON_MATCHING_URL);

    const matchingCall = findFetchCall(fetchMock, MATCHING_URL);
    const nonMatchingCall = findFetchCall(fetchMock, NON_MATCHING_URL);

    expect(matchingCall).toBeDefined();
    expect(nonMatchingCall).toBeDefined();
    expect(getTraceHeader(matchingCall![1])).toBeNull();
    expect(getTraceHeader(nonMatchingCall![1])).toBeNull();
    expect(window.fetch).toBe(fetchMock);
  });
});
