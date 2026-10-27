import type { LayoutServerLoad } from './$types';

// Access control lives in hooks.server.ts; this only exposes the logged-in user
export const load: LayoutServerLoad = ({ locals }) => ({
	user: locals.user
		? { name: locals.user.name, email: locals.user.email, role: locals.user.role }
		: null
});
