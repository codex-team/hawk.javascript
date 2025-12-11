import { fail } from '@sveltejs/kit';
import type { Actions } from './$types';

export const actions = {
	default: async ({ request }) => {
		const data = await request.formData();
		const email = data.get('email');

		// Validation error - expected error using fail()
		if (!email || typeof email !== 'string' || !email.includes('@')) {
			return fail(400, {
				error: 'Please provide a valid email address',
				email: email?.toString() ?? ''
			});
		}

		return {
			success: true,
			message: 'Form submitted successfully!'
		};
	}
} satisfies Actions;
