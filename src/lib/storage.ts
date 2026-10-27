import { AwsClient } from 'aws4fetch';

export interface StorageConfig {
	endpoint: string;
	region: string;
	bucket: string;
	accessKeyId: string;
	secretAccessKey: string;
}

export type Storage = ReturnType<typeof createStorage>;

/**
 * File storage over the S3 API, so the same code talks to LocalStack in development and R2 in production.
 * Free of SvelteKit imports so the import script (Node) can use it too.
 */
export function createStorage(config: StorageConfig) {
	const client = new AwsClient({
		accessKeyId: config.accessKeyId,
		secretAccessKey: config.secretAccessKey,
		service: 's3',
		region: config.region
	});

	const objectUrl = (key: string) =>
		`${config.endpoint.replace(/\/$/, '')}/${config.bucket}/${encodeKey(key)}`;

	async function send(key: string, init: RequestInit) {
		const res = await client.fetch(objectUrl(key), init);
		if (!res.ok && res.status !== 404) {
			throw new Error(
				`Storage ${init.method ?? 'GET'} ${key} failed: ${res.status} ${await res.text()}`
			);
		}
		return res;
	}

	return {
		async put(
			key: string,
			body: BodyInit,
			contentType: string,
			cacheControl = 'public, max-age=31536000, immutable'
		) {
			await send(key, {
				method: 'PUT',
				body,
				headers: { 'content-type': contentType, 'cache-control': cacheControl }
			});
		},

		/** Returns `null` if the object doesn't exist */
		async get(key: string) {
			const res = await send(key, { method: 'GET' });
			return res.status === 404 ? null : res;
		},

		async delete(key: string) {
			await send(key, { method: 'DELETE' });
		}
	};
}

/** Public URL of a stored object, e.g. `mediaUrl(base, 'media/abc/960.webp')` */
export const mediaUrl = (baseUrl: string, key: string) =>
	`${baseUrl.replace(/\/$/, '')}/${encodeKey(key)}`;

const encodeKey = (key: string) => key.split('/').map(encodeURIComponent).join('/');
