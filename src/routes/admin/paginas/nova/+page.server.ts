import { fail, redirect } from '@sveltejs/kit';
import { requireUser } from '#lib/server/admin.ts';
import { readPageForm, savePage } from '#lib/server/pages.ts';
import type { Actions } from './$types';

export const actions: Actions = {
	save: async ({ locals, request }) => {
		requireUser(locals);
		const result = await savePage(null, readPageForm(await request.formData()));
		if ('errors' in result) return fail(400, { errors: result.errors });
		redirect(303, `/admin/paginas/${result.id}?guardado`);
	}
};
