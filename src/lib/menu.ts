/** Links on a CMS page: site paths stay in this tab; everything else opens in a new one. */

const blocked = /^(javascript|data|vbscript):/i;

/** Saved in the backoffice: a site path, or a full http(s)/mailto/tel address */
export function normalizeMenuHref(raw: string): string | null {
	const href = raw.trim();
	if (!href || blocked.test(href)) return null;
	if (/^(https?:|mailto:|tel:)/i.test(href)) return href;
	if (href.startsWith('//')) return `https:${href}`;
	return href.startsWith('/') ? href : `/${href}`;
}

export function classifyMenuHref(
	href: string,
	siteUrl: string
): { href: string; external: boolean } {
	if (href.startsWith('/') && !href.startsWith('//')) {
		return { href, external: false };
	}
	if (/^(mailto:|tel:)/i.test(href)) {
		return { href, external: false };
	}
	try {
		const base = new URL(siteUrl.endsWith('/') ? siteUrl : `${siteUrl}/`);
		const url = new URL(href, base);
		if (url.origin === base.origin) {
			return { href: `${url.pathname}${url.search}${url.hash}`, external: false };
		}
		return { href: url.href, external: true };
	} catch {
		return { href, external: true };
	}
}
