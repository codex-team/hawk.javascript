<script lang="ts">
  function triggerError() {
    throw new Error('Runtime error caught by window.onerror');
  }
</script>

<div class="container">
  <h1>Window Error Handler Test</h1>
  <p>Click the button to trigger a runtime error.</p>
  <p><strong>Caught by:</strong> <code>window.onerror</code> (🟡 yellow dot in console)</p>

  <button onclick={triggerError}>
    Trigger Runtime Error
  </button>
</div>
