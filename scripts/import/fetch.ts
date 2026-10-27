import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

export const cacheDir = path.resolve('.import-cache');

const userAgent = 'CarapecosOnlineImporter/1.0 (+https://carapecos.com)';
const delayMs = 250;

let queue = Promise.resolve();

/** Serializes requests with a small delay so we don't hammer the old server */
function throttled<T>(fn: () => Promise<T>): Promise<T> {
	const run = queue.then(fn);
	queue = run.then(
		() => sleep(delayMs),
		() => sleep(delayMs)
	);
	return run;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url: string, attempts = 3): Promise<Response> {
	for (let attempt = 1; ; attempt++) {
		try {
			const res = await throttled(() =>
				fetch(url, { headers: { 'user-agent': userAgent }, signal: AbortSignal.timeout(30_000) })
			);
			// Retry server errors; 4xx won't get better
			if (res.status >= 500 && attempt < attempts) throw new Error(`HTTP ${res.status}`);
			return res;
		} catch (error) {
			if (attempt >= attempts) throw error;
			await sleep(1000 * attempt);
		}
	}
}

const cachePath = (kind: string, url: string, ext: string) =>
	path.join(cacheDir, kind, createHash('sha1').update(url).digest('hex') + ext);

async function readCache(file: string) {
	try {
		return await readFile(file);
	} catch {
		return null;
	}
}

async function writeCache(file: string, data: Uint8Array | string) {
	await mkdir(path.dirname(file), { recursive: true });
	await writeFile(file, data);
}

/**
 * Fetches an old-site page as text. Pages are windows-1252/ISO-8859-1, so they're decoded
 * explicitly. Cached on disk, so re-runs don't fetch again (`refresh` bypasses the cache).
 */
export async function fetchPage(url: string, { refresh = false } = {}) {
	const file = cachePath('pages', url, '.html');
	const cached = refresh ? null : await readCache(file);
	if (cached) return cached.toString('utf8');

	const res = await fetchWithRetry(url);
	if (!res.ok) throw new Error(`GET ${url} failed: ${res.status}`);
	const html = new TextDecoder('windows-1252').decode(await res.arrayBuffer());
	await writeCache(file, html);
	return html;
}

/** Hosts that failed at the network level this run; their other files are skipped */
const unreachableHosts = new Set<string>();

/** Downloads a binary file (cached). Returns `null` for missing files or unreachable hosts. */
export async function fetchFile(url: string) {
	const file = cachePath('files', url, '.bin');
	const missing = file + '.missing';
	if (await readCache(missing)) return null;
	const cached = await readCache(file);
	if (cached) return cached;

	const host = new URL(url).host;
	if (unreachableHosts.has(host)) return null;

	let res: Response;
	try {
		res = await fetchWithRetry(url);
	} catch {
		unreachableHosts.add(host);
		return null;
	}
	if (!res.ok) {
		await writeCache(missing, String(res.status));
		return null;
	}
	const data = Buffer.from(await res.arrayBuffer());
	await writeCache(file, data);
	return data;
}

export async function readJson<T>(name: string): Promise<T | null> {
	const data = await readCache(path.join(cacheDir, name));
	return data ? (JSON.parse(data.toString('utf8')) as T) : null;
}

export const writeJson = (name: string, value: unknown) =>
	writeCache(path.join(cacheDir, name), JSON.stringify(value, null, '\t'));
