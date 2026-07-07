import { describe, it, expect, vi } from 'vitest';
import type { CatcherMessage, EventContext } from '@hawk.so/types';
import { BaseCatcher, HawkUserManager, HawkTraceManager } from '../src';
import type {
  BeforeSendHook,
  Transport,
  BreadcrumbStore,
  BreadcrumbInput,
  MessageProcessor,
  HawkStorage,
  RandomGenerator,
} from '../src';

vi.mock('../../src/utils/logger', () => ({
  log: vi.fn(),
  isLoggerSet: vi.fn(() => false),
  setLogger: vi.fn(),
  resetLogger: vi.fn(),
}));

type TestType = 'errors/javascript';

class TestCatcher extends BaseCatcher<TestType> {
  constructor(
    token: string,
    transport: Transport<TestType>,
    userManager: HawkUserManager,
    release?: string,
    context?: EventContext,
    beforeSend?: BeforeSendHook<TestType>,
    breadcrumbStore?: BreadcrumbStore,
    traceManager?: HawkTraceManager
  ) {
    super(token, transport, userManager, release, context, beforeSend, breadcrumbStore, traceManager);
  }

  protected getCatcherType(): TestType {
    return 'errors/javascript';
  }

  protected getCatcherVersion(): string {
    return '0.0.0-test';
  }

  public async run(error: Error | string, integrationAddons?: Record<string, unknown>, context?: EventContext): Promise<void> {
    return this.formatAndSend(error, integrationAddons, context);
  }

  public addProcessor(...processors: MessageProcessor<TestType>[]): void {
    this.addMessageProcessor(...processors);
  }
}

function makeUserManager(): HawkUserManager {
  const storage: HawkStorage = {
    getItem: vi.fn().mockReturnValue('anon-id'),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  };
  const random: RandomGenerator = {
    getRandomNumbers: vi.fn().mockReturnValue(new Uint8Array(40)),
  };
  return new HawkUserManager(storage, random);
}

function makeTransport() {
  const send = vi.fn<[CatcherMessage<TestType>], Promise<void>>().mockResolvedValue(undefined);
  return { send, transport: { send } as Transport<TestType> };
}

describe('BaseCatcher', () => {
  describe('message processors', () => {
    it('should not send event when a processor returns null', async () => {
      const { send, transport } = makeTransport();
      const catcher = new TestCatcher('token', transport, makeUserManager());

      catcher.addProcessor({ apply: () => null });

      await catcher.run(new Error('test'));

      expect(send).not.toHaveBeenCalled();
    });

    it('should stop pipeline at first null-returning processor and skip remaining ones', async () => {
      const { send, transport } = makeTransport();
      const catcher = new TestCatcher('token', transport, makeUserManager());
      const secondProcessor: MessageProcessor<TestType> = { apply: vi.fn((p) => p) };

      catcher.addProcessor({ apply: () => null }, secondProcessor);

      await catcher.run(new Error('test'));

      expect(send).not.toHaveBeenCalled();
      expect(secondProcessor.apply).not.toHaveBeenCalled();
    });

    it('should send event when all processors pass the payload through', async () => {
      const { send, transport } = makeTransport();
      const catcher = new TestCatcher('token', transport, makeUserManager());

      catcher.addProcessor({ apply: (p) => p }, { apply: (p) => p });

      await catcher.run(new Error('test'));

      expect(send).toHaveBeenCalledOnce();
    });
  });

  describe('beforeSend hook', () => {
    it('should drop event when beforeSend returns false', async () => {
      const { send, transport } = makeTransport();
      const catcher = new TestCatcher('token', transport, makeUserManager(), undefined, undefined, () => false);

      await catcher.run(new Error('test'));

      expect(send).not.toHaveBeenCalled();
    });

    it('should send returned payload when beforeSend returns a valid modified event', async () => {
      const { send, transport } = makeTransport();
      const beforeSend: BeforeSendHook<TestType> = (event) => ({ ...event, title: 'replaced' });
      const catcher = new TestCatcher('token', transport, makeUserManager(), undefined, undefined, beforeSend);

      await catcher.run(new Error('original'));

      expect(send).toHaveBeenCalledOnce();
      expect(send.mock.calls[0][0].payload.title).toBe('replaced');
    });

    it('should send original event when beforeSend mutates the clone without returning', async () => {
      const { send, transport } = makeTransport();
      const beforeSend: BeforeSendHook<TestType> = (event) => {
        event.title = 'mutated';
        // no return — clone was mutated but original should be sent
      };
      const catcher = new TestCatcher('token', transport, makeUserManager(), undefined, undefined, beforeSend);

      await catcher.run(new Error('original'));

      expect(send).toHaveBeenCalledOnce();
      expect(send.mock.calls[0][0].payload.title).toBe('original');
    });

    it('should send original event when beforeSend returns an invalid value', async () => {
      const { send, transport } = makeTransport();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const beforeSend: BeforeSendHook<TestType> = () => 42 as any;
      const catcher = new TestCatcher('token', transport, makeUserManager(), undefined, undefined, beforeSend);

      await catcher.run(new Error('original'));

      expect(send).toHaveBeenCalledOnce();
      expect(send.mock.calls[0][0].payload.title).toBe('original');
    });
  });

  describe('context merging', () => {
    it('should include instance context when no per-call context is provided', async () => {
      const { send, transport } = makeTransport();
      const instanceContext = { env: 'production', version: '1' };
      const catcher = new TestCatcher('token', transport, makeUserManager(), undefined, instanceContext);

      await catcher.run(new Error('test'));

      expect(send.mock.calls[0][0].payload.context).toEqual(instanceContext);
    });

    it('should let per-call context override instance context keys', async () => {
      const { send, transport } = makeTransport();
      const catcher = new TestCatcher(
        'token', transport, makeUserManager(), undefined,
        { env: 'production', version: '1' }
      );

      await catcher.run(new Error('test'), undefined, { version: '2', extra: 'data' });

      expect(send.mock.calls[0][0].payload.context).toEqual({ env: 'production', version: '2', extra: 'data' });
    });

    it('should use only per-call context when no instance context is set', async () => {
      const { send, transport } = makeTransport();
      const catcher = new TestCatcher('token', transport, makeUserManager());

      await catcher.run(new Error('test'), undefined, { requestId: 'abc' });

      expect(send.mock.calls[0][0].payload.context).toEqual({ requestId: 'abc' });
    });
  });

  describe('trace', () => {
    it('should attach SDK-managed trace.id to outgoing payload', async () => {
      const traceManager = new HawkTraceManager();

      traceManager.adoptTraceId('mabc123-550e8400-e29b-41d4-a716-446655440000');

      const { send, transport } = makeTransport();
      const catcher = new TestCatcher('token', transport, makeUserManager(), undefined, undefined, undefined, undefined, traceManager);

      await catcher.run(new Error('test'));

      expect(send).toHaveBeenCalledOnce();
      expect(send.mock.calls[0][0].payload.trace).toEqual({
        id: 'mabc123-550e8400-e29b-41d4-a716-446655440000',
      });
    });

    it('should generate trace id when trace manager is configured', async () => {
      const { send, transport } = makeTransport();
      const catcher = new TestCatcher(
        'token',
        transport,
        makeUserManager(),
        undefined,
        undefined,
        undefined,
        undefined,
        new HawkTraceManager()
      );

      await catcher.run(new Error('test'));

      expect(send.mock.calls[0][0].payload.trace?.id).toMatch(/^[0-9a-z]+-/);
    });

    it('should not attach trace when trace manager is not configured', async () => {
      const { send, transport } = makeTransport();
      const catcher = new TestCatcher('token', transport, makeUserManager());

      await catcher.run(new Error('test'));

      expect(send.mock.calls[0][0].payload.trace).toBeUndefined();
    });

    it('should ignore trace id changes from beforeSend hook', async () => {
      const { send, transport } = makeTransport();
      const beforeSend: BeforeSendHook<TestType> = (event) => ({
        ...event,
        trace: { id: 'fake-user-trace-id' },
      });
      const catcher = new TestCatcher(
        'token',
        transport,
        makeUserManager(),
        undefined,
        undefined,
        beforeSend,
        undefined,
        new HawkTraceManager()
      );

      await catcher.run(new Error('test'));

      expect(send.mock.calls[0][0].payload.trace?.id).not.toBe('fake-user-trace-id');
      expect(send.mock.calls[0][0].payload.trace?.id).toMatch(/^[0-9a-z]+-/);
    });
  });

  describe('breadcrumbs', () => {
    it('should delegate add() to the store', () => {
      const store: BreadcrumbStore = { add: vi.fn(), get: vi.fn().mockReturnValue([]), clear: vi.fn() };
      const { transport } = makeTransport();
      const catcher = new TestCatcher('token', transport, makeUserManager(), undefined, undefined, undefined, store);
      const crumb: BreadcrumbInput = { message: 'user clicked' };

      catcher.breadcrumbs.add(crumb);

      expect(store.add).toHaveBeenCalledWith(crumb, undefined);
    });

    it('should delegate get() to the store', () => {
      const crumbs = [{ message: 'click', timestamp: 1000 }];
      const store: BreadcrumbStore = { add: vi.fn(), get: vi.fn().mockReturnValue(crumbs), clear: vi.fn() };
      const { transport } = makeTransport();
      const catcher = new TestCatcher('token', transport, makeUserManager(), undefined, undefined, undefined, store);

      expect(catcher.breadcrumbs.get()).toBe(crumbs);
    });

    it('should delegate clear() to the store', () => {
      const store: BreadcrumbStore = { add: vi.fn(), get: vi.fn().mockReturnValue([]), clear: vi.fn() };
      const { transport } = makeTransport();
      const catcher = new TestCatcher('token', transport, makeUserManager(), undefined, undefined, undefined, store);

      catcher.breadcrumbs.clear();

      expect(store.clear).toHaveBeenCalledOnce();
    });

    it('should return empty array from get() when no store is configured', () => {
      const { transport } = makeTransport();
      const catcher = new TestCatcher('token', transport, makeUserManager());

      expect(catcher.breadcrumbs.get()).toEqual([]);
    });

    it('should not throw when add() is called without a store', () => {
      const { transport } = makeTransport();
      const catcher = new TestCatcher('token', transport, makeUserManager());

      expect(() => catcher.breadcrumbs.add({ message: 'test' })).not.toThrow();
    });

    it('should not throw when clear() is called without a store', () => {
      const { transport } = makeTransport();
      const catcher = new TestCatcher('token', transport, makeUserManager());

      expect(() => catcher.breadcrumbs.clear()).not.toThrow();
    });
  });
});
