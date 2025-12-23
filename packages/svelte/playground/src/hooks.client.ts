import HawkCatcher from '@hawk.so/javascript';

if (import.meta.env.VITE_HAWK_TOKEN) {
  new HawkCatcher({
    token: import.meta.env.VITE_HAWK_TOKEN
  });
}
