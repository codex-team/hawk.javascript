import {error} from '@sveltejs/kit';
import type {PageLoad} from './$types';

export const load: PageLoad = async () => {
  // This is an expected error - should be caught by handleError
  error(404, {
    message: 'This is an expected error from load function',
    code: 'TEST_EXPECTED_ERROR'
  });
};
