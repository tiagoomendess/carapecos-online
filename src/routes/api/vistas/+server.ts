import { error } from '@sveltejs/kit';
import { recordView } from '#lib/server/content.ts';
import type { RequestHandler } from './$types';

const bots = /bot|crawl|spider|slurp|facebookexternalhit|preview|headless|lighthouse/i;

/**
 * Counts an article view for "most read". Pages call this with `sendBeacon` once they're shown,
 * so prefetches and most crawlers (which don't run scripts) aren't counted.
 */
export const POST: RequestHandler = async ({ request }) => {
	if (bots.test(request.headers.get('user-agent') ?? ''))
		return new Response(null, { status: 204 });

	const id = (await request.text()).trim();
	if (!/^[0-9a-f-]{36}$/.test(id)) error(400);
	await recordView(id);
	return new Response(null, { status: 204 });
};
