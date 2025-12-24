import type { PageLoad } from './$types';

export const load: PageLoad = async () => {
  throw new Error('Unexpected error thrown in load function');
};
