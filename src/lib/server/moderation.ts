/**
 * Automatic checks on reader comments, which are published without approval (see DRAFT.md).
 * The word list is a starting point: add to it as needed. Matching ignores case and accents and
 * only matches whole words, so "computador" doesn't trip "puta".
 */

const blockedWords = [
	'caralho',
	'foda-se',
	'fodase',
	'fodasse',
	'puta',
	'putas',
	'filho da puta',
	'cabrao',
	'cabroes',
	'paneleiro',
	'paneleiros',
	'conas',
	'cona',
	'merdas',
	'otario',
	'otarios'
];

export const maxLinksPerComment = 2;

const normalize = (text: string) => text.normalize('NFKD').replace(/\p{M}/gu, '').toLowerCase();

const blockedPattern = new RegExp(
	`(?<![\\p{L}\\p{N}])(${blockedWords.map((w) => normalize(w).replace(/[-\s]+/g, '[-\\s]*')).join('|')})(?![\\p{L}\\p{N}])`,
	'u'
);

export const hasBlockedWords = (text: string) => blockedPattern.test(normalize(text));

export const countLinks = (text: string) => (text.match(/(https?:\/\/|www\.)\S+/gi) ?? []).length;
