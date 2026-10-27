import type { Cookies, RequestEvent } from '@sveltejs/kit';
import { and, count, desc, eq, gt, inArray, isNull } from 'drizzle-orm';
import type { ContactMessageView } from '#lib/types.ts';
import { db } from './db/worker.ts';
import { contactMessage } from './db/schema.ts';
import { verifyTurnstile, visitorHash } from './visitor.ts';

/** The contact form on /contactos. Messages go to the backoffice inbox only (no email). */

const maxPerHour = 3;
const sentCookie = 'contactos';
const maxRemembered = 40;

export type ContactError = 'name' | 'email' | 'message' | 'bot' | 'rate_limited';

export function readContactForm(form: FormData) {
	const text = (name: string) => form.get(name)?.toString().trim() ?? '';
	return {
		name: text('name'),
		email: text('email'),
		message: text('message'),
		token: text('cf-turnstile-response')
	};
}

export async function sendContactMessage(
	event: RequestEvent,
	input: ReturnType<typeof readContactForm>
): Promise<{ ok: true } | { ok: false; error: ContactError }> {
	if (input.name.length < 2 || input.name.length > 100) return { ok: false, error: 'name' };
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email) || input.email.length > 200) {
		return { ok: false, error: 'email' };
	}
	if (input.message.length < 5 || input.message.length > 5000) {
		return { ok: false, error: 'message' };
	}
	if (!(await verifyTurnstile(input.token, event))) return { ok: false, error: 'bot' };

	const ipHash = await visitorHash(event, 'contact');
	const [{ recent }] = await db()
		.select({ recent: count() })
		.from(contactMessage)
		.where(
			and(
				eq(contactMessage.ipHash, ipHash),
				gt(contactMessage.createdAt, new Date(Date.now() - 60 * 60 * 1000))
			)
		);
	if (recent >= maxPerHour) return { ok: false, error: 'rate_limited' };

	const [row] = await db()
		.insert(contactMessage)
		.values({
			name: input.name,
			email: input.email,
			message: input.message,
			ipHash
		})
		.returning({ id: contactMessage.id });
	rememberSent(event.cookies, row.id);
	return { ok: true };
}

/** Messages this browser sent, remembered in a cookie so a shared IP doesn't leak the inbox */
export async function listVisitorMessages(cookies: Cookies): Promise<ContactMessageView[]> {
	const ids = rememberedIds(cookies);
	if (!ids.length) return [];
	return db()
		.select({
			id: contactMessage.id,
			message: contactMessage.message,
			createdAt: contactMessage.createdAt
		})
		.from(contactMessage)
		.where(inArray(contactMessage.id, ids))
		.orderBy(desc(contactMessage.createdAt))
		.limit(maxRemembered);
}

function rememberedIds(cookies: Cookies) {
	return (cookies.get(sentCookie) ?? '').split('.').filter(Boolean);
}

function rememberSent(cookies: Cookies, id: string) {
	const ids = [...new Set([...rememberedIds(cookies), id])].slice(-maxRemembered);
	cookies.set(sentCookie, ids.join('.'), {
		path: '/',
		maxAge: 60 * 60 * 24 * 365 * 2,
		httpOnly: true,
		sameSite: 'lax'
	});
}

/* Backoffice */

export const listContactMessages = () =>
	db().select().from(contactMessage).orderBy(desc(contactMessage.createdAt)).limit(200);

export const countUnreadMessages = () =>
	db()
		.select({ total: count() })
		.from(contactMessage)
		.where(isNull(contactMessage.readAt))
		.then(([row]) => row.total);

export const setMessageRead = (id: string, read: boolean) =>
	db()
		.update(contactMessage)
		.set({ readAt: read ? new Date() : null })
		.where(eq(contactMessage.id, id));

export const deleteContactMessage = (id: string) =>
	db().delete(contactMessage).where(eq(contactMessage.id, id));
