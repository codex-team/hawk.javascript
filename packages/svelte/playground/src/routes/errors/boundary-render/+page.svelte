<script lang="ts">
  import BrokenComponent from './BrokenComponent.svelte';

  let errorCaught = $state<{ error: Error; reset: () => void } | null>(null);

  function handleError(error: Error, reset: () => void) {
    console.log('🟢 [<svelte:boundary>] Caught rendering error:', error);
    errorCaught = {error, reset};
  }
</script>

<svelte:head>
  <title>Error Boundary - Rendering Test</title>
</svelte:head>

<div class="error-page">
  <h1>Error Boundary - Rendering Test</h1>

  <p class="error-description">
    This page demonstrates <code>&lt;svelte:boundary&gt;</code> catching a rendering error.
  </p>
  <p class="error-description">
    <strong>Expected:</strong> Error should be caught by the error boundary (🟢)
  </p>

  <div class="error-boundary-container">
    <svelte:boundary onerror={handleError}>
      <BrokenComponent/>
      {#snippet failed(error, reset)}
        <div class="error-boundary-message">
          <h3>Error Caught by Boundary!</h3>
          <p><strong>Message:</strong> {error.message}</p>
          <button onclick={reset} class="button-reset">
            Reset Boundary
          </button>
        </div>
      {/snippet}
    </svelte:boundary>
  </div>

  {#if errorCaught}
    <div class="error-success-message">
      <p><strong>✅ Success!</strong> The error was caught by the error boundary.</p>
      <p>Error: {errorCaught.error.message}</p>
    </div>
  {/if}

  <p>Check the console to see the boundary catch the error.</p>
</div>
