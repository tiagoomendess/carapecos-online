import { ORIGIN } from '$app/env/private';
import { feedHeaders, sitemapEntries, xml } from '#lib/server/feeds.ts';
import type { RequestHandler } from './$types';

/** Every public URL. Well under the 50,000-URL limit of a single sitemap. */
export const GET: RequestHandler = async () => {
	const site = ORIGIN.replace(/\/$/, '');
	const { articles, categories, pages, polls } = await sitemapEntries();
	const day = (date: Date | null) => (date ? date.toISOString().slice(0, 10) : undefined);

	const urls: { loc: string; lastmod?: string }[] = [
		{ loc: `${site}/`, lastmod: day(articles[0]?.publishedAt ?? null) },
		...categories.map((c) => ({ loc: `${site}/categoria/${c.slug}`, lastmod: day(c.updatedAt) })),
		...articles.map((a) => ({
			loc: `${site}/noticias/${a.slug}`,
			lastmod: day(a.updatedAt > (a.publishedAt ?? a.updatedAt) ? a.updatedAt : a.publishedAt)
		})),
		...polls.map((p) => ({ loc: `${site}/sondagens/${p.slug}`, lastmod: day(p.updatedAt) })),
		...pages.map((p) => ({ loc: `${site}/${p.slug}`, lastmod: day(p.updatedAt) }))
	];

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
	.map(
		(u) =>
			`<url><loc>${xml(u.loc)}</loc>${u.lastmod ? `<lastmod>${u.lastmod}</lastmod>` : ''}</url>`
	)
	.join('\n')}
</urlset>`;
	return new Response(body, { headers: feedHeaders('application/xml; charset=utf-8') });
};
