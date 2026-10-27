import { fail } from '@sveltejs/kit';
import { APIError } from 'better-auth/api';
import { m } from '#lib/paraglide/messages.js';
import { field, requireAdmin } from '#lib/server/admin.ts';
import type { Role } from '#lib/server/auth.ts';
import type { Actions, PageServerLoad } from './$types';

const roles: Role[] = ['admin', 'editor'];
const readRole = (form: FormData): Role => {
	const role = field(form, 'role') as Role;
	return roles.includes(role) ? role : 'editor';
};

export const load: PageServerLoad = async ({ locals, request }) => {
	const me = requireAdmin(locals);
	const { users } = await locals.auth.api.listUsers({
		query: { limit: 200, sortBy: 'name', sortDirection: 'asc' },
		headers: request.headers
	});
	return {
		me: me.id,
		users: users.map((u) => ({
			id: u.id,
			name: u.name,
			email: u.email,
			role: (u.role ?? 'editor') as Role
		}))
	};
};

/** Runs a better-auth admin call, turning its errors into a form message */
async function attempt(run: () => Promise<unknown>, message: string) {
	try {
		await run();
		return { message };
	} catch (error) {
		if (error instanceof APIError) {
			return fail(400, { error: m.admin_user_failed({ reason: error.message }) });
		}
		throw error;
	}
}

export const actions: Actions = {
	create: async ({ locals, request }) => {
		requireAdmin(locals);
		const form = await request.formData();
		const password = form.get('password')?.toString() ?? '';
		if (password.length < 8) return fail(400, { error: m.admin_password_hint() });
		return attempt(
			() =>
				locals.auth.api.createUser({
					body: {
						name: field(form, 'name'),
						email: field(form, 'email'),
						password,
						role: readRole(form)
					},
					headers: request.headers
				}),
			m.admin_user_created()
		);
	},

	role: async ({ locals, request }) => {
		const me = requireAdmin(locals);
		const form = await request.formData();
		const userId = field(form, 'userId');
		if (userId === me.id) return fail(400, { error: m.admin_user_not_self() });
		return attempt(
			() =>
				locals.auth.api.setRole({
					body: { userId, role: readRole(form) },
					headers: request.headers
				}),
			m.admin_saved()
		);
	},

	password: async ({ locals, request }) => {
		requireAdmin(locals);
		const form = await request.formData();
		const newPassword = form.get('password')?.toString() ?? '';
		if (newPassword.length < 8) return fail(400, { error: m.admin_password_hint() });
		return attempt(
			() =>
				locals.auth.api.setUserPassword({
					body: { userId: field(form, 'userId'), newPassword },
					headers: request.headers
				}),
			m.admin_user_password_changed()
		);
	},

	delete: async ({ locals, request }) => {
		const me = requireAdmin(locals);
		const userId = field(await request.formData(), 'userId');
		if (userId === me.id) return fail(400, { error: m.admin_user_not_self() });
		return attempt(
			() => locals.auth.api.removeUser({ body: { userId }, headers: request.headers }),
			m.admin_saved()
		);
	}
};
