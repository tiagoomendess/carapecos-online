import { buildPushPayload } from '@block65/webcrypto-web-push';
import { describe, expect, it } from 'vitest';

const base64url = (bytes: ArrayBuffer | Uint8Array) =>
	Buffer.from(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes)).toString('base64url');

/** VAPID keys in the format `npm run vapid` prints */
async function vapidKeys() {
	const keys = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
		'sign',
		'verify'
	]);
	const { d } = await crypto.subtle.exportKey('jwk', keys.privateKey);
	return {
		subject: 'mailto:teste@carapecos.test',
		publicKey: base64url(await crypto.subtle.exportKey('raw', keys.publicKey)),
		privateKey: d!
	};
}

/** What a browser's PushSubscription.toJSON() gives */
async function browserSubscription() {
	const keys = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, [
		'deriveBits'
	]);
	return {
		endpoint: 'https://fcm.googleapis.com/fcm/send/teste',
		expirationTime: null,
		keys: {
			p256dh: base64url(await crypto.subtle.exportKey('raw', keys.publicKey)),
			auth: base64url(crypto.getRandomValues(new Uint8Array(16)))
		}
	};
}

describe('web push payloads', () => {
	it('encrypts and signs with keys in our format', async () => {
		const vapid = await vapidKeys();
		const payload = await buildPushPayload(
			{ data: JSON.stringify({ title: 'Teste', body: 'Olá', url: '/' }), options: { ttl: 60 } },
			await browserSubscription(),
			vapid
		);
		const headers = new Headers(payload.headers as HeadersInit);
		expect(headers.get('authorization')).toMatch(/^vapid t=.+, k=/);
		expect(headers.get('content-encoding')).toBe('aes128gcm');
		expect(headers.get('ttl')).toBe('60');
	});
});
