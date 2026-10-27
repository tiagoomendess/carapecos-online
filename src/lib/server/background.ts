import { waitUntil } from 'cloudflare:workers';

/**
 * Runs work after the response is sent (Workers' `waitUntil`). In the Vite dev server, where
 * there's no request context to extend, the work just runs on its own.
 */
export function background(task: Promise<unknown>) {
	const settled = task.catch((error) => console.error('Background task failed:', error));
	try {
		waitUntil(settled);
	} catch {
		// No Workers request context (development)
	}
}
