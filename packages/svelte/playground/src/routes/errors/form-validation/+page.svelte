<script lang="ts">
  import type {ActionData} from './$types';

  let {form}: { form: ActionData } = $props();
</script>

<svelte:head>
  <title>Form Validation Error Test</title>
</svelte:head>

<div class="error-page">
  <h1>Form Validation Error Test</h1>

  <p class="error-description">
    This page demonstrates using <code>fail()</code> for validation errors.
  </p>
  <p class="error-description">
    <strong>Expected:</strong> Validation errors are returned to the page, NOT sent to <code>handleError</code>
  </p>

  <form method="POST">
    <div class="form-group">
      <label for="email">Email Address:</label>
      <input
        type="text"
        id="email"
        name="email"
        value={form?.email ?? ''}
        placeholder="Enter your email"
        class="form-input {form?.error ? 'form-input-error' : ''}"
      />
    </div>

    {#if form?.error}
      <div class="form-error">
        <strong>Validation Error:</strong> {form.error}
      </div>
    {/if}

    {#if form?.success}
      <div class="form-success">
        <strong>Success:</strong> {form.message}
      </div>
    {/if}

    <button type="submit" class="button-submit">
      Submit Form
    </button>
  </form>

  <div class="error-note mt-2">
    <p><strong>Try:</strong></p>
    <ul>
      <li>Submit with empty email → validation error</li>
      <li>Submit with invalid email → validation error</li>
      <li>Submit with valid email → success</li>
    </ul>
  </div>
</div>
