<script lang="ts">
  import {onMount} from 'svelte';

  onMount(() => {
    // This error should be caught by window.onerror (NOT handleError)
    throw new Error('Error in onMount lifecycle hook');
  });
</script>

<svelte:head>
  <title>onMount Error Test</title>
</svelte:head>

<div class="error-page">
  <h1>onMount Error Test</h1>

  <p class="error-description">
    This component throws an error in onMount().
  </p>
  <p class="error-description">
    <strong>Expected:</strong> Error should be caught by <code>window.onerror</code> (🟡), NOT by
    <code>handleError</code>
  </p>

  <p>Check the console to see where it was caught.</p>
</div>
