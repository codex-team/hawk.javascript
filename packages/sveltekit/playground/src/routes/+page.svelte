<script lang="ts">
  interface ErrorTest {
    title: string;
    description: string;
    href: string;
    category: string;
  }

  const errorTests: ErrorTest[] = [
    // Window Error Handlers
    {
      title: 'Synchronous Runtime Error',
      description: 'Error thrown in event handler',
      href: '/errors/runtime-error',
      category: 'Global Error Handlers (🟡)'
    },
    {
      title: 'Unhandled Promise Rejection',
      description: 'Promise rejected without catch handler',
      href: '/errors/promise-rejection',
      category: 'Global Error Handlers (🟡)'
    },

    // Error Boundaries
    {
      title: 'Boundary Error',
      description: 'Error caught by svelte:boundary',
      href: '/errors/boundary',
      category: 'Error Boundaries (🟢)'
    },

    // SSR Errors
    {
      title: 'Server-side Error',
      description: 'Error thrown in load function',
      href: '/errors/server-error',
      category: 'SSR Errors (🔴)'
    },
  ];

  const categories = Array.from(new Set(errorTests.map(t => t.category)));
</script>

<svelte:head>
  <title>Hawk Javascript SvelteKit Integration Playground</title>
</svelte:head>

<div class="container">
  <header>
    <h1>🧪 SvelteKit Error Handling Test Suite</h1>
  </header>

  <div class="alert alert-warning">
    <strong>⚠️ Testing Instructions:</strong>
    <ul>
      <li>Open your browser's DevTools Console to see error logs</li>
      <li>Look for colored emoji markers:
        <ul>
          <li>🔴 = SSR error (caught by <code>handleError</code> in hooks.server.ts)</li>
          <li>🟡 = Caught by global <code>window.error</code> or <code>window.unhandledrejection</code></li>
          <li>🟢 = Caught by <code>&lt;svelte:boundary&gt;</code></li>
        </ul>
      </li>
      <li>Each test demonstrates where errors are caught in the SvelteKit error handling hierarchy</li>
    </ul>
  </div>

  {#each categories as category}
    <section>
      <h2>{category}</h2>
      <div class="grid">
        {#each errorTests.filter(t => t.category === category) as test}
          <a href={test.href} class="test-card" data-sveltekit-preload-data="off">
            <h3>{test.title}</h3>
            <p>{test.description}</p>
          </a>
        {/each}
      </div>
    </section>
  {/each}
</div>
