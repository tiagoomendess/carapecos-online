import { eq } from 'drizzle-orm';
import { categoryForLegacyTag, decodeLegacySegment } from '#lib/legacy.ts';
import { getDb } from '#lib/server/db/index.ts';
import { article } from '#lib/server/db/schema.ts';

/**
 * Where an old BlogTok URL now lives, or `null` if it isn't one:
 * `/blog/{id}/...` → article, `/blog/tag/{tag}` → category, `/blog`, `/blog/pag/{n}/` → homepage.
 * Works on the raw (still encoded) path: old URLs are ISO-8859-1 encoded (`Pol%EDtica`), which
 * SvelteKit can't decode, so this runs in a hook before routing.
 */
export async function legacyRedirect(pathname: string, d1: D1Database) {
	const segments = pathname.split('/').filter(Boolean);
	if (segments[0] !== 'blog') return null;
	const [kind, value] = segments.slice(1);

	if (!kind || kind === 'pag') return '/';

	if (kind === 'tag') {
		const category = value && categoryForLegacyTag(decodeLegacySegment(value));
		return category ? `/categoria/${category}` : '/';
	}

	const legacyId = Number(kind);
	if (!Number.isInteger(legacyId) || legacyId <= 0) return null;
	const found = await getDb(d1).query.article.findFirst({
		columns: { slug: true },
		where: eq(article.legacyId, legacyId)
	});
	return found ? `/noticias/${found.slug}` : null;
}
