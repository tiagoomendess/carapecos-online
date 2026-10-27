/**
 * Generates a VAPID key pair for web push: `npm run vapid`.
 * Put the output in .env (development) or the Worker's variables and secrets (production).
 * Changing keys later invalidates every existing subscription, so generate them once.
 */
const toBase64Url = (bytes: ArrayBuffer) => Buffer.from(bytes).toString('base64url');

const keys = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, [
	'sign',
	'verify'
]);
const publicKey = toBase64Url(await crypto.subtle.exportKey('raw', keys.publicKey));
const { d } = await crypto.subtle.exportKey('jwk', keys.privateKey);

console.log(`VAPID_PUBLIC_KEY="${publicKey}"`);
console.log(`VAPID_PRIVATE_KEY="${d}"`);
