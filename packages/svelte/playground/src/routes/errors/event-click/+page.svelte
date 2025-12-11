<script lang="ts">
  function handleClick() {
    // This error should be caught by window.onerror (NOT handleError)
    throw new Error('Error in click event handler');
  }
</script>

<svelte:head>
  <title>Click Handler Error Test</title>
</svelte:head>

<div class="error-page">
  <h1>Click Handler Error Test</h1>

  <p class="error-description">
    This page demonstrates an error thrown in an event handler.
  </p>
  <p class="error-description">
    <strong>Expected:</strong> Error should be caught by <code>window.onerror</code> (🟡), NOT by
    <code>handleError</code>
  </p>

  <div class="error-trigger">
    <button onclick={handleClick} class="button-primary">
      Click to Throw Error
    </button>
  </div>

  <p>Check the console to see where the error was caught.</p>
</div>
