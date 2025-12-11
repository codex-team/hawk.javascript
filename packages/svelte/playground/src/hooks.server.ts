import type {HandleServerError} from '@sveltejs/kit';

export const handleError: HandleServerError = async ({error, event, status, message}) => {
  console.error('🔴 [Server handleError] Caught error:', {
    error,
    status,
    message,
    route: event.route.id,
    url: event.url.pathname
  });

  return {
    message: message || 'An unexpected server error occurred',
    code: (error as any)?.code ?? 'UNKNOWN_ERROR',
    route: event.route.id
  };
};
