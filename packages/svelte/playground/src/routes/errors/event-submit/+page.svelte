<script lang="ts">
  function handleSubmit(event: Event) {
    event.preventDefault();
    // This error should be caught by window.onerror (NOT handleError)
    throw new Error('Error in submit event handler');
  }
</script>

<svelte:head>
  <title>Submit Handler Error Test</title>
</svelte:head>

<div class="error-page">
  <h1>Submit Handler Error Test</h1>

  <p class="error-description">
    This page demonstrates an error thrown in a form submit handler.
  </p>
  <p class="error-description">
    <strong>Expected:</strong> Error should be caught by <code>window.onerror</code> (🟡), NOT by
    <code>handleError</code>
  </p>

  <div class="error-trigger">
    <form onsubmit={handleSubmit}>
      <input
        type="text"
        placeholder="Enter something..."
        class="form-input"
      />
      <button type="submit" class="button-primary">
        Submit to Throw Error
      </button>
    </form>
  </div>

  <p>Check the console to see where the error was caught.</p>
</div>
