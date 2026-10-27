import { ORIGIN } from '$app/env/private';
import { m } from '#lib/paraglide/messages.js';
import { getLatest } from '#lib/server/content.ts';
import { feedHeaders, xml } from '#lib/server/feeds.ts';
import { shareImage } from '#lib/seo.ts';
import type { RequestHandler } from './$types';

/** RSS 2.0 feed of the 30 newest articles */
export const GET: RequestHandler = async () => {
	const site = ORIGIN.replace(/\/$/, '');
	const articles = await getLatest(30);

	const items = articles.map((a) => {
		const url = `${site}/noticias/${a.slug}`;
		const image = a.cover ? shareImage(a.cover) : null;
		return `<item>
<title>${xml(a.title)}</title>
<link>${xml(url)}</link>
<guid isPermaLink="true">${xml(url)}</guid>
<pubDate>${a.publishedAt.toUTCString()}</pubDate>
<category>${xml(a.category.name)}</category>
<description>${xml(a.summary)}</description>${
			image ? `\n<enclosure url="${xml(image.url)}" type="image/webp" length="0"/>` : ''
		}
</item>`;
	});

	const body = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
<title>${xml(m.site_name())}</title>
<link>${site}/</link>
<description>${xml(m.site_description())}</description>
<language>pt-PT</language>
<atom:link href="${site}/rss.xml" rel="self" type="application/rss+xml"/>
<image><url>${site}/icon-192.png</url><title>${xml(m.site_name())}</title><link>${site}/</link></image>
${articles[0] ? `<lastBuildDate>${articles[0].publishedAt.toUTCString()}</lastBuildDate>` : ''}
${items.join('\n')}
</channel>
</rss>`;
	return new Response(body, { headers: feedHeaders('application/rss+xml; charset=utf-8') });
};
