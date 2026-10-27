/** Shared hint for which listing cover should join the article morph. */

let morphSlug = $state<string | null>(null);

export function articleSlugFromPath(pathname: string) {
	const match = /^\/noticias\/([^/]+)$/.exec(pathname);
	return match?.[1] ?? null;
}

export function setCoverMorphSlug(slug: string | null) {
	morphSlug = slug;
}

/** Listing cards only get a name when this navigation involves that article. */
export function coverTransitionName(slug: string, always = false) {
	if (always || morphSlug === slug) return `cover-${slug}`;
}