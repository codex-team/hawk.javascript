import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
	// This is an unexpected error - should be caught by handleError
	throw new Error('Unexpected error thrown in load function');
};
