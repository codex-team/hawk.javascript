<script lang="ts">
	import { onMount } from 'svelte';

	function triggerTimeoutError() {
		setTimeout(() => {
			// This error should be caught by window.onerror
			throw new Error('Error in setTimeout');
		}, 100);
	}

	onMount(() => {
		// Automatically trigger after mount
		triggerTimeoutError();
	});
</script>

<svelte:head>
	<title>setTimeout Error Test</title>
</svelte:head>

<div class="error-page">
	<h1>setTimeout Error Test</h1>

	<p class="error-description">
		This page demonstrates an error thrown inside setTimeout.
	</p>
	<p class="error-description">
		<strong>Expected:</strong> Error should be caught by <code>window.onerror</code> (🟡)
	</p>
	<p class="error-description">
		<strong>Gap:</strong> NOT caught by <code>handleError</code> or <code>&lt;svelte:boundary&gt;</code>
	</p>

	<div class="error-note">
		<p><strong>Note:</strong> The error was triggered automatically on mount.</p>
		<button onclick={triggerTimeoutError}>
			Trigger Again
		</button>
	</div>

	<p>Check the console to see where the error was caught.</p>
</div>
