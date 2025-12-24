import HawkCatcher from '@hawk.so/javascript';

if (import.meta.env.VITE_HAWK_TOKEN) {
  new HawkCatcher({
    token: import.meta.env.VITE_HAWK_TOKEN
  });
}

window.addEventListener('error', (event) => {
  console.error('🔴 [window.error] Caught error:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error
  });
});

window.addEventListener('unhandledrejection', (event) => {
  console.error('🔴 [window.unhandledrejection] Caught error:', {
    reason: event.reason,
    promise: event.promise
  });
});
