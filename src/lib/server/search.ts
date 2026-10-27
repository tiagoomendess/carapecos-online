import { htmlToText } from '#lib/text.ts';

/**
 * Full-text search on D1 (FTS5). The `search_index` virtual table (migration 0003) holds plain
 * text, kept in sync by the app rather than by triggers, because bodies are HTML that SQL can't
 * strip. Its `unicode61 remove_diacritics 2` tokenizer makes search accent-insensitive.
 * Rows aren't filtered by status here: queries join the content table and check it there.
 */

export type SearchKind = 'article' | 'poll';

interface Indexable {
	id: string;
	title: string;
	lead?: string | null;
	body?: string | null;
}

/** Statements that replace the index rows of the given items. Run them with `d1.batch()`. */
export function indexStatements(d1: D1Database, kind: SearchKind, items: Indexable[]) {
	const remove = d1.prepare('DELETE FROM search_index WHERE kind = ? AND ref_id = ?');
	const insert = d1.prepare(
		'INSERT INTO search_index (kind, ref_id, title, lead, body) VALUES (?, ?, ?, ?, ?)'
	);
	return items.flatMap((item) => [
		remove.bind(kind, item.id),
		insert.bind(kind, item.id, item.title, item.lead ?? '', htmlToText(item.body ?? ''))
	]);
}

export const removeFromIndex = (d1: D1Database, kind: SearchKind, id: string) =>
	d1.prepare('DELETE FROM search_index WHERE kind = ? AND ref_id = ?').bind(kind, id).run();

/**
 * Turns what the reader typed into an FTS5 query: every word must match, as a prefix
 * ("benf" finds "Benfica"). Words are quoted, so FTS5 operators and punctuation can't break it.
 * Returns `null` when there's nothing to search for.
 */
export function toMatchQuery(input: string) {
	const words = input
		.normalize('NFKC')
		.split(/[^\p{L}\p{N}]+/u)
		.filter(Boolean)
		.slice(0, 8);
	return words.length ? words.map((word) => `"${word}"*`).join(' ') : null;
}
