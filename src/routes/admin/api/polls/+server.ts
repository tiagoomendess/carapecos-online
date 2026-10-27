import { json } from '@sveltejs/kit';
import { requireUser } from '#lib/server/admin.ts';
import { findPolls } from '#lib/server/polls.ts';
import type { RequestHandler } from './$types';

/** Polls for the editor's "insert poll" picker: `?q=…` */
export const GET: RequestHandler = async ({ locals, url }) => {
	requireUser(locals);
	return json(await findPolls(url.searchParams.get('q')?.trim() ?? ''));
};
