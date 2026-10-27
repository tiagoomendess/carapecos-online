/** URL slug from a Portuguese title: "Carapeços vence S. Fins!" → "carapecos-vence-s-fins" */
export function slugify(text: string, maxLength = 80) {
	const slug = text
		.normalize('NFKD')
		.replace(/\p{M}/gu, '')
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');

	if (slug.length <= maxLength) return slug;
	// Cut at a word boundary
	const cut = slug.slice(0, maxLength);
	return cut.slice(0, cut.lastIndexOf('-') > 20 ? cut.lastIndexOf('-') : maxLength);
}
