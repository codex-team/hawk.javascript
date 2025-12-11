# Hawk.so SvelteKit Integration Playground

A comprehensive testing playground for Hawk.so JavaScript SDK integration with SvelteKit. This project demonstrates all
error handling scenarios in SvelteKit and Svelte 5 to inform integration design and validate error tracking coverage.

## Table of Contents

- [Getting Started](#getting-started)
- [Architecture](#architecture)
- [Error Test Scenarios](#error-test-scenarios)
- [Error Detection System](#error-detection-system)
- [Project Structure](#project-structure)
- [Testing Guide](#testing-guide)
- [Key Findings](#key-findings)
- [Integration Notes](#integration-notes)

## Getting Started

### Prerequisites

- Node.js 18+ and Yarn 1.x
- Basic understanding of SvelteKit and Svelte 5

### Installation

```bash
# From repository root
cd /home/reversean/Dev/codex/hawk.javascript

# Install all dependencies
yarn install

# Navigate to playground
cd packages/svelte/playground/svelte-kit

# Start development server
yarn dev
```

Visit `http://localhost:5173` to access the playground.

### Available Scripts

```bash
yarn dev      # Start development server with HMR
yarn build    # Build for production
yarn preview  # Preview production build locally
```

## Architecture

### Error Handling Layers

The playground implements a multi-layer error handling approach to demonstrate SvelteKit's error handling hierarchy:

1. **SvelteKit Hooks** (`hooks.server.ts`, `hooks.client.ts`)
  - Server-side and client-side `handleError` hooks
  - Catches expected errors from load functions and form actions
  - Logs with 🔴 marker

2. **Global Error Handlers** (`+layout.svelte`)
  - `window.onerror` for synchronous runtime errors
  - `window.onunhandledrejection` for promise rejections
  - Logs with 🟡 marker

3. **Error Boundaries** (`<svelte:boundary>`)
  - Svelte 5.3.0+ feature for catching component rendering errors
  - Logs with 🟢 marker

### Key Files

| File                             | Purpose                            |
|----------------------------------|------------------------------------|
| `src/hooks.server.ts`            | Server-side error handling hook    |
| `src/hooks.client.ts`            | Client-side error handling hook    |
| `src/routes/+layout.svelte`      | Global error handlers setup        |
| `src/routes/errors/+page.svelte` | Error test scenario index          |
| `src/app.css`                    | Hawk.so dark theme styling         |
| `src/lib/stores/errorStore.ts`   | Test store for subscription errors |

## Error Test Scenarios

The playground includes 14 comprehensive error test scenarios:

### 1. Load Function Errors

**Load Expected** (`/errors/load-expected`)

- Uses `error()` helper in `+page.ts`
- **Expected:** Caught by `handleError` 🔴
- Tests proper error propagation from load functions

**Load Unexpected** (`/errors/load-unexpected`)

- Throws error directly in `+page.ts`
- **Expected:** Caught by `handleError` 🔴
- Tests unexpected error handling

**Server Load** (`/errors/load-server`)

- Throws error in `+page.server.ts`
- **Expected:** Caught by server `handleError` 🔴
- Tests SSR error handling

### 2. Component Lifecycle Errors

**onMount Error** (`/errors/lifecycle-onmount`)

- Error thrown in `onMount()` lifecycle hook
- **Expected:** Caught by `window.onerror` 🟡
- **Gap:** NOT caught by `handleError`

**$effect Error** (`/errors/lifecycle-effect`)

- Error in Svelte 5 `$effect` rune
- **Expected:** Can be caught by `<svelte:boundary>` or `window.onerror`
- Tests reactive effect error handling

### 3. Event Handler Errors

**Click Handler** (`/errors/event-click`)

- Error in `onclick` event handler
- **Expected:** Caught by `window.onerror` 🟡
- **Gap:** NOT caught by `handleError`

**Submit Handler** (`/errors/event-submit`)

- Error in form `onsubmit` handler
- **Expected:** Caught by `window.onerror` 🟡
- **Gap:** NOT caught by `handleError`

### 4. Async Errors

**setTimeout Error** (`/errors/async-timeout`)

- Error thrown inside `setTimeout`
- **Expected:** Caught by `window.onerror` 🟡
- **Gap:** NOT caught by `handleError` or `<svelte:boundary>`

**Promise Rejection** (`/errors/async-promise`)

- Unhandled promise rejection
- **Expected:** Caught by `window.onunhandledrejection` 🟡
- **Gap:** NOT caught by `handleError` or `<svelte:boundary>`

### 5. Form Action Errors

**Form Validation** (`/errors/form-validation`)

- Uses `fail()` helper for validation errors
- **Expected:** Returned to page, NOT sent to `handleError`
- Tests expected form validation flow

**Form Unexpected** (`/errors/form-unexpected`)

- Throws unexpected error in form action
- **Expected:** Caught by server `handleError` 🔴
- Tests form action error handling

### 6. Error Boundaries

**Boundary Render** (`/errors/boundary-render`)

- Error during component rendering
- **Expected:** Caught by `<svelte:boundary>` 🟢
- Demonstrates error boundary with reset functionality

**Boundary Effect** (`/errors/boundary-effect`)

- Error in `$effect` inside boundary
- **Expected:** Caught by `<svelte:boundary>` 🟢
- Tests boundary with reactive effects

### 7. Store Errors

**Store Subscription** (`/errors/store-subscription`)

- Error in store subscription callback
- **Expected:** Behavior varies by implementation
- **Gap:** NOT consistently caught by any handler

## Error Detection System

### Emoji Markers

Each error is logged with a colored emoji to indicate which handler caught it:

| Marker | Handler             | Scope                                          |
|--------|---------------------|------------------------------------------------|
| 🔴     | `handleError` hook  | Load functions, form actions, expected errors  |
| 🟡     | Global handlers     | Event handlers, async errors, lifecycle errors |
| 🟢     | `<svelte:boundary>` | Component rendering, effects within boundary   |

### Console Output Format

```javascript
// handleError example
🔴 [Server handleError]
Caught
error: {
  error: Error,
    status
:
  500,
    message
:
  "Error message",
    route
:
  "/errors/load-server"
}

// Global handler example
🟡 [window.onerror]
Caught
error: {
  message: "Error message",
    filename
:
  "file.js",
    lineno
:
  42,
    error
:
  Error
}

// Error boundary example
🟢 [<svelte:boundary>] Caught rendering error: Error
```

## Project Structure

```
svelte-kit/
├── src/
│   ├── app.css                      # Hawk.so dark theme
│   ├── app.d.ts                     # TypeScript declarations
│   ├── app.html                     # HTML template
│   ├── hooks.client.ts              # Client handleError hook
│   ├── hooks.server.ts              # Server handleError hook
│   ├── lib/
│   │   ├── assets/
│   │   │   └── favicon.svg
│   │   └── stores/
│   │       └── errorStore.ts        # Test store
│   └── routes/
│       ├── +layout.svelte           # Global error handlers
│       ├── +page.svelte             # Home page
│       └── errors/
│           ├── +page.svelte         # Test index
│           ├── async-promise/
│           ├── async-timeout/
│           ├── boundary-effect/
│           ├── boundary-render/
│           ├── event-click/
│           ├── event-submit/
│           ├── form-unexpected/
│           ├── form-validation/
│           ├── lifecycle-effect/
│           ├── lifecycle-onmount/
│           ├── load-expected/
│           ├── load-server/
│           ├── load-unexpected/
│           └── store-subscription/
├── package.json
├── svelte.config.js
├── tsconfig.json
├── vite.config.ts
└── README.md
```

## Testing Guide

### Manual Testing

1. **Start the development server**
   ```bash
   yarn dev
   ```

2. **Open DevTools Console**
  - Press F12 or right-click → Inspect
  - Navigate to Console tab

3. **Test each scenario**
  - Visit `http://localhost:5173/errors`
  - Click on each test card
  - Trigger the error (button click, form submit, etc.)
  - Observe console output

4. **Verify error detection**
  - Check for emoji marker (🔴, 🟡, or 🟢)
  - Confirm handler matches expected behavior
  - Note any gaps or unexpected behavior

### Expected Results

| Scenario         | Handler             | Marker | Notes                        |
|------------------|---------------------|--------|------------------------------|
| Load functions   | `handleError`       | 🔴     | Both expected and unexpected |
| Server actions   | `handleError`       | 🔴     | Only unexpected errors       |
| Event handlers   | `window.onerror`    | 🟡     | Gap: not in handleError      |
| Lifecycle hooks  | `window.onerror`    | 🟡     | Gap: not in handleError      |
| Async errors     | Global handlers     | 🟡     | Gap: not in handleError      |
| Component render | `<svelte:boundary>` | 🟢     | If wrapped in boundary       |
| Store errors     | Varies              | —      | Gap: inconsistent handling   |

### Automated Testing

Currently, this playground focuses on manual testing. Future enhancements could include:

- E2E tests with Playwright
- Error tracking assertions
- Coverage reports

## Key Findings

### What `handleError` Catches

✅ **Caught by `handleError`:**

- Errors from load functions (`+page.ts`, `+page.server.ts`)
- Unexpected errors from form actions (`+page.server.ts`)
- Errors thrown with `error()` helper

❌ **NOT caught by `handleError`:**

- Event handler errors (click, submit, etc.)
- Lifecycle hook errors (`onMount`, `onDestroy`)
- Reactive statement errors (`$effect`, `$derived`)
- Async errors (`setTimeout`, `setInterval`)
- Unhandled promise rejections
- Store subscription errors

### Integration Recommendations

1. **Multi-layer approach required**
  - Use `handleError` for load/action errors
  - Add global handlers for event/lifecycle errors
  - Consider error boundaries for component isolation

2. **Server vs Client**
  - Server errors: `hooks.server.ts`
  - Client errors: `hooks.client.ts` + global handlers

3. **Error boundary strategy**
  - Wrap critical components in `<svelte:boundary>`
  - Provide fallback UI for graceful degradation
  - Log boundary errors to tracking service

## Integration Notes

### Hawk.so SDK Integration Points

Based on testing, the Hawk.so SDK should integrate at these points:

1. **`hooks.server.ts` and `hooks.client.ts`**
   ```typescript
   export const handleError = ({ error, event, status }) => {
     hawk.send(error, { context: 'sveltekit-hook', route: event.route.id });
     return { message: 'Error occurred' };
   };
   ```

2. **Global error handlers** (`+layout.svelte`)
   ```typescript
   window.addEventListener('error', (event) => {
     hawk.send(event.error, { context: 'global-error' });
   });

   window.addEventListener('unhandledrejection', (event) => {
     hawk.send(event.reason, { context: 'unhandled-rejection' });
   });
   ```

3. **Error boundaries** (optional per-component)
   ```svelte
   <svelte:boundary onerror={(error) => hawk.send(error, { context: 'boundary' })}>
     <CriticalComponent />
   </svelte:boundary>
   ```

### Dependencies

The playground uses local Hawk.so JavaScript SDK:

```json
{
  "dependencies": {
    "@hawk.so/javascript": "file:../../.."
  }
}
```

## Research Documentation

For comprehensive research on Svelte/SvelteKit error handling mechanisms, see:
[`/packages/svelte/docs/error-handling-research.md`](../../docs/error-handling-research.md)

This document covers:

- Complete error handling hierarchy
- Detailed gap analysis
- Workarounds and best practices
- Integration architecture recommendations
- 15+ sources and references

## Contributing

This playground is part of the Hawk.so JavaScript SDK monorepo. To contribute:

1. Follow the existing error test pattern
2. Add new scenarios to `/src/routes/errors/`
3. Update this README with scenario details
4. Ensure proper error detection logging
5. Test with `yarn build` before committing

## License

This playground is part of the [@hawk.so/javascript](../../../..) repository.
