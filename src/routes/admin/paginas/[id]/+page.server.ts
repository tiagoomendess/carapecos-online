import { error, fail, redirect } from '@sveltejs/kit';
import { requireUser } from '#lib/server/admin.ts';
import { deletePage, getPageForEdit, readPageForm, savePage } from '#lib/server/pages.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	const page = await getPageForEdit(params.id);
	if (!page) error(404);
	return { page, justCreated: url.searchParams.has('guardado') };
};

export const actions: Actions = {
	save: async ({ locals, params, request }) => {
		requireUser(locals);
		const result = await savePage(params.id, readPageForm(await request.formData()));
		if ('errors' in result) return fail(400, { errors: result.errors });
		return { saved: true };
	},

	delete: async ({ locals, params }) => {
		requireUser(locals);
		await deletePage(params.id);
		redirect(303, '/admin/paginas');
	}
};
