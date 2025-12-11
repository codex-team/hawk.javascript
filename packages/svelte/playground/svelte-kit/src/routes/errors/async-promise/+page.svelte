<script lang="ts">
	import { onMount } from 'svelte';

	function triggerPromiseRejection() {
		// Create an unhandled promise rejection
		Promise.reject(new Error('Unhandled promise rejection'));
	}

	onMount(() => {
		// Automatically trigger after mount
		triggerPromiseRejection();
	});
</script>

<svelte:head>
	<title>Promise Rejection Test</title>
</svelte:head>

<div class="error-page">
	<h1>Unhandled Promise Rejection Test</h1>

	<p class="error-description">
		This page demonstrates an unhandled promise rejection.
	</p>
	<p class="error-description">
		<strong>Expected:</strong> Error should be caught by <code>window.onunhandledrejection</code> (🟡)
	</p>
	<p class="error-description">
		<strong>Gap:</strong> NOT caught by <code>handleError</code> or <code>&lt;svelte:boundary&gt;</code>
	</p>

	<div class="error-note">
		<p><strong>Note:</strong> The rejection was triggered automatically on mount.</p>
		<button onclick={triggerPromiseRejection}>
			Trigger Again
		</button>
	</div>

	<p>Check the console to see where the rejection was caught.</p>
</div>
