/** Polls embedded in article bodies are stored as `<div data-poll="slug"></div>` */
const embed = /<div data-poll="([a-z0-9-]+)"><\/div>/g;

export const embeddedPollSlugs = (html: string) => [...html.matchAll(embed)].map((m) => m[1]);

/** The body split around poll embeds: HTML and poll slugs, alternating, in order */
export function splitPollEmbeds(html: string) {
	const parts: ({ html: string } | { poll: string })[] = [];
	let last = 0;
	for (const match of html.matchAll(embed)) {
		if (match.index > last) parts.push({ html: html.slice(last, match.index) });
		parts.push({ poll: match[1] });
		last = match.index + match[0].length;
	}
	if (last < html.length) parts.push({ html: html.slice(last) });
	return parts;
}
