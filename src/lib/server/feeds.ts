import { and, desc, eq, gte, lte } from 'drizzle-orm';
import { db } from './db/worker.ts';
import { article, category, page, poll } from './db/schema.ts';

/** Data for sitemaps, RSS and llms.txt. Only published content. */

const publishedArticle = () =>
	and(eq(article.status, 'published'), lte(article.publishedAt, new Date()));

export const sitemapEntries = async () => {
	const [articles, categories, pages, polls] = await Promise.all([
		db()
			.select({
				slug: article.slug,
				updatedAt: article.updatedAt,
				publishedAt: article.publishedAt
			})
			.from(article)
			.where(publishedArticle())
			.orderBy(desc(article.publishedAt)),
		db().select({ slug: category.slug, updatedAt: category.updatedAt }).from(category),
		db()
			.select({ slug: page.slug, updatedAt: page.updatedAt })
			.from(page)
			.where(eq(page.status, 'published')),
		db()
			.select({ slug: poll.slug, updatedAt: poll.updatedAt })
			.from(poll)
			.where(and(eq(poll.status, 'published'), lte(poll.publishedAt, new Date())))
	]);
	return { articles, categories, pages, polls };
};

/** Articles from the last two days, as Google News sitemaps expect */
export const recentNews = () =>
	db()
		.select({ slug: article.slug, title: article.title, publishedAt: article.publishedAt })
		.from(article)
		.where(
			and(
				publishedArticle(),
				gte(article.publishedAt, new Date(Date.now() - 2 * 24 * 60 * 60 * 1000))
			)
		)
		.orderBy(desc(article.publishedAt))
		.limit(1000);

/** Escapes text for XML content and attributes */
export const xml = (text: string) =>
	text.replace(
		/[<>&"']/g,
		(c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&apos;' })[c]!
	);

export const feedHeaders = (contentType: string) => ({
	'content-type': contentType,
	// Fresh enough for news, cheap for crawlers
	'cache-control': 'public, max-age=600'
});
