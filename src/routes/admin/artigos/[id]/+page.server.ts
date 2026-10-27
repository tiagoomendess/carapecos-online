import { error, fail, redirect } from '@sveltejs/kit';
import { requireUser } from '#lib/server/admin.ts';
import {
	deleteArticle,
	getArticleForEdit,
	readArticleForm,
	saveArticle
} from '#lib/server/articles.ts';
import { getCategories } from '#lib/server/content.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	const [article, categories] = await Promise.all([getArticleForEdit(params.id), getCategories()]);
	if (!article) error(404);
	return { article, categories, justCreated: url.searchParams.has('guardado') };
};

export const actions: Actions = {
	save: async ({ locals, params, request }) => {
		const user = requireUser(locals);
		const result = await saveArticle(params.id, readArticleForm(await request.formData()), user.id);
		if ('errors' in result) return fail(400, { errors: result.errors });
		return { saved: true };
	},

	delete: async ({ locals, params }) => {
		requireUser(locals);
		await deleteArticle(params.id);
		redirect(303, '/admin/artigos');
	}
};
