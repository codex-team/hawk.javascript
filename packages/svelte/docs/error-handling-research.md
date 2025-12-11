# Svelte and SvelteKit Error Handling Research

This document provides comprehensive research on error handling mechanisms in Svelte 5 and SvelteKit to inform the design of Hawk.so JavaScript SDK integration.

## Table of Contents

1. [Svelte Error Handling](#svelte-error-handling)
2. [SvelteKit Error Handling](#sveltekit-error-handling)
3. [Gaps in Error Handling](#gaps-in-error-handling)
4. [Workarounds for Uncaught Scenarios](#workarounds-for-uncaught-scenarios)
5. [Integration Recommendations](#integration-recommendations)

---

## Svelte Error Handling

### 1. Global `window.onerror` Behavior

Svelte applications run in the browser and are subject to standard browser error handling mechanisms:

- **`window.onerror`**: Catches synchronous runtime errors
- **`window.onunhandledrejection`**: Catches unhandled promise rejections

These global handlers work normally in Svelte applications and can be used to catch errors that escape other error boundaries.

**Key Consideration**: Global error handlers are essential for comprehensive error tracking as they catch errors that occur outside the rendering lifecycle.

### 2. Component Lifecycle Errors

Common lifecycle errors in Svelte include:

- **Initialization errors**: Errors during component setup
- **`onMount` errors**: Errors in the onMount lifecycle hook
- **`onDestroy` errors**: Errors during cleanup
- **Async operation errors**: Mismanagement of asynchronous operations within lifecycle hooks

**Best Practices**:
- Properly implement lifecycle hooks to ensure resources are correctly initialized and cleaned up
- Wrap async operations in try-catch blocks
- Clean up subscriptions and event listeners in `onDestroy`

**Reference**: [Svelte Component Lifecycle: Error Solutions](https://www.zipy.ai/blog/debug-svelte-component-lifecycle-errors)

### 3. Reactive Statement Errors

Svelte 5 introduces runes which replace reactive statements (`$:`):

- **`$derived(...)`**: Cannot contain state updates (will throw errors)
- **`$effect(...)`**: Can cause recursive updates if not careful
- **Migration issue**: Converted `$:` blocks that both access and update reactive values may cause recursive updates

**Common Error**: "Maximum update depth exceeded" - indicates an effect reads and writes the same piece of state.

**Reference**: [Runtime errors • Svelte Docs](https://svelte.dev/docs/svelte/runtime-errors)

### 4. Svelte 5 Error Boundaries (`<svelte:boundary>`)

Introduced in Svelte 5.3.0, error boundaries provide component-level error handling.

**Usage**:

```svelte
<svelte:boundary onerror={(error, reset) => {
  // Log error to monitoring service
  console.error(error);
  // Optionally reset the boundary
}}>
  <ComponentThatMightError />
  {#snippet failed(error, reset)}
    <p>Something went wrong: {error.message}</p>
    <button onclick={reset}>Try again</button>
  {/snippet}
</svelte:boundary>
```

**What Error Boundaries Catch**:
- Errors during component rendering
- Errors in effects (`$effect`)

**What Error Boundaries DON'T Catch**:
- Errors in event handlers
- Errors after `setTimeout` or async work
- Errors outside the rendering process
- Server-side rendering errors (SSR)

**Important Limitation**: Error boundaries only work on the client side. SSR errors must be handled separately.

**References**:
- [<svelte:boundary> • Svelte Docs](https://svelte.dev/docs/svelte/svelte-boundary)
- [Catch Errors During Rendering With Svelte Error Boundaries](https://joyofcode.xyz/catch-errors-during-rendering-with-svelte-error-boundaries)
- [GitHub Issue #15625: Breaking changes in error handling](https://github.com/sveltejs/svelte/issues/15625)

---

## SvelteKit Error Handling

SvelteKit distinguishes between **expected** and **unexpected** errors.

### Expected vs Unexpected Errors

- **Expected errors**: Known error conditions (validation failures, not found, etc.)
  - Created using `error()` helper from `@sveltejs/kit`
  - Status codes: 400-599
  - Message is shown to users

- **Unexpected errors**: Bugs in the application
  - Any thrown error that's not an expected error
  - Message is redacted for security (replaced with generic "Internal Error")
  - Status code: 500
  - Stack trace logged to console

**Reference**: [Errors • SvelteKit Docs](https://svelte.dev/docs/kit/errors)

### 1. `handleError` Hooks (Server & Client)

The `handleError` hook runs when an unexpected error is thrown during request handling.

#### Server-Side (`hooks.server.ts`)

```typescript
import type { HandleServerError } from '@sveltejs/kit';

export const handleError: HandleServerError = async ({ error, event }) => {
  // Log to error tracking service
  console.error('Server error:', error);

  // Return user-facing error object
  return {
    message: 'An unexpected error occurred',
    code: (error as any)?.code ?? 'UNKNOWN'
  };
};
```

**Catches**:
- Errors in server-side load functions
- Errors in form actions
- Errors in API endpoints (+server.ts)
- Server-side rendering errors

#### Client-Side (`hooks.client.ts`)

```typescript
import type { HandleClientError } from '@sveltejs/kit';

export const handleError: HandleClientError = async ({ error, event }) => {
  // Log to error tracking service
  console.error('Client error:', error);

  return {
    message: 'Something went wrong'
  };
};
```

**Important Limitation**: Client-side `handleError` only runs for errors in `+page.ts` files, NOT for errors in `+page.svelte` components or browser-only code.

**References**:
- [Hooks / handleError • Svelte Tutorial](https://svelte.dev/tutorial/kit/handleerror)
- [Hooks • SvelteKit Docs](https://svelte.dev/docs/kit/hooks)
- [GitHub Issue #10169: handleError doesn't handle thrown Error](https://github.com/sveltejs/kit/issues/10169)

### 2. Load Function Errors

Load functions (`+page.ts`, `+page.server.ts`, `+layout.ts`, `+layout.server.ts`) have specific error handling:

**Expected Errors**:
```typescript
import { error } from '@sveltejs/kit';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => {
  const post = await fetchPost(params.id);

  if (!post) {
    // This is an expected error
    error(404, {
      message: 'Post not found'
    });
  }

  return { post };
};
```

**Unexpected Errors**:
- Automatically caught by `handleError` hook
- Network failures, database errors, etc.

**Important**: Don't catch the thrown error from `error()` helper, as it prevents SvelteKit from handling it properly.

**Reference**: [Loading data • SvelteKit Docs](https://svelte.dev/docs/kit/load)

### 3. Form Action Errors

Form actions have multiple error handling patterns:

**Expected Errors (Validation)**:
```typescript
import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions = {
  default: async ({ request }) => {
    const data = await request.formData();
    const email = data.get('email');

    if (!email) {
      return fail(400, {
        error: 'Email is required',
        email
      });
    }

    // Process form...
  }
} satisfies Actions;
```

**Unexpected Errors**:
- Thrown errors are caught by `handleError` hook
- Page will not re-render
- User sees error page

**Best Practice**: Always validate on the server side, even if client-side validation exists. Users can manipulate form responses.

**References**:
- [Form actions • SvelteKit Docs](https://svelte.dev/docs/kit/form-actions)
- [SvelteKit Form Example with 10 Mistakes to Avoid](https://rodneylab.com/sveltekit-form-example-with-10-mistakes-to-avoid/)

### 4. Server Endpoint Errors

API routes (`+server.ts`) handle errors similarly:

```typescript
import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
  try {
    const data = await fetchData(params.id);
    return json(data);
  } catch (err) {
    // Unexpected error - goes to handleError
    throw err;
  }

  // Or return expected error
  error(404, 'Resource not found');
};
```

### 5. Component Rendering Errors

**Server-Side**: Errors during SSR are caught by server-side `handleError`

**Client-Side**:
- Rendering errors in `.svelte` files are NOT caught by `handleError`
- Must use `<svelte:boundary>` or global error handlers
- This is a significant gap in SvelteKit's error handling

---

## Gaps in Error Handling

Based on research and GitHub discussions, here are the key gaps where `handleError` doesn't catch errors:

### 1. Client-Side Component Errors

**Gap**: Errors in `.svelte` component code (outside of load functions)

**Example**:
```svelte
<script>
  // This error won't be caught by handleError
  function handleClick() {
    throw new Error('Button clicked');
  }
</script>

<button on:click={handleClick}>Click me</button>
```

**Impact**: High - most application logic runs in components

### 2. Event Handler Errors

**Gap**: Errors thrown in event handlers (`on:click`, `on:submit`, etc.)

**Why**: Event handlers run outside the rendering lifecycle

**Impact**: High - common source of runtime errors

### 3. Async Errors

**Gap**: Errors in async code that's not awaited or caught

**Example**:
```typescript
// This won't be caught by handleError or error boundaries
setTimeout(() => {
  throw new Error('Delayed error');
}, 1000);
```

**Impact**: Medium - less common but hard to debug

### 4. Effect Errors (with error boundaries)

**Gap**: `<svelte:boundary>` catches effect errors, but with limitations

**Issue**: If error occurs after component mount or in specific async scenarios

**Impact**: Low - most effects are caught

### 5. Store Subscription Errors

**Gap**: Errors in Svelte store subscriptions

**Migration Issue**: In Svelte 5, errors thrown in store files that were previously caught with `window.addEventListener('unhandledrejection')` are now handled differently

**Impact**: Medium - affects applications using stores heavily

### 6. Third-Party Library Errors

**Gap**: Errors from third-party libraries that don't propagate correctly

**Example**: Some libraries catch and suppress errors internally

**Impact**: Variable - depends on library usage

**References**:
- [GitHub Discussion #12250: window.onunhandledrejection catching issues](https://github.com/sveltejs/kit/discussions/12250)
- [GitHub Discussion #6499: Simpler error handling](https://github.com/sveltejs/kit/discussions/6499)

---

## Workarounds for Uncaught Scenarios

### 1. Global Error Handlers (Primary Workaround)

Implement global error handlers in the root layout or hooks to catch errors that escape SvelteKit's error handling:

**Implementation in `+layout.svelte`**:

```svelte
<script>
  import { onMount } from 'svelte';
  import { browser } from '$app/environment';

  onMount(() => {
    if (browser) {
      // Catch synchronous errors
      window.addEventListener('error', (event) => {
        console.error('Global error:', event.error);
        // Send to error tracking service
        trackError(event.error);
      });

      // Catch unhandled promise rejections
      window.addEventListener('unhandledrejection', (event) => {
        console.error('Unhandled rejection:', event.reason);
        // Send to error tracking service
        trackError(event.reason);
      });
    }
  });
</script>
```

**Best Practice**: Place this in the root layout to ensure it runs on every page.

### 2. Error Boundaries for Component Errors

Use `<svelte:boundary>` strategically around components that might fail:

```svelte
<svelte:boundary onerror={(error) => {
  // Report to error tracking
  hawkCatcher.send(error);
}}>
  <CriticalComponent />
  {#snippet failed(error, reset)}
    <ErrorFallback {error} {reset} />
  {/snippet}
</svelte:boundary>
```

**Strategy**: Wrap major feature components, not every small component.

### 3. Try-Catch in Event Handlers

Manually wrap event handler code:

```svelte
<script>
  async function handleSubmit(event) {
    try {
      // Handle form submission
      await submitForm(event);
    } catch (error) {
      // Report error
      hawkCatcher.send(error);
      // Show user feedback
      showError(error.message);
    }
  }
</script>

<form on:submit|preventDefault={handleSubmit}>
  <!-- form content -->
</form>
```

### 4. Async Error Wrapper

Create a utility for handling async operations:

```typescript
// lib/utils/async-handler.ts
export async function handleAsync<T>(
  fn: () => Promise<T>,
  errorHandler?: (error: unknown) => void
): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    if (errorHandler) {
      errorHandler(error);
    }
    // Report to error tracking
    hawkCatcher.send(error);
    return null;
  }
}

// Usage
const data = await handleAsync(() => fetchData());
```

### 5. Store Error Handling

Wrap store operations in try-catch:

```typescript
import { writable } from 'svelte/store';

function createSafeStore<T>(initialValue: T) {
  const { subscribe, set, update } = writable(initialValue);

  return {
    subscribe,
    set: (value: T) => {
      try {
        set(value);
      } catch (error) {
        hawkCatcher.send(error);
        throw error;
      }
    },
    update: (fn: (value: T) => T) => {
      try {
        update(fn);
      } catch (error) {
        hawkCatcher.send(error);
        throw error;
      }
    }
  };
}
```

### 6. SSR Error Handling

For server-side errors, ensure proper error handling in load functions:

```typescript
// +page.server.ts
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
  try {
    const data = await fetchData(params.id);
    return { data };
  } catch (err) {
    // Log for monitoring
    console.error('Load error:', err);

    // Return expected error to user
    error(500, {
      message: 'Failed to load data',
      code: 'LOAD_ERROR'
    });
  }
};
```

**References**:
- [Advanced Error Handling in Svelte](https://blog.openreplay.com/advanced-error-handling-in-svelte/)
- [Joy of Code: SvelteKit Hooks](https://joyofcode.xyz/sveltekit-hooks)

---

## Integration Recommendations

Based on this research, here are recommendations for integrating Hawk.so with Svelte/SvelteKit:

### 1. Multi-Layer Approach

Implement error tracking at multiple levels:

```
Layer 1: Global handlers (window.onerror, unhandledrejection)
Layer 2: SvelteKit handleError hooks (server + client)
Layer 3: Error boundaries (<svelte:boundary>)
Layer 4: Manual try-catch in critical code
```

### 2. Initialization Strategy

**Option A: Hook-based initialization**
```typescript
// hooks.client.ts
import HawkCatcher from '@hawk.so/javascript';

const hawk = new HawkCatcher({
  token: 'your-token'
});

// Set up global handlers
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    hawk.send(event.error);
  });

  window.addEventListener('unhandledrejection', (event) => {
    hawk.send(event.reason);
  });
}

export const handleError = ({ error, event }) => {
  hawk.send(error);
  return {
    message: 'An error occurred'
  };
};
```

**Option B: Plugin/Utility approach**
```typescript
// lib/hawk.ts
import HawkCatcher from '@hawk.so/javascript';

export const hawk = new HawkCatcher({
  token: 'your-token'
});

export function setupHawkErrorHandling() {
  if (typeof window !== 'undefined') {
    window.addEventListener('error', (event) => {
      hawk.send(event.error);
    });

    window.addEventListener('unhandledrejection', (event) => {
      hawk.send(event.reason);
    });
  }
}
```

### 3. Context-Aware Error Tracking

Include SvelteKit-specific context:

```typescript
export const handleError = ({ error, event }) => {
  hawk.send(error, {
    route: event.route.id,
    url: event.url.pathname,
    method: event.request.method,
    // Add custom context
  });

  return {
    message: 'An error occurred'
  };
};
```

### 4. Integration Points

Key integration points for comprehensive coverage:

1. **`hooks.server.ts`**: Server-side error tracking
2. **`hooks.client.ts`**: Client-side load function errors
3. **Root `+layout.svelte`**: Global error handlers for components
4. **Error boundaries**: Wrap critical components
5. **Form actions**: Track validation and submission errors
6. **Load functions**: Track data fetching errors

### 5. SSR Considerations

Handle SSR gracefully:

```typescript
import { browser } from '$app/environment';

if (browser) {
  // Client-only initialization
  setupHawkErrorHandling();
}
```

### 6. Performance Considerations

- Debounce error reporting for rapid-fire errors
- Sample errors if volume is high
- Avoid tracking expected errors (404s, validation failures)
- Use async error reporting to not block UI

---

## Sources

This research is based on official documentation and community resources from 2024-2025:

- [Svelte Runtime Errors Documentation](https://svelte.dev/docs/svelte/runtime-errors)
- [SvelteKit Errors Documentation](https://svelte.dev/docs/kit/errors)
- [SvelteKit Hooks Documentation](https://svelte.dev/docs/kit/hooks)
- [Svelte Error Boundaries (<svelte:boundary>)](https://svelte.dev/docs/svelte/svelte-boundary)
- [Advanced Error Handling in Svelte](https://blog.openreplay.com/advanced-error-handling-in-svelte/)
- [Joy of Code: Catch Errors During Rendering With Svelte Error Boundaries](https://joyofcode.xyz/catch-errors-during-rendering-with-svelte-error-boundaries)
- [GitHub Discussion #12250: window.onunhandledrejection and window.onerror](https://github.com/sveltejs/kit/discussions/12250)
- [GitHub Discussion #6499: Simpler, more consistent error handling](https://github.com/sveltejs/kit/discussions/6499)
- [GitHub Issue #10169: handleError from hooks.client limitation](https://github.com/sveltejs/kit/issues/10169)
- [GitHub Issue #15625: Svelte5 error handling breaking changes](https://github.com/sveltejs/svelte/issues/15625)
- [SvelteKit Form Actions Documentation](https://svelte.dev/docs/kit/form-actions)
- [11 Common Svelte Errors Guide](https://dev.to/zipy/11-common-svelte-errors-and-their-solutions-a-complete-guide-to-error-handling-in-svelte-45b9)

---

## Conclusion

Svelte and SvelteKit provide robust error handling mechanisms, but comprehensive error tracking requires a multi-layered approach:

1. **SvelteKit's `handleError`** catches server-side and some client-side errors
2. **`<svelte:boundary>`** catches component rendering errors (client-only)
3. **Global handlers** (`window.onerror`, `unhandledrejection`) catch everything else

For Hawk.so integration, implementing all three layers will provide the most complete error tracking coverage while respecting SvelteKit's architecture and best practices.