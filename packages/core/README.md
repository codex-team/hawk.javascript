# Hawk JavaScript Core

Environment-agnostic base for Hawk JavaScript/TypeScript SDKs.

## Installation

```shell
npm install @hawk.so/core --save
```

```shell
yarn add @hawk.so/core
```

## What is inside

| Export                                                                           | Purpose                                                                             |
|----------------------------------------------------------------------------------|-------------------------------------------------------------------------------------|
| `BaseCatcher`                                                                    | Abstract catcher. Handles send pipeline, context, user, breadcrumbs.                |
| `BeforeSendHook`                                                                 | User hook applied to every outgoing event. Applied after `MessageProcessor`'s.      |
| `BreadcrumbStore`                                                                | Breadcrumbs storage contract. Also serves as public breadcrumbs API.                |
| `HawkUserManager`                                                                | Resolves affected user. Persists auto-generated anonymous ID via `HawkStorage`.     |
| `HawkStorage`                                                                    | Key–value persistence interface (e.g. `localStorage`, file, memory).                |
| `log` / `setLogger`                                                              | Binding point for environment-specific logger implementation.                       |
| `MessageProcessor`                                                               | Pipeline step applied to every outgoing event. May enrich, replace or drop payload. |
| `RandomGenerator`                                                                | Source of random bytes for ID generation.                                           |
| `Transport`                                                                      | Interface for message delivery to Collector.                                        |
| `Sanitizer`                                                                      | Trims long strings, flattens big/deep objects, formats class instances.             |
| `StackParser`                                                                    | Parses `Error.stack` into structured backtrace frames with source code context.     |
| `validateUser` / `validateContext` / `isValidEventPayload` / `isValidBreadcrumb` | Runtime validators used across SDKs.                                                |

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
  public getItem(key) {
    // ...
  }

  public setItem(key, value) {
    // ...
  }

  public removeItem(key) {
    // ...
  }
}

// 3. Provide randomness (crypto.getRandomValues, node:crypto, …)
class MyRandom implements RandomGenerator {
  public getRandomNumbers(length) { /* … */
  }
}

// 4. Optionally, register logger
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

## License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.
See the [LICENSE](../../LICENSE) file for the full text.
