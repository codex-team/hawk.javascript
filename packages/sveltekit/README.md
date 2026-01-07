# Hawk SDK for SvelteKit

Hawk Error Tracker integration for SvelteKit applications.

## Usage

**1. Install package:**

```shell
npm install @hawk.so/sveltekit --save
```

SvelteKit is supported out of the box. Initialize Hawk in app's client hooks.

**2. Create or update `src/hooks.client.ts`:**

```ts
import Hawk from '@hawk.so/sveltekit';

new Hawk({
  token: 'YOUR_INTEGRATION_TOKEN'
});
```
