import { field, requireAdmin } from '#lib/server/admin.ts';
import { deleteContactMessage, listContactMessages, setMessageRead } from '#lib/server/contact.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireAdmin(locals);
	return { messages: await listContactMessages() };
};

export const actions: Actions = {
	read: async ({ locals, request }) => {
		requireAdmin(locals);
		const form = await request.formData();
		await setMessageRead(field(form, 'id'), field(form, 'read') === '1');
	},
	delete: async ({ locals, request }) => {
		requireAdmin(locals);
		await deleteContactMessage(field(await request.formData(), 'id'));
	}
};
