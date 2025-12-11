import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	// This error should be caught by server-side handleError
	throw new Error('Server-side load function error');
};
