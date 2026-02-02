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

### Error Boundaries (🟢)

Svelte `<svelte:boundary>` catches errors during:

- Component rendering (synchronous errors in component body)
- Component initialization

Example usage:

```svelte
<svelte:boundary onerror={handleBoundaryError} {failed}>
  <ErrorProneComponent />

  {#snippet failed(error, reset)}
    <p>Error: {error.message}</p>
    <button onclick={reset}>Reset</button>
  {/snippet}
</svelte:boundary>
```

**Not caught by Hawk Catcher.**

### SSR Errors (🔴)

Server-side errors in `load` functions are caught by `handleError` hook in `hooks.server.ts`.

**Not caught by Hawk Catcher.**

## Error Test Pages

The playground includes test pages to demonstrate each error catching mechanism:

### Global Error Handlers (🟡) - Caught by Hawk

1. **Runtime Error** (`/errors/runtime-error`)
   - Demonstrates synchronous error in event handler
   - Caught by window event listener `error`

2. **Promise Rejection** (`/errors/promise-rejection`)
   - Demonstrates unhandled Promise rejection
   - Caught by window event listener `unhandledrejection`

### Error Boundaries (🟢) - Not caught by Hawk

1. **Boundary Error** (`/errors/boundary`)
   - Demonstrates svelte boundary feature
   - Caught by `<svelte:boundary>`

### SSR Errors (🔴) - Not caught by Hawk

1. **Server-side Error** (`/errors/server-error`)
   - Demonstrates error in `load` function
   - Caught by `handleError` in `hooks.server.ts`
