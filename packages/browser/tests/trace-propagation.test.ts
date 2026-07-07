import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HawkTraceManager, HAWK_TRACE_HEADER } from '@hawk.so/core';
import {
  TracePropagation,
  resolvePropagationTargets,
  resolveTracePropagationMatcher,
} from '../src/features/trace-propagation';

const MATCHING_URL = '/api/projects';
const NON_MATCHING_URL = '/public/status';

function getTraceHeader(init?: RequestInit): string | null {
  if (!init?.headers) {
    return null;
  }

  return new Headers(init.headers as HeadersInit).get(HAWK_TRACE_HEADER);
}

describe('TracePropagation', () => {
  let traceManager: HawkTraceManager;
  let propagation: TracePropagation | null = null;
  let originalFetch: typeof fetch;
  let originalXHROpen: typeof XMLHttpRequest.prototype.open;
  let originalXHRSend: typeof XMLHttpRequest.prototype.send;

  beforeEach(() => {
    traceManager = new HawkTraceManager();
    traceManager.adoptTraceId('mabc123-550e8400-e29b-41d4-a716-446655440000');
    originalFetch = window.fetch;
    originalXHROpen = XMLHttpRequest.prototype.open;
    originalXHRSend = XMLHttpRequest.prototype.send;
  });

  afterEach(() => {
    propagation = null;
    window.fetch = originalFetch;
    XMLHttpRequest.prototype.open = originalXHROpen;
    XMLHttpRequest.prototype.send = originalXHRSend;
  });

  describe('resolvePropagationTargets', () => {
    it('should return null when propagation targets are missing or invalid', () => {
      expect(resolvePropagationTargets()).toBeNull();
      expect(resolvePropagationTargets({})).toBeNull();
      expect(resolvePropagationTargets({ propagationTargets: [] })).toBeNull();
      expect(resolvePropagationTargets({ propagationTargets: ['', '   '] })).toBeNull();
      expect(resolvePropagationTargets({ propagationTargets: null as unknown as string[] })).toBeNull();
    });

    it('should keep only valid targets', () => {
      expect(resolvePropagationTargets({
        propagationTargets: ['', 'https://api.example.com', /^\/api\//],
      })).toEqual([
        'https://api.example.com',
        /^\/api\//,
      ]);
    });
  });

  describe('resolveTracePropagationMatcher', () => {
    it('should return null when feature is not configured', () => {
      expect(resolveTracePropagationMatcher()).toBeNull();
      expect(resolveTracePropagationMatcher({})).toBeNull();
      expect(resolveTracePropagationMatcher({ propagationTargets: [] })).toBeNull();
    });
  });

  it('should add hawk-trace-id only to configured fetch targets', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('ok'));

    window.fetch = fetchMock as typeof fetch;

    propagation = new TracePropagation(traceManager, {
      propagationTargets: ['https://api.example.com', /^\/api\//],
    });
    propagation.init();

    await window.fetch(MATCHING_URL);
    await window.fetch(NON_MATCHING_URL);

    expect(fetchMock).toHaveBeenCalledTimes(2);

    const [, matchingInit] = fetchMock.mock.calls[0];
    const [, nonMatchingInit] = fetchMock.mock.calls[1];

    expect(getTraceHeader(matchingInit)).toBe('mabc123-550e8400-e29b-41d4-a716-446655440000');
    expect(getTraceHeader(nonMatchingInit)).toBeNull();
  });

  it.each([
    ['options are omitted', undefined],
    ['trace object is empty', {}],
    ['propagationTargets is an empty array', { propagationTargets: [] }],
    ['propagationTargets contains only invalid urls', { propagationTargets: ['', '   '] }],
  ])('should not add hawk-trace-id anywhere when %s', async (_label, options) => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('ok'));

    window.fetch = fetchMock as typeof fetch;

    propagation = new TracePropagation(traceManager, options);
    propagation.init();

    await window.fetch(MATCHING_URL);
    await window.fetch(NON_MATCHING_URL);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(getTraceHeader(fetchMock.mock.calls[0][1])).toBeNull();
    expect(getTraceHeader(fetchMock.mock.calls[1][1])).toBeNull();
    expect(window.fetch).toBe(fetchMock);
  });

  it('should adopt trace id from fetch response header on configured targets', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('ok', {
      headers: {
        [HAWK_TRACE_HEADER]: 'mabc123-550e8400-e29b-41d4-a716-446655440000',
      },
    }));

    window.fetch = fetchMock as typeof fetch;

    propagation = new TracePropagation(traceManager, {
      propagationTargets: [/^\/api\//],
    });
    propagation.init();

    await window.fetch(MATCHING_URL);

    expect(traceManager.getTraceId()).toBe('mabc123-550e8400-e29b-41d4-a716-446655440000');
  });

  it('should add hawk-trace-id header for configured XMLHttpRequest targets', () => {
    propagation = new TracePropagation(traceManager, {
      propagationTargets: [/^\/api\//],
    });
    propagation.init();

    const setRequestHeader = vi.spyOn(XMLHttpRequest.prototype, 'setRequestHeader');
    const xhr = new XMLHttpRequest();

    xhr.open('GET', MATCHING_URL);
    xhr.send();

    expect(setRequestHeader).toHaveBeenCalledWith(
      HAWK_TRACE_HEADER,
      'mabc123-550e8400-e29b-41d4-a716-446655440000'
    );
  });
});
