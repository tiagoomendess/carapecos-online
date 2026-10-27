/**
 * Knowledge about the old BlogTok site (carapecos.com), shared by the import script and the
 * redirects for old URLs.
 */

import { fromLisbonWallClock } from './format.ts';

/**
 * Old tags (as they appear in `/blog/tag/{tag}` URLs) → new category slug.
 * Ordered by priority: when an article has several tags, the first matching category wins.
 */
export const legacyTagCategories: [category: string, tags: string[]][] = [
	['desporto', ['Futebol', 'Campeões de Futebol']],
	['politica', ['Política']],
	['sociedade', ['Moda']],
	[
		'cultura-e-tradicoes',
		['Marchas Populares', 'Ranchos Folclóricos', 'Teatro', 'Natal', 'S.Tiago']
	],
	['religiao', ['Igreja']],
	['ocorrencias', ['Acidentes', 'Incendios', 'intemperes']],
	['solidariedade', ['idosos']],
	['entrevistas-e-opiniao', ['entrevista']]
];

/** Category for articles that had no tag on the old site */
export const defaultLegacyCategory = 'sociedade';

const normalizeTag = (tag: string) => tag.trim().toLowerCase();

const tagToCategory = new Map(
	legacyTagCategories.flatMap(([category, tags]) =>
		tags.map((tag) => [normalizeTag(tag), category] as const)
	)
);

export const categoryForLegacyTag = (tag: string) => tagToCategory.get(normalizeTag(tag));

/** Picks the highest-priority category among an article's old tags */
export function categoryForLegacyTags(tags: Iterable<string>) {
	const categories = new Set([...tags].map(categoryForLegacyTag));
	return (
		legacyTagCategories.find(([category]) => categories.has(category))?.[0] ?? defaultLegacyCategory
	);
}

/**
 * Decodes a path segment from the old site. Its URLs are percent-encoded in ISO-8859-1
 * (`Pol%EDtica`), which `decodeURIComponent` rejects, and use `+` for spaces.
 */
export function decodeLegacySegment(segment: string) {
	const bytes = segment
		.replace(/\+/g, ' ')
		.replace(/%([0-9a-f]{2})/gi, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)));
	try {
		// Some links are UTF-8 encoded instead
		return decodeURIComponent(escape(bytes));
	} catch {
		return bytes;
	}
}

const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

/** Parses the old site's dates, e.g. `26Out2026 10:34:57`, which are Lisbon local time */
export function parseLegacyDate(text: string) {
	const match = text.match(/(\d{1,2})([A-Za-z]{3})(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})/);
	if (!match) return null;
	const [, day, monthName, year, hour, minute, second] = match;
	const month = months.findIndex((m) => m.toLowerCase() === monthName.toLowerCase());
	if (month === -1) return null;

	// Old dates are Lisbon wall-clock time
	return fromLisbonWallClock(new Date(Date.UTC(+year, month, +day, +hour, +minute, +second)));
}
