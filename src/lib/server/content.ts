import { env } from 'cloudflare:workers';
import { and, asc, count, desc, eq, gte, inArray, lte, ne, sql, type SQL } from 'drizzle-orm';
import { lisbonDay } from '#lib/format.ts';
import { summaryOf } from '#lib/text.ts';
import type { ArticleCard, FeedItem, Image, NavPage, Paged } from '#lib/types.ts';
import { db } from './db/worker.ts';
import {
	article,
	articleSlugRedirect,
	articleViewDaily,
	category,
	media,
	page,
	pageMenuItem
} from './db/schema.ts';
import { getPollViews } from './polls.ts';
import { toMatchQuery } from './search.ts';

/** Queries behind the public site. Only published content whose publish date has passed is visible. */

export const pageSize = 10;

const isPublished = () =>
	and(eq(article.status, 'published'), lte(article.publishedAt, new Date()));

const cardColumns = {
	id: article.id,
	slug: article.slug,
	title: article.title,
	lead: article.lead,
	// Enough of the body for an excerpt when there's no lead, without loading whole bodies
	bodyStart: sql<string>`substr(${article.body}, 1, 1200)`,
	publishedAt: article.publishedAt,
	categoryName: category.name,
	categorySlug: category.slug,
	coverKey: media.key,
	coverWidth: media.width,
	coverHeight: media.height,
	coverVariants: media.variants,
	coverAlt: media.alt
};

const selectCards = () =>
	db()
		.select(cardColumns)
		.from(article)
		.innerJoin(category, eq(category.id, article.categoryId))
		.leftJoin(media, eq(media.id, article.coverId));

type CardRow = Awaited<ReturnType<typeof selectCards>>[number];

function toImage(row: CardRow): Image | null {
	if (!row.coverKey || !row.coverWidth || !row.coverHeight) return null;
	return {
		key: row.coverKey,
		width: row.coverWidth,
		height: row.coverHeight,
		variants: row.coverVariants ?? [],
		alt: row.coverAlt
	};
}

const toCard = (row: CardRow): ArticleCard => ({
	id: row.id,
	slug: row.slug,
	title: row.title,
	summary: summaryOf(row.lead, row.bodyStart ?? ''),
	// Only published articles reach the site, and those always have a date
	publishedAt: row.publishedAt ?? new Date(0),
	category: { name: row.categoryName, slug: row.categorySlug },
	cover: toImage(row)
});

export const getCategories = () =>
	db()
		.select({ id: category.id, name: category.name, slug: category.slug })
		.from(category)
		.orderBy(asc(category.sortOrder), asc(category.name));

export const getCategory = (slug: string) =>
	db().query.category.findFirst({ where: eq(category.slug, slug) });

export const getFooterPages = () =>
	db()
		.select({ title: page.title, slug: page.slug })
		.from(page)
		.where(and(eq(page.status, 'published'), eq(page.showInFooter, true)))
		.orderBy(asc(page.title));

/** Homepage hamburger: published pages marked "mostrar no menu" */
export async function getNavMenu(): Promise<NavPage[]> {
	const rows = await db()
		.select({ id: page.id, title: page.title, slug: page.slug })
		.from(page)
		.where(and(eq(page.status, 'published'), eq(page.showInMenu, true)))
		.orderBy(asc(page.title));
	return rows.map((row) => ({ id: row.id, label: row.title, href: `/${row.slug}` }));
}

export const getPage = (slug: string) =>
	db().query.page.findFirst({
		where: and(eq(page.slug, slug), eq(page.status, 'published')),
		with: { menuItems: { orderBy: asc(pageMenuItem.sortOrder) } }
	});

/** The pinned article, or the newest one when nothing is pinned */
export async function getFeatured() {
	const [pinned] = await selectCards()
		.where(and(isPublished(), eq(article.featured, true)))
		.orderBy(desc(article.publishedAt))
		.limit(1);
	if (pinned) return toCard(pinned);
	const [latest] = await selectCards()
		.where(isPublished())
		.orderBy(desc(article.publishedAt))
		.limit(1);
	return latest ? toCard(latest) : null;
}

/** Newest first, `pageSize` per page. Returns `null` for a page past the end. */
export async function getFeed({
	page: pageNumber,
	categoryId,
	excludeId
}: {
	page: number;
	categoryId?: string;
	excludeId?: string;
}): Promise<Paged<ArticleCard> | null> {
	const filters: (SQL | undefined)[] = [isPublished()];
	if (categoryId) filters.push(eq(article.categoryId, categoryId));
	if (excludeId) filters.push(ne(article.id, excludeId));
	const where = and(...filters);

	const [[{ total }], rows] = await Promise.all([
		db().select({ total: count() }).from(article).where(where),
		selectCards()
			.where(where)
			.orderBy(desc(article.publishedAt))
			.limit(pageSize)
			.offset((pageNumber - 1) * pageSize)
	]);
	const pages = Math.max(1, Math.ceil(total / pageSize));
	if (pageNumber > pages) return null;
	return { items: rows.map(toCard), page: pageNumber, pages, total };
}

export type ArticleDetail = NonNullable<Awaited<ReturnType<typeof loadArticle>>>;

export type ArticleResult =
	{ found: true; article: ArticleDetail } | { found: false; redirectTo: string | null };

const loadArticle = async (slug: string) => {
	const [row] = await db()
		.select({
			...cardColumns,
			body: article.body,
			updatedAt: article.updatedAt,
			categoryId: article.categoryId
		})
		.from(article)
		.innerJoin(category, eq(category.id, article.categoryId))
		.leftJoin(media, eq(media.id, article.coverId))
		.where(and(isPublished(), eq(article.slug, slug)))
		.limit(1);
	if (!row) return null;
	return {
		...toCard(row),
		lead: row.lead,
		body: row.body,
		updatedAt: row.updatedAt,
		categoryId: row.categoryId
	};
};

/** A published article by slug, or where an old slug of it now lives */
export async function getArticle(slug: string): Promise<ArticleResult> {
	const found = await loadArticle(slug);
	if (found) return { found: true, article: found };

	const [moved] = await db()
		.select({ slug: article.slug })
		.from(articleSlugRedirect)
		.innerJoin(article, eq(article.id, articleSlugRedirect.articleId))
		.where(and(eq(articleSlugRedirect.slug, slug), isPublished()))
		.limit(1);
	return { found: false, redirectTo: moved?.slug ?? null };
}

/** The newest articles, for feeds */
export async function getLatest(limit: number) {
	const rows = await selectCards()
		.where(isPublished())
		.orderBy(desc(article.publishedAt))
		.limit(limit);
	return rows.map(toCard);
}

/** Recent articles from the same category */
export async function getRelated(articleId: string, categoryId: string, limit = 4) {
	const rows = await selectCards()
		.where(and(isPublished(), eq(article.categoryId, categoryId), ne(article.id, articleId)))
		.orderBy(desc(article.publishedAt))
		.limit(limit);
	return rows.map(toCard);
}

/** Most viewed articles over the last `days` days */
export async function getMostRead(days = 30, limit = 5) {
	const since = lisbonDay(new Date(Date.now() - days * 24 * 60 * 60 * 1000));
	const views = sql<number>`sum(${articleViewDaily.views})`;
	const top = await db()
		.select({ articleId: articleViewDaily.articleId, views })
		.from(articleViewDaily)
		.where(gte(articleViewDaily.day, since))
		.groupBy(articleViewDaily.articleId)
		.orderBy(desc(views))
		.limit(limit * 2);
	if (!top.length) return [];

	const rows = await selectCards().where(
		and(
			isPublished(),
			inArray(
				article.id,
				top.map((row) => row.articleId)
			)
		)
	);
	const byId = new Map(rows.map((row) => [row.id, toCard(row)]));
	return top.flatMap((row) => byId.get(row.articleId) ?? []).slice(0, limit);
}

/** Counts a view for "most read". Callers filter out bots. */
export async function recordView(articleId: string) {
	const d1 = env.DB;
	const exists = await d1
		.prepare(`SELECT 1 FROM article WHERE id = ? AND status = 'published' AND published_at <= ?`)
		.bind(articleId, Date.now())
		.first();
	if (!exists) return false;
	await d1.batch([
		d1
			.prepare(
				`INSERT INTO article_view_daily (article_id, day, views) VALUES (?, ?, 1)
				ON CONFLICT (article_id, day) DO UPDATE SET views = views + 1`
			)
			.bind(articleId, lisbonDay()),
		d1.prepare('UPDATE article SET view_count = view_count + 1 WHERE id = ?').bind(articleId)
	]);
	return true;
}

/** Article cards and poll views for a list of `{ kind, id }`, kept in that order */
async function toFeedItems(refs: { kind: string; id: string }[], voted: Set<string>) {
	const articleIds = refs.filter((r) => r.kind === 'article').map((r) => r.id);
	const pollIds = refs.filter((r) => r.kind === 'poll').map((r) => r.id);
	const [rows, polls] = await Promise.all([
		articleIds.length ? selectCards().where(inArray(article.id, articleIds)) : [],
		getPollViews(pollIds, voted)
	]);
	const cards = new Map(rows.map((row) => [row.id, toCard(row)]));
	return refs.flatMap((ref): FeedItem[] => {
		if (ref.kind === 'poll') {
			const poll = polls.get(ref.id);
			return poll ? [{ kind: 'poll', poll }] : [];
		}
		const card = cards.get(ref.id);
		return card ? [{ kind: 'article', article: card }] : [];
	});
}

/**
 * The homepage feed: articles and polls together, newest first, `pageSize` per page.
 * Returns `null` for a page past the end.
 */
export async function getHomeFeed({
	page: pageNumber,
	excludeId,
	voted
}: {
	page: number;
	excludeId?: string;
	voted: Set<string>;
}): Promise<Paged<FeedItem> | null> {
	const d1 = env.DB;
	const now = Date.now();
	const articles = `FROM article WHERE status = 'published' AND published_at <= ?1 AND id != ?2`;
	const polls = `FROM poll WHERE status = 'published' AND published_at <= ?1`;
	const [countResult, refsResult] = await d1.batch<{ total?: number; kind?: string; id?: string }>([
		d1
			.prepare(`SELECT (SELECT count(*) ${articles}) + (SELECT count(*) ${polls}) AS total`)
			.bind(now, excludeId ?? ''),
		d1
			.prepare(
				`SELECT 'article' AS kind, id, published_at ${articles}
				UNION ALL SELECT 'poll' AS kind, id, published_at ${polls}
				ORDER BY published_at DESC LIMIT ?3 OFFSET ?4`
			)
			.bind(now, excludeId ?? '', pageSize, (pageNumber - 1) * pageSize)
	]);
	const total = countResult.results[0]?.total ?? 0;
	const pages = Math.max(1, Math.ceil(total / pageSize));
	if (pageNumber > pages) return null;
	const refs = refsResult.results.map((r) => ({ kind: r.kind!, id: r.id! }));
	return { items: await toFeedItems(refs, voted), page: pageNumber, pages, total };
}

/**
 * Articles and polls matching the query, best match first (title or question counts most,
 * then lead, then body or options)
 */
export async function search(
	query: string,
	pageNumber: number,
	voted: Set<string>
): Promise<Paged<FeedItem>> {
	const match = toMatchQuery(query);
	if (!match) return { items: [], page: 1, pages: 1, total: 0 };

	const d1 = env.DB;
	const now = Date.now();
	const from = `FROM search_index s
		LEFT JOIN article a ON s.kind = 'article' AND a.id = s.ref_id
		LEFT JOIN poll p ON s.kind = 'poll' AND p.id = s.ref_id
		WHERE search_index MATCH ?1 AND (
			(a.status = 'published' AND a.published_at <= ?2) OR
			(p.status = 'published' AND p.published_at <= ?2)
		)`;
	const [countResult, refsResult] = await d1.batch<{ total?: number; kind?: string; id?: string }>([
		d1.prepare(`SELECT count(*) AS total ${from}`).bind(match, now),
		d1
			.prepare(
				`SELECT s.kind AS kind, s.ref_id AS id ${from}
				ORDER BY bm25(search_index, 0, 0, 10, 4, 1), coalesce(a.published_at, p.published_at) DESC
				LIMIT ?3 OFFSET ?4`
			)
			.bind(match, now, pageSize, (pageNumber - 1) * pageSize)
	]);
	const total = countResult.results[0]?.total ?? 0;
	const pages = Math.max(1, Math.ceil(total / pageSize));
	const refs = refsResult.results.map((r) => ({ kind: r.kind!, id: r.id! }));
	return { items: await toFeedItems(refs, voted), page: pageNumber, pages, total };
}
