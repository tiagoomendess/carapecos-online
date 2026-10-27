import { MEDIA_BASE_URL } from '$app/env/public';
import { error, fail, redirect } from '@sveltejs/kit';
import { resolveMediaUrls } from '#lib/media.ts';
import { embeddedPollSlugs } from '#lib/poll-embeds.ts';
import { addComment, getComments, readCommentForm, reportComment } from '#lib/server/comments.ts';
import { getArticle, getRelated } from '#lib/server/content.ts';
import { getPollsBySlugs, votedPolls } from '#lib/server/polls.ts';
import type { Actions, PageServerLoad } from './$types';

/** Stored HTML → what the page renders: absolute media URLs, lazy and titled embeds */
const prepareBody = (html: string) =>
	resolveMediaUrls(html, MEDIA_BASE_URL).replace(
		/<iframe (?![^>]*\btitle=)/g,
		'<iframe title="Vídeo" loading="lazy" '
	);

export const load: PageServerLoad = async ({ params, cookies }) => {
	const result = await getArticle(params.slug);
	if (!result.found) {
		if (result.redirectTo) redirect(301, `/noticias/${result.redirectTo}`);
		error(404);
	}
	const { article } = result;
	const [related, comments, polls] = await Promise.all([
		getRelated(article.id, article.categoryId),
		getComments({ articleId: article.id }),
		getPollsBySlugs(embeddedPollSlugs(article.body), votedPolls(cookies))
	]);
	return {
		article: { ...article, body: prepareBody(article.body) },
		related,
		comments,
		polls: Object.fromEntries(polls)
	};
};

async function publishedArticleId(slug: string) {
	const result = await getArticle(slug);
	if (!result.found) error(404);
	return result.article.id;
}

export const actions: Actions = {
	comentar: async (event) => {
		const articleId = await publishedArticleId(event.params.slug);
		const input = readCommentForm(await event.request.formData());
		const result = await addComment(event, { articleId }, input);
		if (!result.ok) {
			return fail(400, {
				comment: {
					error: result.error,
					name: input.name,
					body: input.body,
					parentId: input.parentId
				}
			});
		}
		return { comment: { published: result.id } };
	},

	reportar: async (event) => {
		await publishedArticleId(event.params.slug);
		const id = (await event.request.formData()).get('commentId')?.toString() ?? '';
		if (id) await reportComment(id);
		return { reported: id };
	}
};
