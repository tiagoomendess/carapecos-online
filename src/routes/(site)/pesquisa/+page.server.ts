import { error } from '@sveltejs/kit';
import { search } from '#lib/server/content.ts';
import { votedPolls } from '#lib/server/polls.ts';
import { pageFromUrl } from '#lib/server/paging.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, cookies }) => {
	const query = (url.searchParams.get('q') ?? '').trim().slice(0, 100);
	if (!query) return { query, results: null };

	const page = pageFromUrl(url);
	const results = await search(query, page, votedPolls(cookies));
	if (page > results.pages) error(404);
	return { query, results };
};
