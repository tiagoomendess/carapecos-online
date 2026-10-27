import { env } from 'cloudflare:workers';
import { fail, redirect } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import { hasUsers } from '#lib/server/users.ts';
import { m } from '#lib/paraglide/messages.js';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) redirect(303, '/admin');
	if (!(await hasUsers(env.DB))) redirect(303, '/admin/setup');
};

export const actions: Actions = {
	default: async ({ locals, request }) => {
		const form = await request.formData();
		const email = form.get('email')?.toString().trim() ?? '';
		const password = form.get('password')?.toString() ?? '';

		try {
			await locals.auth.api.signInEmail({ body: { email, password }, headers: request.headers });
		} catch (error) {
			if (error instanceof APIError) return fail(400, { email, message: m.admin_login_failed() });
			throw error;
		}

		redirect(303, '/admin');
	}
};
