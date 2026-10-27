import { error } from '@sveltejs/kit';
import { getFeatured, getHomeFeed, getMostRead } from '#lib/server/content.ts';
import { pageFromUrl } from '#lib/server/paging.ts';
import { votedPolls } from '#lib/server/polls.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url, cookies }) => {
	const page = pageFromUrl(url);
	const featured = await getFeatured();
	const [feed, mostRead] = await Promise.all([
		// The featured article sits on top of page 1, so the feed never repeats it
		getHomeFeed({ page, excludeId: featured?.id, voted: votedPolls(cookies) }),
		getMostRead()
	]);
	if (!feed) error(404);
	return { featured: page === 1 ? featured : null, feed, mostRead };
};
