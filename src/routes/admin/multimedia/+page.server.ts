import { listMedia } from '#lib/server/media.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const query = url.searchParams.get('q')?.trim() ?? '';
	const page = Math.max(1, Number(url.searchParams.get('pagina')) || 1);
	return { media: await listMedia(page, query), query };
};
