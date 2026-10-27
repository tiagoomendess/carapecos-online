import { error, fail } from '@sveltejs/kit';
import { addComment, getComments, readCommentForm, reportComment } from '#lib/server/comments.ts';
import { castVote, getPollBySlug, votedPolls } from '#lib/server/polls.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, cookies }) => {
	const poll = await getPollBySlug(params.slug, votedPolls(cookies));
	if (!poll) error(404);
	return { poll, comments: await getComments({ pollId: poll.id }) };
};

async function publishedPollId(slug: string) {
	const poll = await getPollBySlug(slug, new Set());
	if (!poll) error(404);
	return poll.id;
}

export const actions: Actions = {
	// Polls embedded elsewhere (homepage, articles) post here too
	votar: async (event) => {
		const result = await castVote(event, event.params.slug, await event.request.formData());
		if (!result.ok) return fail(400, { poll: event.params.slug, error: result.error });
		return { poll: event.params.slug, voted: true };
	},

	comentar: async (event) => {
		const pollId = await publishedPollId(event.params.slug);
		const input = readCommentForm(await event.request.formData());
		const result = await addComment(event, { pollId }, input);
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
		await publishedPollId(event.params.slug);
		const id = (await event.request.formData()).get('commentId')?.toString() ?? '';
		if (id) await reportComment(id);
		return { reported: id };
	}
};
