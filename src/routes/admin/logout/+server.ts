import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, request }) => {
	await locals.auth.api.signOut({ headers: request.headers });
	redirect(303, '/admin/login');
};
