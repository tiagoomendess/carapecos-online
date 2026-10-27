import { describe, expect, it } from 'vitest';
import { createStorage, mediaUrl } from './storage';

// Integration test against the LocalStack S3 used in development; skipped when it isn't running
const endpoint = 'http://localhost:4566';
const bucket = 'carapecos-media';
const localstackUp = await fetch(`${endpoint}/_localstack/health`)
	.then((res) => res.ok)
	.catch(() => false);

describe.runIf(localstackUp)('storage (LocalStack)', () => {
	const storage = createStorage({
		endpoint,
		region: 'us-east-1',
		bucket,
		accessKeyId: 'test',
		secretAccessKey: 'test'
	});

	it('puts, reads, serves publicly and deletes an object', async () => {
		const key = `test/${crypto.randomUUID()}/ção.txt`;
		await storage.put(key, 'olá Carapeços', 'text/plain; charset=utf-8');

		const res = await storage.get(key);
		expect(await res?.text()).toBe('olá Carapeços');

		const pub = await fetch(mediaUrl(`${endpoint}/${bucket}`, key));
		expect(pub.headers.get('content-type')).toContain('text/plain');

		await storage.delete(key);
		expect(await storage.get(key)).toBeNull();
	});
});

describe('mediaUrl', () => {
	it('joins and encodes the key', () => {
		expect(mediaUrl('https://media.carapecos.com/', 'media/a b/960.webp')).toBe(
			'https://media.carapecos.com/media/a%20b/960.webp'
		);
	});
});
