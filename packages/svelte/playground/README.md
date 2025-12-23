# Hawk Error Tracker - SvelteKit Playground

Test playground for Hawk Error Tracker integration with SvelteKit and Svelte.

## Table of Contents

- [Getting Started](#getting-started)

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
