import Hawk from '@hawk.so/sveltekit';

if (import.meta.env.VITE_HAWK_TOKEN) {
  new Hawk({
    token: import.meta.env.VITE_HAWK_TOKEN,
  });
}
