import { error, fail, redirect } from '@sveltejs/kit';
import { requireUser } from '#lib/server/admin.ts';
import { deletePoll, getPollForEdit, readPollForm, savePoll } from '#lib/server/polls.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, url }) => {
	const poll = await getPollForEdit(params.id);
	if (!poll) error(404);
	return { poll, justCreated: url.searchParams.has('guardado') };
};

export const actions: Actions = {
	save: async ({ locals, params, request }) => {
		const user = requireUser(locals);
		const result = await savePoll(params.id, readPollForm(await request.formData()), user.id);
		if ('errors' in result) return fail(400, { errors: result.errors });
		return { saved: true };
	},

	delete: async ({ locals, params }) => {
		requireUser(locals);
		await deletePoll(params.id);
		redirect(303, '/admin/sondagens');
	}
};
