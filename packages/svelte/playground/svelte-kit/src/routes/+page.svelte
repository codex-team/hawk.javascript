<script lang="ts">
	import HawkCatcher from '@hawk.so/javascript';

	// Test that we can import from local @hawk.so/javascript
	console.log('✅ HawkCatcher imported successfully');
	console.log('HawkCatcher type:', typeof HawkCatcher);
</script>

<svelte:head>
	<title>Hawk Javascript SvelteKit Integration Playground</title>
</svelte:head>

<div class="container">
	<header>
		<h1>🦅 Hawk Javascript SvelteKit Integration Playground</h1>
		<a href="https://github.com/codex-team/hawk.javascript">
			https://github.com/codex-team/hawk.javascript
		</a>
	</header>

	<section>
		<h2>Welcome</h2>
		<p>
			This playground demonstrates various error handling scenarios in SvelteKit
			to help design and test the Hawk.so integration.
		</p>
	</section>

	<section>
		<h2>🧪 Error Test Suite</h2>
		<p>
			We've created a comprehensive test suite to demonstrate all error handling
			mechanisms in SvelteKit.
		</p>
		<a href="/errors">
			<button>View Error Test Scenarios →</button>
		</a>
	</section>

	<section>
		<h2>📚 What You'll Find</h2>
		<ul style="line-height: 1.8;">
			<li><strong>Load Function Errors</strong> - Expected and unexpected errors in load functions</li>
			<li><strong>Component Lifecycle Errors</strong> - Errors in onMount, effects, etc.</li>
			<li><strong>Event Handler Errors</strong> - Errors in click, submit handlers</li>
			<li><strong>Async Errors</strong> - setTimeout and promise rejection errors</li>
			<li><strong>Form Action Errors</strong> - Validation and unexpected form errors</li>
			<li><strong>Error Boundaries</strong> - Testing <code>&lt;svelte:boundary&gt;</code></li>
			<li><strong>Store Errors</strong> - Store subscription error scenarios</li>
		</ul>
	</section>

	<section>
		<h2>🔍 Testing Setup</h2>
		<p>The playground includes:</p>
		<ul style="line-height: 1.8;">
			<li>✅ Server-side <code>handleError</code> hook (hooks.server.ts)</li>
			<li>✅ Client-side <code>handleError</code> hook (hooks.client.ts)</li>
			<li>✅ Global error handlers (<code>window.onerror</code>, <code>unhandledrejection</code>)</li>
			<li>✅ Error boundaries where applicable</li>
		</ul>
		<div class="alert alert-warning mt-2">
			<strong>Tip:</strong> Open your browser's DevTools Console before testing.
		</div>
	</section>
</div>
