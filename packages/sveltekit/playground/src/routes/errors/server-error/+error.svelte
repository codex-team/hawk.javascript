<script lang="ts">
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';

  function reset() {
    goto('/errors/server-error');
  }
</script>

<div class="container">
  <h1>Server-side Error Test</h1>
  <p><strong>Caught by:</strong> <code>handleError</code> in hooks.server.ts (🔴 red dot in console)</p>

  <div class="error-fallback">
    <h3>Server Error Caught</h3>
    <p>Status: {$page.status}</p>
    <p>Message: {$page.error?.message}</p>
    <button onclick={reset}>Reset</button>
  </div>
</div>
