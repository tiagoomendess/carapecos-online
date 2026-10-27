import { ORIGIN } from '$app/env/private';
import { m } from '#lib/paraglide/messages.js';
import { feedHeaders, recentNews, xml } from '#lib/server/feeds.ts';
import type { RequestHandler } from './$types';

/** Google News sitemap: articles from the last two days */
export const GET: RequestHandler = async () => {
	const site = ORIGIN.replace(/\/$/, '');
	const articles = await recentNews();

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:news="http://www.google.com/schemas/sitemap-news/0.9">
${articles
	.map(
		(a) => `<url>
<loc>${xml(`${site}/noticias/${a.slug}`)}</loc>
<news:news>
<news:publication><news:name>${xml(m.site_name())}</news:name><news:language>pt</news:language></news:publication>
<news:publication_date>${a.publishedAt!.toISOString()}</news:publication_date>
<news:title>${xml(a.title)}</news:title>
</news:news>
</url>`
	)
	.join('\n')}
</urlset>`;
	return new Response(body, { headers: feedHeaders('application/xml; charset=utf-8') });
};
