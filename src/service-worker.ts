import { version } from '$app/env';
import { assets } from '$app/manifest';
import { self as sw } from '$app/service-worker';

/**
 * Offline support and push notifications for the public site (see "PWA" in DRAFT.md):
 * - static files (icons, the offline page) are cached on install; the app's JS and CSS are
 *   cached as pages load them, so readers never download the backoffice's code
 * - articles are network-first, and the last ones read stay available offline
 * - their images are cached as they're seen
 * - anything else that fails offline gets the offline page
 * The backoffice and APIs are never cached.
 */

const shellCache = `shell-${version}`;
const pagesCache = 'pages';
const imagesCache = 'images';
const maxPages = 40;
const maxImages = 150;

// The big original logo and the social card aren't needed offline
const shell = assets
	.map(({ path }) => `/${path.replace(/^\//, '')}`)
	.filter((path) => !/carapecos_online_logo|og-default/.test(path));

/**
 * Caches the static files. Cloudflare serves `/offline.html` through a redirect to `/offline`,
 * and a redirected response can't answer a navigation, so those are stored as plain copies.
 */
async function precache() {
	const cache = await caches.open(shellCache);
	await Promise.all(
		shell.map(async (path) => {
			const response = await fetch(path);
			if (!response.ok) throw new Error(`Precache failed: ${path}`);
			const copy = response.redirected
				? new Response(await response.blob(), { headers: response.headers })
				: response;
			await cache.put(path, copy);
		})
	);
}

sw.addEventListener('install', (event) => {
	event.waitUntil(precache().then(() => sw.skipWaiting()));
});

sw.addEventListener('activate', (event) => {
	event.waitUntil(
		(async () => {
			for (const key of await caches.keys()) {
				if (key.startsWith('shell-') && key !== shellCache) await caches.delete(key);
			}
			await sw.clients.claim();
		})()
	);
});

/** Keeps a cache to its newest `max` entries */
async function trim(cacheName: string, max: number) {
	const cache = await caches.open(cacheName);
	const keys = await cache.keys();
	await Promise.all(keys.slice(0, Math.max(0, keys.length - max)).map((key) => cache.delete(key)));
}

/** Network first; successful responses are kept for offline reading */
async function networkFirst(request: Request, cacheName: string, max: number) {
	try {
		const response = await fetch(request);
		if (response.ok) {
			const cache = await caches.open(cacheName);
			await cache.delete(request); // re-insert, so the newest are kept when trimming
			await cache.put(request, response.clone());
			await trim(cacheName, max);
		}
		return response;
	} catch {
		const cached = await caches.match(request);
		if (cached) return cached;
		if (request.mode === 'navigate') {
			return (await caches.match('/offline.html')) ?? Response.error();
		}
		return Response.error();
	}
}

/** Cache first, for files that never change at a given URL */
async function cacheFirst(request: Request, cacheName = imagesCache, max = maxImages) {
	const cached = await caches.match(request);
	if (cached) return cached;
	const response = await fetch(request);
	// Opaque (cross-origin, no CORS) responses can't be inspected but are fine to replay
	if (response.ok || response.type === 'opaque') {
		const cache = await caches.open(cacheName);
		await cache.put(request, response.clone());
		if (cacheName === imagesCache) await trim(cacheName, max);
	}
	return response;
}

sw.addEventListener('fetch', (event) => {
	const { request } = event;
	if (request.method !== 'GET') return;
	const url = new URL(request.url);

	if (url.origin === sw.location.origin) {
		if (url.pathname.startsWith('/admin') || url.pathname.startsWith('/api/')) return;

		if (shell.includes(url.pathname)) {
			event.respondWith(caches.match(request).then((cached) => cached ?? fetch(request)));
			return;
		}
		// Hashed build files never change: keep them with this version's shell
		if (url.pathname.startsWith('/_app/immutable/')) {
			event.respondWith(cacheFirst(request, shellCache));
			return;
		}
		// Article pages and their data for client-side navigation
		if (url.pathname.startsWith('/noticias/')) {
			event.respondWith(networkFirst(request, pagesCache, maxPages));
			return;
		}
		if (request.mode === 'navigate') {
			event.respondWith(networkFirst(request, pagesCache, maxPages));
		}
		return;
	}

	// Media (on its own host): cache images as they're shown
	if (request.destination === 'image') {
		event.respondWith(cacheFirst(request).catch(() => Response.error()));
	}
});

/* Push notifications (sent by src/lib/server/push.ts) */

interface PushPayload {
	title: string;
	body: string;
	url: string;
	image?: string;
}

sw.addEventListener('push', (event) => {
	const data = (event.data?.json() ?? {}) as Partial<PushPayload>;
	event.waitUntil(
		sw.registration.showNotification(data.title ?? 'Carapeços Online', {
			body: data.body,
			icon: '/icon-192.png',
			badge: '/badge-96.png',
			data: { url: data.url ?? '/' },
			// One notification per article, even if it arrives twice
			tag: data.url,
			lang: 'pt-PT'
		})
	);
});

sw.addEventListener('notificationclick', (event) => {
	event.notification.close();
	const target = new URL((event.notification.data?.url as string) ?? '/', sw.location.origin).href;
	event.waitUntil(
		(async () => {
			const windows = await sw.clients.matchAll({ type: 'window', includeUncontrolled: true });
			const open = windows.find((client) => client.url === target);
			if (open) return open.focus();
			return sw.clients.openWindow(target);
		})()
	);
});
