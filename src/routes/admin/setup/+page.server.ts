import { env } from 'cloudflare:workers';
import { fail, redirect } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import { hasUsers } from '#lib/server/users.ts';
import { m } from '#lib/paraglide/messages.js';
import type { Actions, PageServerLoad } from './$types';

// First-run only: creates the initial admin. Disabled as soon as any user exists.
export const load: PageServerLoad = async () => {
	if (await hasUsers(env.DB)) redirect(303, '/admin/login');
};

export const actions: Actions = {
	default: async ({ locals, request }) => {
		if (await hasUsers(env.DB)) redirect(303, '/admin/login');

		const form = await request.formData();
		const name = form.get('name')?.toString().trim() ?? '';
		const email = form.get('email')?.toString().trim() ?? '';
		const password = form.get('password')?.toString() ?? '';

		try {
			// Server-side call without headers, so it doesn't need an existing admin session
			await locals.auth.api.createUser({ body: { name, email, password, role: 'admin' } });
			await locals.auth.api.signInEmail({ body: { email, password }, headers: request.headers });
		} catch (error) {
			if (error instanceof APIError) {
				return fail(400, { name, email, message: m.admin_setup_failed({ reason: error.message }) });
			}
			throw error;
		}

		redirect(303, '/admin');
	}
};
