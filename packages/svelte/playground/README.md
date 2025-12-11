# Hawk Error Tracker - SvelteKit Playground

Test playground for Hawk Error Tracker integration with SvelteKit and Svelte 5.

## Table of Contents

- [Getting Started](#getting-started)
- [What Hawk Catches](#what-hawk-catches)
- [Error Test Scenarios](#error-test-scenarios)
- [Testing Guide](#testing-guide)

## Getting Started

### Prerequisites

- Node.js 18+
- Yarn 1.x

### Setup

1. Install dependencies:

```shell
yarn install
```

2. Configure Hawk token:

```shell
cp .env.example .env
```

Then add your token from [hawk.so](https://garage.hawk.so) to `.env`:

```env
VITE_HAWK_TOKEN=your_integration_token_here
```

3. Start development server:

```shell
yarn dev
```

## What Hawk Catches

### ✅ Automatically Caught

Hawk automatically catches these errors via `window.onerror` and `window.onunhandledrejection`:

- Event handler errors (`onclick`, `onsubmit`, etc.)
- Lifecycle errors (`onMount`, `onDestroy`)
- Reactive errors (`$effect`, `$derived`)
- Async errors (`setTimeout`, `setInterval`)
- Unhandled promise rejections
- Component rendering errors

### ❌ Not Caught

- Form validation errors (intentional, use `fail()`)
- Errors caught by `<svelte:boundary>` (requires manual `hawk.send()`)
- SvelteKit `handleError` hook errors (requires manual `hawk.send()`)

## Error Test Scenarios

Visit `/errors` to test 14 error scenarios:

### Load Functions

- **Load Expected** - `error()` helper in `+page.ts`
- **Load Unexpected** - Direct throw in `+page.ts`
- **Server Load** - Error in `+page.server.ts`

### Component Lifecycle

- **onMount Error** - Error in `onMount()` hook
- **$effect Error** - Error in Svelte 5 `$effect` rune

### Event Handlers

- **Click Handler** - Error in `onclick`
- **Submit Handler** - Error in form `onsubmit`

### Async Errors

- **setTimeout Error** - Error inside `setTimeout`
- **Promise Rejection** - Unhandled promise rejection

### Form Actions

- **Form Validation** - `fail()` helper (not tracked)
- **Form Unexpected** - Unexpected form action error

### Error Boundaries

- **Boundary Render** - Component rendering error
- **Boundary Effect** - `$effect` error inside boundary

### Stores

- **Store Subscription** - Error in store callback

## Testing Guide

### Manual Testing

```bash
yarn dev
```

1. Open `http://localhost:5173/errors`
2. Open DevTools Console (F12)
3. Click each test card
4. Trigger the error
5. Check Hawk dashboard for tracked errors

### Console Markers

| Marker | Handler             | Description                  |
|--------|---------------------|------------------------------|
| 🔴     | `handleError` hook  | Load/form action errors      |
| 🟡     | Global handlers     | Event/async/lifecycle errors |
| 🟢     | `<svelte:boundary>` | Component rendering errors   |

### Expected Behavior

| Error Type       | Caught by Hawk | Notes                      |
|------------------|----------------|----------------------------|
| Event handlers   | ✅              | Auto via `window.onerror`  |
| Lifecycle hooks  | ✅              | Auto via `window.onerror`  |
| Async errors     | ✅              | Auto via global handlers   |
| Load functions   | ❌              | Needs manual `hawk.send()` |
| Form actions     | ❌              | Needs manual `hawk.send()` |
| Error boundaries | ❌              | Needs manual `hawk.send()` |

## Integration

Current integration in `hooks.client.ts`:

```typescript
import HawkCatcher from '@hawk.so/javascript';

if (import.meta.env.VITE_HAWK_TOKEN) {
  new HawkCatcher(import.meta.env.VITE_HAWK_TOKEN);
}
```

Hawk automatically registers global error handlers for:

- `window.onerror`
- `window.onunhandledrejection`

**Note:** HawkCatcher is browser-only and cannot run on the server (uses `localStorage`, `window`, etc.). Server-side errors are not tracked automatically.
