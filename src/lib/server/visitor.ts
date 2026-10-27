import { BETTER_AUTH_SECRET, TURNSTILE_SECRET_KEY } from '$app/env/private';
import type { RequestEvent } from '@sveltejs/kit';

/**
 * Who's sending a comment, vote or message, without storing who they are: raw IPs never reach
 * the database, only salted hashes, used to rate-limit abuse.
 */

export function clientIp(event: RequestEvent) {
	return event.request.headers.get('cf-connecting-ip') ?? event.getClientAddress();
}

const encoder = new TextEncoder();
let hmacKey: Promise<CryptoKey> | undefined;

/**
 * HMAC-SHA256 of the visitor's IP (plus user agent when `withUserAgent`), keyed with the app
 * secret and a `purpose`, so the same visitor gets unrelated hashes in different features.
 */
export async function visitorHash(
	event: RequestEvent,
	purpose: string,
	{ withUserAgent = false } = {}
) {
	hmacKey ??= crypto.subtle.importKey(
		'raw',
		encoder.encode(BETTER_AUTH_SECRET),
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	const userAgent = withUserAgent ? (event.request.headers.get('user-agent') ?? '') : '';
	const data = encoder.encode(`${purpose}\n${clientIp(event)}\n${userAgent}`);
	const signature = await crypto.subtle.sign('HMAC', await hmacKey, data);
	return [...new Uint8Array(signature)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Checks a Turnstile token with Cloudflare. Fails closed when Cloudflare can't be reached. */
export async function verifyTurnstile(token: string, event: RequestEvent) {
	if (!token) return false;
	try {
		const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
			method: 'POST',
			body: new URLSearchParams({
				secret: TURNSTILE_SECRET_KEY,
				response: token,
				remoteip: clientIp(event)
			})
		});
		const result = (await res.json()) as { success?: boolean };
		return result.success === true;
	} catch {
		return false;
	}
}

/** Form field the Turnstile component fills in */
export const turnstileField = 'cf-turnstile-response';
