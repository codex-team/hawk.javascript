import type { Actions } from './$types';

export const actions = {
	default: async () => {
		// Simulate an unexpected error (e.g., database failure)
		// This should be caught by server-side handleError
		throw new Error('Unexpected error in form action - database connection failed');
	}
} satisfies Actions;
