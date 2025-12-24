<script lang="ts">
  import ErrorComponent from './ErrorComponent.svelte';

  let showError = $state(false);

  function triggerError() {
    showError = true;
  }

  function handleBoundaryError(error: Error) {
    console.error('🟢 [svelte:boundary] Caught rendering error:', error);
  }
</script>

<div class="container">
  <h1>Error Boundary - Rendering Test</h1>
  <p>Click the button to trigger a component rendering error.</p>
  <p><strong>Caught by:</strong> <code>&lt;svelte:boundary&gt;</code> (🟢 green dot in console)</p>

  <button onclick={triggerError} disabled={showError}>
    Trigger Rendering Error
  </button>

  {#snippet fallback(error)}
    <div class="error-fallback">
      <h3>Error Boundary Caught Error</h3>
      <p>Message: {error.message}</p>
    </div>
  {/snippet}

  <svelte:boundary onerror={handleBoundaryError} failed={fallback}>
    {#if showError}
      <ErrorComponent shouldError={true} />
    {/if}
  </svelte:boundary>
</div>
