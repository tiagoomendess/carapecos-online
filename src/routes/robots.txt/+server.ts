import { ORIGIN } from '$app/env/private';
import type { RequestHandler } from './$types';

/** Crawl everything public; point crawlers at the sitemaps */
export const GET: RequestHandler = () => {
	const site = ORIGIN.replace(/\/$/, '');
	const body = `User-agent: *
Disallow: /admin
Disallow: /api/
Disallow: /pesquisa

Sitemap: ${site}/sitemap.xml
Sitemap: ${site}/sitemap-news.xml
`;
	return new Response(body, {
		headers: {
			'content-type': 'text/plain; charset=utf-8',
			'cache-control': 'public, max-age=3600'
		}
	});
};
