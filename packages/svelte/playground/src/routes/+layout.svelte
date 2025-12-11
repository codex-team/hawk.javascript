<script lang="ts">
  import {onMount} from 'svelte';
  import {browser} from '$app/environment';
  import favicon from '../lib/assets/favicon.svg';
  import '../app.css';

  let {children} = $props();

  onMount(() => {
    if (browser) {
      window.addEventListener('error', (event) => {
        console.error('🟡 [window.onerror] Caught error:', {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          error: event.error
        });
      });

      window.addEventListener('unhandledrejection', (event) => {
        console.error('🟡 [unhandledrejection] Caught rejection:', {
          reason: event.reason,
          promise: event.promise
        });
      });

      console.log('✅ Global error handlers initialized');
    }
  });
</script>

<svelte:head>
  <link rel="icon" href={favicon}/>
</svelte:head>

<nav>
  <a href="/packages/svelte/playground/static">Home</a>
  <a href="/errors">Error Tests</a>
</nav>

{@render children()}
