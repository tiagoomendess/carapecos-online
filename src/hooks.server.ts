import { env } from 'cloudflare:workers';
import { building } from '$app/env';
import { createAuth } from '#lib/server/auth.ts';
import { background } from '#lib/server/background.ts';
import { legacyRedirect } from '#lib/server/legacy-redirects.ts';
import { dispatchDuePushes, shouldCheckPushes } from '#lib/server/push.ts';
import { svelteKitHandler } from 'better-auth/svelte-kit';
import { redirect } from '@sveltejs/kit';
import { type Handle, sequence } from '@sveltejs/kit/hooks';
import { getTextDirection } from '#lib/paraglide/runtime.js';
import { paraglideMiddleware } from '#lib/paraglide/server.js';

const handleParaglide: Handle = ({ event, resolve }) =>
	paraglideMiddleware(event.request, ({ request, locale }) => {
		return resolve(
			{ ...event, request },
			{
				transformPageChunk: ({ html }) =>
					html
						.replace('%paraglide.lang%', locale)
						.replace('%paraglide.dir%', getTextDirection(locale))
			}
		);
	});

const handleBetterAuth: Handle = async ({ event, resolve }) => {
	if (!env.DB) throw new Error('D1 binding "DB" not found - are you running with wrangler?');

	event.locals.auth = createAuth(env.DB);

	const { auth } = event.locals;
	const session = await auth.api.getSession({ headers: event.request.headers });

	if (session) {
		event.locals.session = session.session;
		event.locals.user = session.user;
	}

	return svelteKitHandler({ event, resolve, auth, building });
};

// Pages that are reachable in the backoffice without being logged in
const publicAdminPaths = ['/admin/login', '/admin/setup'];

// Guards every backoffice request (pages and form actions), not just page loads
const handleAdmin: Handle = ({ event, resolve }) => {
	const { pathname } = event.url;
	const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/');

	if (isAdmin && !event.locals.user && !publicAdminPaths.includes(pathname)) {
		redirect(303, '/admin/login');
	}

	return resolve(event);
};

// 301s for URLs of the old site, which keep their search rankings and shared links working
const handleLegacyRedirects: Handle = async ({ event, resolve }) => {
	const target = await legacyRedirect(new URL(event.request.url).pathname, env.DB);
	// A plain Response, because SvelteKit doesn't catch a thrown `redirect()` for paths it can't decode
	if (target) return new Response(null, { status: 301, headers: { location: target } });
	return resolve(event);
};

// www.carapecos.com → carapecos.com, keeping the path
const handleWww: Handle = ({ event, resolve }) => {
	const url = new URL(event.request.url);
	if (url.hostname.startsWith('www.')) {
		url.hostname = url.hostname.slice(4);
		return new Response(null, { status: 301, headers: { location: url.href } });
	}
	return resolve(event);
};

// Sends due new-article notifications in the background (there's no cron; see push.ts)
const handlePush: Handle = ({ event, resolve }) => {
	if (!event.url.pathname.startsWith('/admin') && shouldCheckPushes()) {
		background(dispatchDuePushes());
	}
	return resolve(event);
};

export const handle: Handle = sequence(
	handleWww,
	handleLegacyRedirects,
	handlePush,
	handleParaglide,
	handleBetterAuth,
	handleAdmin
);
