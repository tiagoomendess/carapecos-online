import { error, json } from '@sveltejs/kit';
import { requireUser } from '#lib/server/admin.ts';
import { deleteMedia, updateMediaAlt } from '#lib/server/media.ts';
import type { RequestHandler } from './$types';

/** Updates the alt text: `{ "alt": "…" }` */
export const PATCH: RequestHandler = async ({ locals, params, request }) => {
	requireUser(locals);
	const { alt } = (await request.json()) as { alt?: unknown };
	if (typeof alt !== 'string') error(400);
	await updateMediaAlt(params.id, alt.trim().slice(0, 300));
	return new Response(null, { status: 204 });
};

export const DELETE: RequestHandler = async ({ locals, params }) => {
	requireUser(locals);
	if (!(await deleteMedia(params.id))) {
		error(409, 'Esta imagem está a ser usada num artigo ou página.');
	}
	return json({ ok: true });
};
