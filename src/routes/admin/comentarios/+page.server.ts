import { field, requireUser } from '#lib/server/admin.ts';
import {
	type CommentFilter,
	deleteComment,
	dismissReports,
	listCommentsForModeration,
	setCommentStatus
} from '#lib/server/comments.ts';
import type { Actions, PageServerLoad } from './$types';

const filters: CommentFilter[] = ['reported', 'hidden'];

export const load: PageServerLoad = async ({ url }) => {
	const param = url.searchParams.get('filtro') as CommentFilter;
	const filter = filters.includes(param) ? param : '';
	const page = Math.max(1, Number(url.searchParams.get('pagina')) || 1);
	return { comments: await listCommentsForModeration(filter, page), filter };
};

export const actions: Actions = {
	hide: async ({ locals, request }) => {
		requireUser(locals);
		await setCommentStatus(field(await request.formData(), 'id'), 'hidden');
	},
	show: async ({ locals, request }) => {
		requireUser(locals);
		await setCommentStatus(field(await request.formData(), 'id'), 'visible');
	},
	dismiss: async ({ locals, request }) => {
		requireUser(locals);
		await dismissReports(field(await request.formData(), 'id'));
	},
	delete: async ({ locals, request }) => {
		requireUser(locals);
		await deleteComment(field(await request.formData(), 'id'));
	}
};
