# Hawk Error Tracker - SvelteKit Playground

Test playground for Hawk Error Tracker integration with SvelteKit and Svelte.

## Table of Contents

- [Getting Started](#getting-started)
- [Error Handling](#error-handling)
- [Error Test Pages](#error-test-pages)

## Getting Started

### Setup

1. Install dependencies:

```shell
yarn install
```

2. Start development server:

```shell
yarn dev
```

## Integration

Current integration in `hooks.client.ts`:

```typescript
import HawkCatcher from '@hawk.so/javascript';

if (import.meta.env.VITE_HAWK_TOKEN) {
  new HawkCatcher({
    token: import.meta.env.VITE_HAWK_TOKEN
  });
}
```

Hawk automatically registers global error handlers for:

- `window.onerror`
- `window.onunhandledrejection`

**Note:** HawkCatcher is browser-only and cannot run on the server (uses `localStorage`, `window`, etc.). Server-side
errors are not tracked automatically.

## Error Handling

### Global Error Handlers (🔴)

Global browser error handlers that catch unhandled errors:

- **`window.error`**
- **`window.unhandledrejection`**

**Note:** global errors will be caught using Hawk Catcher.

### handleError Client Hook (🟡)

SvelteKit's client-side error hook catches errors during:

- Page load functions (`+page.ts`, `+layout.ts`)
- Server load function errors that reach the client

### Error Boundaries (🟢)

Svelte `<svelte:boundary>` catches errors during:

- Component rendering (synchronous errors in component body)
- Component initialization

Example usage:

```svelte
<svelte:boundary onerror={handleBoundaryError} failed={fallback}>
  <ErrorProneComponent />
</svelte:boundary>
```

**Note:** error boundaries will be caught using Hawk Catcher.

## Error Test Pages

The playground includes test pages to demonstrate each error catching mechanism:

### Global Error Handlers (🔴)

1. **Runtime Error** (`/errors/runtime-error`)
   - Demonstrates synchronous error in event handler
   - Caught by `window.error`

2. **Promise Rejection** (`/errors/promise-rejection`)
   - Demonstrates unhandled Promise rejection
   - Caught by `window.unhandledrejection`

### handleError Client Hook (🟡)

3. **Load Function Error** (`/errors/load-function`)
   - Demonstrates error thrown in page load function
   - Caught by `handleError` hook

### Error Boundaries (🟢)

4. **Component Render Error** (`/errors/component-render`)
   - Demonstrates error during component rendering
   - Caught by `<svelte:boundary>`

