import { getCategories } from '#lib/server/content.ts';
import { listArticles, type StatusFilter } from '#lib/server/articles.ts';
import type { PageServerLoad } from './$types';

const statuses: StatusFilter[] = ['draft', 'scheduled', 'published'];

export const load: PageServerLoad = async ({ url }) => {
	const query = url.searchParams.get('q')?.trim() ?? '';
	const statusParam = url.searchParams.get('estado') as StatusFilter;
	const status = statuses.includes(statusParam) ? statusParam : '';
	const categoryId = url.searchParams.get('categoria') ?? '';
	const page = Math.max(1, Number(url.searchParams.get('pagina')) || 1);

	const [articles, categories] = await Promise.all([
		listArticles({ page, query, status, categoryId }),
		getCategories()
	]);
	return { articles, categories, filters: { query, status, categoryId } };
};
