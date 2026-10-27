import { error } from '@sveltejs/kit';
import {
	isValidSubscription,
	pushEnabled,
	removeSubscription,
	saveSubscription
} from '#lib/server/push.ts';
import type { RequestHandler } from './$types';

/** Saves a reader's push subscription (the JSON of `PushSubscription.toJSON()`) */
export const POST: RequestHandler = async ({ request }) => {
	if (!pushEnabled()) error(404);
	const body: unknown = await request.json().catch(() => null);
	if (!isValidSubscription(body)) error(400);
	await saveSubscription(body);
	return new Response(null, { status: 204 });
};

/** Forgets a subscription: `{ "endpoint": "…" }` */
export const DELETE: RequestHandler = async ({ request }) => {
	const body = (await request.json().catch(() => null)) as { endpoint?: unknown } | null;
	if (typeof body?.endpoint !== 'string') error(400);
	await removeSubscription(body.endpoint);
	return new Response(null, { status: 204 });
};
