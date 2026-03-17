import type { HandleServerError } from '@sveltejs/kit';

export const handleError: HandleServerError = async ({ error, event, status, message }) => {
  console.error('🔴 [server.handleError]', error, `at ${event.url.pathname}`);

  return {
    message,
    status,
  };
};
