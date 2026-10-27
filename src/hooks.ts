import type { Reroute } from '@sveltejs/kit/hooks';
import { deLocalizeUrl } from '#lib/paraglide/runtime.js';

export const reroute: Reroute = (request) => {
	try {
		return deLocalizeUrl(request.url).pathname;
	} catch {
		// Malformed URLs (e.g. old ISO-8859-1 links) are left as-is for the redirect hook
		return undefined;
	}
};
