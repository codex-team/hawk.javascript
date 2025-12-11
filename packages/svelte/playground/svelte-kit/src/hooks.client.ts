import type { HandleClientError } from '@sveltejs/kit';

export const handleError: HandleClientError = async ({ error, event, status, message }) => {
	console.error('🔴 [Client handleError] Caught error:', {
		error,
		status,
		message,
		route: event.route.id,
		url: event.url.pathname
	});

	return {
		message: message || 'An unexpected client error occurred',
		code: (error as any)?.code ?? 'UNKNOWN_ERROR',
		route: event.route.id
	};
};