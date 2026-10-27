import { fail, redirect } from '@sveltejs/kit';
import { requireUser } from '#lib/server/admin.ts';
import { readPollForm, savePoll } from '#lib/server/polls.ts';
import type { Actions } from './$types';

export const actions: Actions = {
	save: async ({ locals, request }) => {
		const user = requireUser(locals);
		const result = await savePoll(null, readPollForm(await request.formData()), user.id);
		if ('errors' in result) return fail(400, { errors: result.errors });
		redirect(303, `/admin/sondagens/${result.id}?guardado`);
	}
};
