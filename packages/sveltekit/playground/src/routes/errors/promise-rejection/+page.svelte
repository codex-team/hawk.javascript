<script lang="ts">
  function triggerRejection() {
    Promise.reject(new Error('Unhandled promise rejection'));
  }
</script>

<div class="container">
  <h1>Unhandled Promise Rejection Test</h1>
  <p>Click the button to trigger an unhandled promise rejection.</p>
  <p><strong>Caught by:</strong> <code>window.unhandledrejection</code> (🟡 yellow dot in console)</p>

  <button onclick={triggerRejection}>
    Trigger Promise Rejection
  </button>
</div>
