import { VAPID_PRIVATE_KEY, VAPID_SUBJECT } from '$app/env/private';
import { VAPID_PUBLIC_KEY } from '$app/env/public';
import { env } from 'cloudflare:workers';
import { buildPushPayload } from '@block65/webcrypto-web-push';
import { and, asc, eq, gt, inArray, isNull, lte, sql } from 'drizzle-orm';
import { summaryOf } from '#lib/text.ts';
import { db } from './db/worker.ts';
import { article, pushSubscription } from './db/schema.ts';

/**
 * Web push for new articles (editors tick "send notification" per article).
 *
 * Sending happens in batches of `batchSize`, so each request stays well within Workers'
 * per-request limit on outgoing fetches. `dispatchDuePushes` sends the next batch of the oldest
 * article waiting; it runs after an article is saved and, at most once a minute, after site
 * requests (the adapter has no cron trigger). That also covers scheduled articles: their
 * notification starts with the first request after their publish time.
 */

const batchSize = 40;
/** Ticking "send" on an older article doesn't notify anyone */
const maxAgeMs = 24 * 60 * 60 * 1000;

/** Push services we deliver to; anything else could make the Worker fetch arbitrary URLs */
const pushHosts = [
	'fcm.googleapis.com',
	'updates.push.services.mozilla.com',
	'push.services.mozilla.com',
	'web.push.apple.com',
	'notify.windows.com'
];

export const pushEnabled = () => !!(VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY && VAPID_SUBJECT);

export interface SubscriptionInput {
	endpoint: string;
	keys: { p256dh: string; auth: string };
}

export function isValidSubscription(value: unknown): value is SubscriptionInput {
	const sub = value as Partial<SubscriptionInput> | null;
	if (typeof sub?.endpoint !== 'string' || sub.endpoint.length > 1000) return false;
	if (typeof sub.keys?.p256dh !== 'string' || typeof sub.keys.auth !== 'string') return false;
	if (!/^[\w-]{80,100}$/.test(sub.keys.p256dh) || !/^[\w-]{16,32}$/.test(sub.keys.auth))
		return false;
	try {
		const url = new URL(sub.endpoint);
		return (
			url.protocol === 'https:' &&
			pushHosts.some((host) => url.hostname === host || url.hostname.endsWith(`.${host}`))
		);
	} catch {
		return false;
	}
}

export const saveSubscription = (sub: SubscriptionInput) =>
	db()
		.insert(pushSubscription)
		.values({ endpoint: sub.endpoint, p256dh: sub.keys.p256dh, auth: sub.keys.auth })
		.onConflictDoUpdate({
			target: pushSubscription.endpoint,
			set: { p256dh: sub.keys.p256dh, auth: sub.keys.auth }
		});

export const removeSubscription = (endpoint: string) =>
	db().delete(pushSubscription).where(eq(pushSubscription.endpoint, endpoint));

/** Sends the next batch of the oldest article whose notification is due */
export async function dispatchDuePushes() {
	if (!pushEnabled()) return;
	const now = new Date();
	const [due] = await db()
		.select({
			id: article.id,
			slug: article.slug,
			title: article.title,
			lead: article.lead,
			body: sql<string>`substr(${article.body}, 1, 1200)`,
			publishedAt: article.publishedAt,
			cursor: article.pushCursor
		})
		.from(article)
		.where(
			and(
				eq(article.status, 'published'),
				eq(article.sendPush, true),
				isNull(article.pushSentAt),
				lte(article.publishedAt, now)
			)
		)
		.orderBy(asc(article.publishedAt))
		.limit(1);
	if (!due) return;

	// Too old to announce: mark it done without sending
	if (due.publishedAt && now.getTime() - due.publishedAt.getTime() > maxAgeMs) {
		await db().update(article).set({ pushSentAt: now }).where(eq(article.id, due.id));
		return;
	}

	const batch = await db()
		.select()
		.from(pushSubscription)
		.where(due.cursor ? gt(pushSubscription.endpoint, due.cursor) : undefined)
		.orderBy(asc(pushSubscription.endpoint))
		.limit(batchSize);
	const last = batch.at(-1)?.endpoint ?? due.cursor;
	const finished = batch.length < batchSize;

	// Claim the batch: only one request moves the cursor from where we read it
	const claim = await env.DB.prepare(
		`UPDATE article SET push_cursor = ?, push_sent_at = ?
		WHERE id = ? AND push_sent_at IS NULL AND coalesce(push_cursor, '') = ?`
	)
		.bind(last, finished ? now.getTime() : null, due.id, due.cursor ?? '')
		.run();
	if (!claim.meta.changes) return;

	const message = JSON.stringify({
		title: due.title,
		body: summaryOf(due.lead, due.body, 140),
		url: `/noticias/${due.slug}`
	});
	const vapid = {
		subject: VAPID_SUBJECT,
		publicKey: VAPID_PUBLIC_KEY,
		privateKey: VAPID_PRIVATE_KEY
	};
	const gone: string[] = [];

	await Promise.all(
		batch.map(async (sub) => {
			try {
				const payload = await buildPushPayload(
					// Expire after 12 hours: older news isn't worth a notification
					{ data: message, options: { ttl: 12 * 60 * 60, urgency: 'normal' } },
					{
						endpoint: sub.endpoint,
						expirationTime: null,
						keys: { p256dh: sub.p256dh, auth: sub.auth }
					},
					vapid
				);
				const res = await fetch(sub.endpoint, payload);
				// The reader unsubscribed or the subscription expired
				if (res.status === 404 || res.status === 410) gone.push(sub.endpoint);
			} catch (error) {
				console.error('Push failed', sub.endpoint, error);
			}
		})
	);
	if (gone.length) {
		await db().delete(pushSubscription).where(inArray(pushSubscription.endpoint, gone));
	}
}

let lastCheck = 0;

/** Called on site requests: looks for due notifications at most once a minute per isolate */
export function shouldCheckPushes() {
	const now = Date.now();
	if (now - lastCheck < 60_000) return false;
	lastCheck = now;
	return true;
}

/** Number of active subscriptions, for the dashboard */
export const countSubscriptions = () =>
	db()
		.select({ total: sql<number>`count(*)` })
		.from(pushSubscription)
		.then(([row]) => row.total);
