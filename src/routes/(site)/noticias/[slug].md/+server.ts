import { ORIGIN } from '$app/env/private';
import { MEDIA_BASE_URL } from '$app/env/public';
import { error, redirect } from '@sveltejs/kit';
import { formatDateTime } from '#lib/format.ts';
import { resolveMediaUrls } from '#lib/media.ts';
import { getArticle } from '#lib/server/content.ts';
import { feedHeaders } from '#lib/server/feeds.ts';
import { htmlToMarkdown } from '#lib/server/markdown.ts';
import { shareImage } from '#lib/seo.ts';
import type { RequestHandler } from './$types';

/** The article as Markdown, for LLMs and other tools (`/noticias/{slug}.md`) */
export const GET: RequestHandler = async ({ params }) => {
	const result = await getArticle(params.slug);
	if (!result.found) {
		if (result.redirectTo) redirect(301, `/noticias/${result.redirectTo}.md`);
		error(404);
	}
	const site = ORIGIN.replace(/\/$/, '');
	const { article } = result;
	const cover = article.cover ? `![${article.title}](${shareImage(article.cover).url})\n\n` : '';

	const body = `# ${article.title}

${article.category.name} · ${formatDateTime(article.publishedAt)} · ${site}/noticias/${article.slug}

${article.lead ? `**${article.lead}**\n\n` : ''}${cover}${htmlToMarkdown(resolveMediaUrls(article.body, MEDIA_BASE_URL), site)}
`;
	return new Response(body, { headers: feedHeaders('text/markdown; charset=utf-8') });
};
