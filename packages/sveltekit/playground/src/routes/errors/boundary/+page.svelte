<script lang="ts">
  import ErrorComponent from './ErrorComponent.svelte';

  let showError = $state(false);

  function triggerError() {
    showError = true;
  }

  function handleBoundaryError(error: Error) {
    console.error('🟢 [svelte:boundary] Caught error:', error);
  }
</script>

<div class="container">
  <h1>Error Boundary Test</h1>
  <p>Click the button to trigger a rendering error.</p>
  <p><strong>Caught by:</strong> <code>&lt;svelte:boundary&gt;</code> (🟢 green dot in console)</p>

  <button onclick={triggerError} disabled={showError}>
    Trigger Error
  </button>

  {#snippet failed(error, reset)}
    <div class="error-fallback">
      <h3>Error Boundary Caught Error</h3>
      <p>Message: {error.message}</p>
      <button onclick={() => { showError = false; reset(); }}>Reset</button>
    </div>
  {/snippet}

  <svelte:boundary onerror={handleBoundaryError} {failed}>
    {#if showError}
      <ErrorComponent shouldError={true} />
    {/if}
  </svelte:boundary>
</div>
