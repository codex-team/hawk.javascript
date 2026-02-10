# Hawk Error Tracker - SvelteKit Playground

Test playground for Hawk Error Tracker integration with SvelteKit.

## Table of Contents

- [Getting Started](#getting-started)

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
