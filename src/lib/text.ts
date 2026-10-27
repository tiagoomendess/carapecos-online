const entities: Record<string, string> = {
	amp: '&',
	lt: '<',
	gt: '>',
	quot: '"',
	apos: "'",
	nbsp: ' '
};

/** Plain text from stored article HTML, for search indexing and excerpts. Not a sanitizer. */
export function htmlToText(html: string) {
	return html
		.replace(/<(script|style)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
		.replace(/<[^>]*>?/g, ' ')
		.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, code: string) => {
			if (code[0] !== '#') return entities[code.toLowerCase()] ?? match;
			const point =
				code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : Number(code.slice(1));
			return Number.isFinite(point) ? String.fromCodePoint(point) : match;
		})
		.replace(/\s+/g, ' ')
		.trim();
}

/** Cuts text at a word boundary, adding an ellipsis when shortened */
export function truncate(text: string, maxLength: number) {
	if (text.length <= maxLength) return text;
	const cut = text.slice(0, maxLength);
	const space = cut.lastIndexOf(' ');
	return (space > maxLength * 0.6 ? cut.slice(0, space) : cut).replace(/[\s,.;:!?-]+$/, '') + '…';
}

/** Summary for listings: the lead, or the start of the body for articles without one */
export const summaryOf = (lead: string | null, bodyHtml: string, maxLength = 180) =>
	lead?.trim() || truncate(htmlToText(bodyHtml), maxLength);
