import { fail, redirect } from '@sveltejs/kit';
import { requireUser } from '#lib/server/admin.ts';
import { readArticleForm, saveArticle } from '#lib/server/articles.ts';
import { getCategories } from '#lib/server/content.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({ categories: await getCategories() });

export const actions: Actions = {
	save: async ({ locals, request }) => {
		const user = requireUser(locals);
		const result = await saveArticle(null, readArticleForm(await request.formData()), user.id);
		if ('errors' in result) return fail(400, { errors: result.errors });
		redirect(303, `/admin/artigos/${result.id}?guardado`);
	}
};
