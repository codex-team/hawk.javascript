<script lang="ts">
	interface ErrorTest {
		title: string;
		description: string;
		href: string;
		category: string;
	}

	const errorTests: ErrorTest[] = [
		// Load Function Errors
		{
			title: 'Load Function - Expected Error',
			description: 'Tests error() helper in +page.ts (should be caught by handleError)',
			href: '/errors/load-expected',
			category: 'Load Functions'
		},
		{
			title: 'Load Function - Unexpected Error',
			description: 'Tests thrown error in +page.ts (should be caught by handleError)',
			href: '/errors/load-unexpected',
			category: 'Load Functions'
		},
		{
			title: 'Server Load - Error',
			description: 'Tests error in +page.server.ts (should be caught by server handleError)',
			href: '/errors/load-server',
			category: 'Load Functions'
		},

		// Component Lifecycle Errors
		{
			title: 'onMount Error',
			description: 'Tests error in onMount (should be caught by window.onerror)',
			href: '/errors/lifecycle-onmount',
			category: 'Component Lifecycle'
		},
		{
			title: 'Effect Error',
			description: 'Tests error in $effect rune (can be caught by error boundary)',
			href: '/errors/lifecycle-effect',
			category: 'Component Lifecycle'
		},

		// Event Handler Errors
		{
			title: 'Click Handler Error',
			description: 'Tests error in on:click handler (should be caught by window.onerror)',
			href: '/errors/event-click',
			category: 'Event Handlers'
		},
		{
			title: 'Submit Handler Error',
			description: 'Tests error in on:submit handler (should be caught by window.onerror)',
			href: '/errors/event-submit',
			category: 'Event Handlers'
		},

		// Async Errors
		{
			title: 'setTimeout Error',
			description: 'Tests error in setTimeout (should be caught by window.onerror)',
			href: '/errors/async-timeout',
			category: 'Async Errors'
		},
		{
			title: 'Unhandled Promise Rejection',
			description: 'Tests unhandled promise rejection (should be caught by unhandledrejection)',
			href: '/errors/async-promise',
			category: 'Async Errors'
		},

		// Form Actions
		{
			title: 'Form Action - Validation',
			description: 'Tests fail() in form action (expected error)',
			href: '/errors/form-validation',
			category: 'Form Actions'
		},
		{
			title: 'Form Action - Unexpected',
			description: 'Tests thrown error in form action (should be caught by handleError)',
			href: '/errors/form-unexpected',
			category: 'Form Actions'
		},

		// Error Boundaries
		{
			title: 'Error Boundary - Rendering',
			description: 'Tests <svelte:boundary> catching rendering error',
			href: '/errors/boundary-render',
			category: 'Error Boundaries'
		},
		{
			title: 'Error Boundary - Effect',
			description: 'Tests <svelte:boundary> catching effect error',
			href: '/errors/boundary-effect',
			category: 'Error Boundaries'
		},

		// Store Errors
		{
			title: 'Store Subscription Error',
			description: 'Tests error in store subscription (gap scenario)',
			href: '/errors/store-subscription',
			category: 'Store Errors'
		}
	];

	const categories = Array.from(new Set(errorTests.map(t => t.category)));
</script>

<svelte:head>
	<title>Error Test Scenarios - Hawk.so SvelteKit Integration</title>
</svelte:head>

<div class="container">
	<header>
		<h1>🧪 SvelteKit Error Handling Test Suite</h1>
		<a href="/">← Back to Home</a>
	</header>

	<div class="alert alert-warning">
		<strong>⚠️ Testing Instructions:</strong>
		<ul>
			<li>Open your browser's DevTools Console to see error logs</li>
			<li>Look for colored emoji markers:
				<ul>
					<li>🔴 = Caught by <code>handleError</code> hook</li>
					<li>🟡 = Caught by global <code>window.onerror</code> or <code>unhandledrejection</code></li>
					<li>🟢 = Caught by <code>&lt;svelte:boundary&gt;</code></li>
				</ul>
			</li>
			<li>Each test demonstrates where errors are caught in the SvelteKit error handling hierarchy</li>
		</ul>
	</div>

	{#each categories as category}
		<section>
			<h2>{category}</h2>
			<div class="grid">
				{#each errorTests.filter(t => t.category === category) as test}
					<a href={test.href} class="test-card">
						<h3>{test.title}</h3>
						<p>{test.description}</p>
					</a>
				{/each}
			</div>
		</section>
	{/each}
</div>
