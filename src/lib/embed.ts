/**
 * Video links an editor pastes → the embeddable player URL, or `null` if it isn't a supported
 * video. YouTube uses the privacy-enhanced (no cookie) host.
 */
export function toEmbedUrl(input: string) {
	let url: URL;
	try {
		url = new URL(input.trim());
	} catch {
		return null;
	}
	const host = url.hostname.replace(/^(www|m)\./, '');

	if (host === 'youtu.be' || host.endsWith('youtube.com') || host === 'youtube-nocookie.com') {
		const id =
			host === 'youtu.be'
				? url.pathname.slice(1)
				: (url.searchParams.get('v') ??
					url.pathname.match(/^\/(?:embed|shorts|live)\/([^/]+)/)?.[1]);
		return id && /^[\w-]{6,}$/.test(id) ? `https://www.youtube-nocookie.com/embed/${id}` : null;
	}

	if (host === 'facebook.com' || host === 'fb.watch') {
		if (url.pathname.startsWith('/plugins/video.php')) return url.href;
		const video = new URL('https://www.facebook.com/plugins/video.php');
		video.searchParams.set('href', url.href);
		return video.href;
	}

	return null;
}

/** Whether an iframe `src` is a player we allow in article bodies */
export function isAllowedEmbed(src: string) {
	try {
		const url = new URL(src);
		if (url.protocol !== 'https:') return false;
		if (url.hostname === 'www.youtube-nocookie.com' || url.hostname === 'www.youtube.com')
			return url.pathname.startsWith('/embed/');
		if (url.hostname === 'www.facebook.com') return url.pathname === '/plugins/video.php';
		return false;
	} catch {
		return false;
	}
}
