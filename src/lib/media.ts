/** Widths generated for every image, as WebP */
export const mediaWidths = [480, 960, 1600] as const;

/** Width used for `src` in article bodies; `srcset` covers the rest */
export const defaultBodyWidth = 960;

/**
 * Widths to generate for an image of the given width: the standard ones that fit (never
 * upscaled), plus the image's own width when it's between two of them, so a 716px photo
 * isn't shown at 480px.
 */
export function variantWidthsFor(width: number) {
	const widths: number[] = mediaWidths.filter((w) => w <= width);
	if (width < mediaWidths.at(-1)! && !widths.includes(width)) widths.push(width);
	return widths;
}

export const variantKey = (mediaKey: string, width: number) => `${mediaKey}/${width}.webp`;

/** The variant closest to `target` without going over (or the smallest one) */
export function pickVariant(variants: number[], target = defaultBodyWidth) {
	const sorted = [...variants].sort((a, b) => a - b);
	return sorted.filter((w) => w <= target).at(-1) ?? sorted[0];
}

/**
 * Article bodies reference media by root-relative path (`/media/abc/960.webp`) so the stored
 * HTML doesn't depend on where media is hosted. This prefixes them with the public base URL.
 */
export const resolveMediaUrls = (html: string, baseUrl: string) =>
	html
		.replace(/(src|srcset)="\/media\//g, `$1="${baseUrl.replace(/\/$/, '')}/media/`)
		.replace(/, \/media\//g, `, ${baseUrl.replace(/\/$/, '')}/media/`);

/** The reverse of `resolveMediaUrls`, for HTML coming back from the editor before it's stored */
export function unresolveMediaUrls(html: string, baseUrl: string) {
	const base = baseUrl.replace(/\/$/, '');
	return html.replaceAll(`${base}/media/`, '/media/');
}
