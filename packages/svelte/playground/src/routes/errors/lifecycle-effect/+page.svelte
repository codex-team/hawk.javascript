<script lang="ts">
  let count = $state(0);

  // This effect will throw an error
  $effect(() => {
    if (count > 0) {
      throw new Error('Error in $effect rune');
    }
  });
</script>

<svelte:head>
  <title>$effect Error Test</title>
</svelte:head>

<div class="error-page">
  <h1>$effect Error Test</h1>

  <p class="error-description">
    This component will throw an error in $effect when you click the button.
  </p>
  <p class="error-description">
    <strong>Expected:</strong> Error can be caught by <code>&lt;svelte:boundary&gt;</code> or
    <code>window.onerror</code>
  </p>

  <div class="error-trigger">
    <button onclick={() => count++}>
      Trigger Effect Error (count: {count})
    </button>
  </div>

  <p>Click the button to increment the count and trigger the error.</p>
</div>
