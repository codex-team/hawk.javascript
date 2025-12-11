<svelte:head>
  <title>Form Unexpected Error Test</title>
</svelte:head>

<div class="error-page">
  <h1>Form Action Unexpected Error Test</h1>

  <p class="error-description">
    This page demonstrates an unexpected error in a form action.
  </p>
  <p class="error-description">
    <strong>Expected:</strong> Error should be caught by server-side <code>handleError</code> (🔴)
  </p>

  <form method="POST" class="error-trigger">
    <button type="submit" class="button-primary">
      Submit to Trigger Error
    </button>
  </form>

  <p>When you submit this form, the action will throw an unexpected error.</p>
  <p>Check the console to see it caught by server-side handleError.</p>
</div>
