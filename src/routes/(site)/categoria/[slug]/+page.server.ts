import { error } from '@sveltejs/kit';
import { getCategory, getFeed } from '#lib/server/content.ts';
import { pageFromUrl } from '#lib/server/paging.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	const page = pageFromUrl(url);
	const category = await getCategory(params.slug);
	if (!category) error(404);
	const feed = await getFeed({ page, categoryId: category.id });
	if (!feed) error(404);
	return {
		category: { name: category.name, slug: category.slug, description: category.description },
		feed
	};
};
