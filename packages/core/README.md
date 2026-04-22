## Hawk Core

Environment-agnostic base for Hawk JavaScript SDKs.

`@hawk.so/core` contains shared logic that every Hawk catcher reuses — the send pipeline, user identity, breadcrumbs contract, data sanitization, stack parsing, logging — without assuming anything about the runtime. Environment-specific SDKs (browser, SvelteKit, Node, …) plug in their own transport, storage and random generator to build a complete catcher on top of it.

If you are looking to track errors in an application, use an environment-specific package such as [@hawk.so/javascript](../javascript). This package is intended for SDK authors.

## Installation

```shell
npm install @hawk.so/core --save
```

```shell
yarn add @hawk.so/core
```

## What is inside

| Export                        | Purpose                                                                                  |
|-------------------------------|------------------------------------------------------------------------------------------|
| `BaseCatcher`                 | Abstract catcher. Handles send pipeline, context, user, breadcrumbs, `beforeSend`.       |
| `HawkUserManager`             | Resolves affected user. Persists auto-generated anonymous ID via `HawkStorage`.          |
| `Transport`                   | Interface for message delivery to the Collector.                                         |
| `HawkStorage`                 | Key–value persistence interface (e.g. `localStorage`, file, memory).                     |
| `RandomGenerator`             | Source of random bytes for ID generation.                                                |
| `MessageProcessor`            | Pipeline step applied to every outgoing event. May enrich, replace or drop payload.      |
| `BreadcrumbStore`             | Breadcrumbs storage contract. Also serves as public `hawk.breadcrumbs` API.              |
| `BreadcrumbsMessageProcessor` | Built-in processor attaching breadcrumbs snapshot to every event.                        |
| `Sanitizer`                   | Trims long strings, flattens big/deep objects, formats class instances.                  |
| `StackParser`                 | Parses `Error.stack` into structured backtrace frames with source code context.          |
| `setLogger` / `log`           | Binding point for environment-specific logger implementation.                            |
| `validateUser` / `validateContext` / `isValidEventPayload` / `isValidBreadcrumb` | Runtime validators used across SDKs. |

## Building your own catcher

Extend `BaseCatcher` and supply environment-specific pieces via constructor.

```ts
import {
  BaseCatcher,
  HawkUserManager,
  setLogger,
  type Transport,
  type HawkStorage,
  type RandomGenerator,
} from '@hawk.so/core';

// 1. Provide a transport that delivers assembled messages to Collector
class MyTransport implements Transport<'errors/javascript'> {
  public async send(message): Promise<void> {
    // e.g. WebSocket, fetch, IPC — whatever fits the runtime
  }
}

// 2. Provide persistence for the anonymous user ID
class MyStorage implements HawkStorage {
  public getItem(key) { /* … */ }
  public setItem(key, value) { /* … */ }
  public removeItem(key) { /* … */ }
}

// 3. Provide randomness (crypto.getRandomValues, node:crypto, …)
class MyRandom implements RandomGenerator {
  public getRandomNumbers(length) { /* … */ }
}

// 4. Optionally, register a logger so that core can surface warnings
setLogger((msg, type, args) => console[type ?? 'log'](msg, args));

// 5. Extend BaseCatcher
export class MyCatcher extends BaseCatcher<'errors/javascript'> {
  public constructor(token: string) {
    const userManager = new HawkUserManager(new MyStorage(), new MyRandom());

    super(
      token,
      new MyTransport(),
      userManager,
      /* release */ undefined,
      /* context */ undefined,
      /* beforeSend */ undefined,
      /* breadcrumbStore */ undefined
    );
  }

  protected getCatcherType() {
    return 'errors/javascript' as const;
  }

  protected getCatcherVersion() {
    return '1.0.0';
  }
}
```

`MyCatcher` now exposes the full public surface inherited from `BaseCatcher`: `send`, `test`, `setUser`, `clearUser`, `setContext`, `breadcrumbs`.

## Send pipeline

Every event goes through the same stages inside `BaseCatcher`:

1. Build base payload — title, type, release, user, context, backtrace, catcher version.
2. Run registered `MessageProcessor`s in order. Processors may enrich the payload (e.g. browser addons, console output) or return `null` to drop it.
3. Apply the optional `beforeSend` hook on a `structuredClone` of the payload. Return the modified event, or `false` to drop it.
4. Dispatch via the provided `Transport`.

If a `BreadcrumbStore` is provided to the constructor, `BreadcrumbsMessageProcessor` is registered automatically and a breadcrumbs snapshot is captured into every outgoing event.

## Adding processors

Subclasses register environment-specific processors via the protected `addMessageProcessor` method:

```ts
this.addMessageProcessor(new BrowserAddonMessageProcessor());
this.addMessageProcessor(new ConsoleOutputAddonMessageProcessor(consoleCatcher));
```

A processor implements `MessageProcessor<T>`:

```ts
import type { MessageProcessor, ProcessingPayload, ErrorSnapshot } from '@hawk.so/core';

class ReleaseTagProcessor implements MessageProcessor<'errors/javascript'> {
  public apply(payload: ProcessingPayload<'errors/javascript'>, snapshot?: ErrorSnapshot) {
    payload.addons = { ...payload.addons, buildTag: process.env.BUILD_TAG };

    return payload;
  }
}
```

Returning `null` from `apply` drops the event before it reaches transport.

## Sanitizer

`Sanitizer.sanitize(data)` is applied to context and integration addons before sending. It trims long strings, caps array/object size and depth, detects circular references and formats classes as `<class Foo>` / `<instance of Foo>`. Custom type handlers can be registered:

```ts
import { Sanitizer } from '@hawk.so/core';

Sanitizer.registerHandler({
  check: (value) => value instanceof MyDomainObject,
  format: (value) => ({ kind: 'MyDomainObject', id: value.id }),
});
```

## License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.
See the [LICENSE](../../LICENSE) file for the full text.
