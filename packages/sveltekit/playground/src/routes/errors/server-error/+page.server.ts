import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
  const shouldError = url.searchParams.get('error') === 'true';

  if (shouldError) {
    throw new Error('Server-side error in load function');
  }

  return {
    message: 'Server data loaded successfully',
  };
};
