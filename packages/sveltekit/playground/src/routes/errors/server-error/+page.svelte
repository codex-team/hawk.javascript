<script lang="ts">
  import { goto } from '$app/navigation';

  let { data } = $props();

  function triggerError() {
    goto('?error=true');
  }
</script>

<div class="container">
  <h1>Server-side Error Test</h1>
  <p>Click the button to trigger a server-side error in <code>load</code> function.</p>
  <p><strong>Caught by:</strong> <code>handleError</code> in hooks.server.ts (🔴 red dot in console)</p>

  <button onclick={triggerError}>
    Trigger Server Error
  </button>

  <div class="success-message">
    <p>{data.message}</p>
  </div>
</div>
