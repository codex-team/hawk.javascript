import Hawk from '@hawk.so/sveltekit';

if (import.meta.env.VITE_HAWK_TOKEN) {
  new Hawk({
    token: import.meta.env.VITE_HAWK_TOKEN,
  });
}

window.addEventListener('error', (event) => {
  console.error('🟡 [window.error]', event.error, `at ${event.filename}:${event.lineno}`);
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('🟡 [window.unhandledrejection]', event.reason);
});
