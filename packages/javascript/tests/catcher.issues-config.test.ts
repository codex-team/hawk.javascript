import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { BreadcrumbManager } from '../src/addons/breadcrumbs';
import type { HawkInitialSettings } from '../src/types';
import type { Transport } from '../src';

const mockParse = vi.hoisted(() => vi.fn().mockResolvedValue([]));
vi.mock('../src/modules/stackParser', () => ({
  default: class { parse = mockParse; },
}));

const TEST_TOKEN = 'eyJpbnRlZ3JhdGlvbklkIjoiOTU3MmQyOWQtNWJhZS00YmYyLTkwN2MtZDk5ZDg5MGIwOTVmIiwic2VjcmV0IjoiZTExODFiZWItMjdlMS00ZDViLWEwZmEtZmUwYTM1Mzg5OWMyIn0=';

function createTransport() {
  const sendSpy = vi.fn().mockResolvedValue(undefined);
  const transport: Transport = { send: sendSpy };

  return { sendSpy, transport };
}

class MockPerformanceObserver {
  public static supportedEntryTypes: string[] = ['longtask', 'long-animation-frame'];
  public static instances: MockPerformanceObserver[] = [];

  public disconnected = false;
  public observedType: string | null = null;

  private readonly callback: PerformanceObserverCallback;

  public constructor(callback: PerformanceObserverCallback) {
    this.callback = callback;
    MockPerformanceObserver.instances.push(this);
  }

  public observe(options: PerformanceObserverInit & { type?: string }): void {
    this.observedType = options.type ?? null;
  }

  public disconnect(): void {
    this.disconnected = true;
  }

  public emit(entries: PerformanceEntry[]): void {
    this.callback(
      { getEntries: () => entries } as PerformanceObserverEntryList,
      this as unknown as PerformanceObserver
    );
  }

  public static byType(type: string): MockPerformanceObserver | undefined {
    return MockPerformanceObserver.instances.find((instance) => instance.observedType === type);
  }

  public static reset(): void {
    MockPerformanceObserver.instances = [];
    MockPerformanceObserver.supportedEntryTypes = ['longtask', 'long-animation-frame'];
  }
}

describe('Catcher issues config', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    localStorage.clear();
    mockParse.mockResolvedValue([]);
    (BreadcrumbManager as any).instance = null;
    MockPerformanceObserver.reset();
    vi.stubGlobal('PerformanceObserver', MockPerformanceObserver as unknown as typeof PerformanceObserver);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  const cases: Array<{
    title: string;
    settings: Partial<HawkInitialSettings>;
    expectGlobalHandlers: boolean;
    expectMonitorInit: boolean;
  }> = [
    {
      title: 'issues=false disables handlers and monitor',
      settings: { issues: false },
      expectGlobalHandlers: false,
      expectMonitorInit: false,
    },
    {
      title: 'omitted issues enables only global handlers',
      settings: {},
      expectGlobalHandlers: true,
      expectMonitorInit: false,
    },
    {
      title: 'empty issues object enables only global handlers',
      settings: { issues: {} },
      expectGlobalHandlers: true,
      expectMonitorInit: false,
    },
    {
      title: 'only longTasks enables only monitor',
      settings: {
        disableGlobalErrorsHandling: true,
        issues: {
          errors: false,
          longTasks: true,
          longAnimationFrames: false,
          webVitals: false,
        },
      },
      expectGlobalHandlers: false,
      expectMonitorInit: true,
    },
    {
      title: 'webVitals object + errors=false enables only monitor',
      settings: {
        issues: {
          errors: false,
          longTasks: false,
          longAnimationFrames: false,
          webVitals: { reportPoorAbove: { LCP: 5000 } },
        },
      },
      expectGlobalHandlers: false,
      expectMonitorInit: true,
    },
    {
      title: 'only errors=true enables only global handlers',
      settings: {
        issues: {
          errors: true,
          longTasks: false,
          longAnimationFrames: false,
          webVitals: false,
        },
      },
      expectGlobalHandlers: true,
      expectMonitorInit: false,
    },
    {
      title: 'disableGlobalErrorsHandling + empty issues enables nothing',
      settings: {
        disableGlobalErrorsHandling: true,
        issues: {},
      },
      expectGlobalHandlers: false,
      expectMonitorInit: false,
    },
    {
      title: 'non-false defined detector option is treated as enabled',
      settings: {
        disableGlobalErrorsHandling: true,
        issues: {
          // Current behavior is permissive: anything except undefined/false enables detector.
          longTasks: 'invalid' as unknown as boolean,
        },
      },
      expectGlobalHandlers: false,
      expectMonitorInit: true,
    },
  ];

  it.each(cases)('should apply config: $title', async ({ settings, expectGlobalHandlers, expectMonitorInit }) => {
    const { transport } = createTransport();
    const { default: Catcher } = await import('../src/catcher');
    const { PerformanceIssuesMonitor } = await import('../src/addons/performance-issues');
    const addEventListenerSpy = vi.spyOn(window, 'addEventListener');
    const monitorInitSpy = vi.spyOn(PerformanceIssuesMonitor.prototype, 'init');

    new Catcher({
      token: TEST_TOKEN,
      breadcrumbs: false,
      consoleTracking: false,
      transport,
      ...settings,
    });

    if (expectGlobalHandlers) {
      expect(addEventListenerSpy).toHaveBeenCalledWith('error', expect.any(Function));
      expect(addEventListenerSpy).toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
    } else {
      expect(addEventListenerSpy).not.toHaveBeenCalledWith('error', expect.any(Function));
      expect(addEventListenerSpy).not.toHaveBeenCalledWith('unhandledrejection', expect.any(Function));
    }

    if (expectMonitorInit) {
      expect(monitorInitSpy).toHaveBeenCalledTimes(1);
    } else {
      expect(monitorInitSpy).not.toHaveBeenCalled();
    }
  });
});
