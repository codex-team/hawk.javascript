# Hawk Error Tracker - SvelteKit Playground

Test playground for Hawk Error Tracker integration with SvelteKit.

## Table of Contents

- [Getting Started](#getting-started)
- [Hawk Integration](#hawk-integration)
- [Error Handling](#error-handling)
- [Error Test Pages](#error-test-pages)

## Getting Started

### Setup

**1. Install dependencies:**

```shell
yarn install
```

**2. Start development server:**

```shell
yarn dev
```

## Hawk Integration

Current integration in `hooks.client.ts`:

```typescript
import Hawk from '@hawk.so/svelte';

if (import.meta.env.VITE_HAWK_TOKEN) {
  new Hawk({
    token: import.meta.env.VITE_HAWK_TOKEN
  });
}
```

Hawk automatically registers global error handlers for:

- `window.onerror`
- `window.onunhandledrejection`

**Note:** Hawk Catcher currently catches only client-side errors via global event listeners (🟡).

## Error Handling

### Global Error Handlers (🟡)

Global browser error handlers that catch unhandled errors:

- **`window.error`**
- **`window.unhandledrejection`**

**Caught by Hawk Catcher.**

## Error Test Pages

The playground includes test pages to demonstrate each error catching mechanism:

### Global Error Handlers (🟡) - Caught by Hawk

1. **Runtime Error** (`/errors/runtime-error`)
   - Demonstrates synchronous error in event handler
   - Caught by window event listener `error`

2. **Promise Rejection** (`/errors/promise-rejection`)
   - Demonstrates unhandled Promise rejection
   - Caught by window event listener `unhandledrejection`
