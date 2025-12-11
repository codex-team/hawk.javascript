<script lang="ts">
  import {errorStore} from '../../../lib/stores/errorStore';

  function triggerStoreError() {
    // This will trigger the error in the store subscription
    errorStore.set(1);
  }
</script>

<svelte:head>
  <title>Store Subscription Error Test</title>
</svelte:head>

<div class="error-page">
  <h1>Store Subscription Error Test</h1>

  <p class="error-description">
    This page demonstrates an error thrown in a store subscription callback.
  </p>
  <p class="error-description">
    <strong>Expected:</strong> Error behavior depends on Svelte version
  </p>
  <p class="error-description">
    <strong>Gap:</strong> In Svelte 5, these errors may not be caught consistently
  </p>

  <div class="error-note">
    <p><strong>Note:</strong> Store subscription errors are a known gap in error handling:</p>
    <ul>
      <li>NOT caught by <code>handleError</code></li>
      <li>NOT caught by <code>&lt;svelte:boundary&gt;</code></li>
      <li>May or may not be caught by <code>window.onerror</code> depending on implementation</li>
    </ul>
  </div>

  <div class="error-trigger">
    <button onclick={triggerStoreError} class="button-primary">
      Trigger Store Error
    </button>
  </div>

  <p>Click the button to update the store and trigger the error in the subscription.</p>
  <p>Check the console to see if/where the error was caught.</p>
</div>
