import { env } from 'cloudflare:workers';
import { MEDIA_BASE_URL } from '$app/env/public';
import { and, count, desc, eq, gt, like, lte, ne, or, sql, type SQL } from 'drizzle-orm';
import { fromLisbonInput } from '#lib/format.ts';
import { resolveMediaUrls, unresolveMediaUrls } from '#lib/media.ts';
import { slugify } from '#lib/slug.ts';
import { uniqueSlug } from './admin.ts';
import { background } from './background.ts';
import { db } from './db/worker.ts';
import { article, articleSlugRedirect, category, media } from './db/schema.ts';
import { sanitizeRichText } from './sanitize.ts';
import { dispatchDuePushes } from './push.ts';
import { indexStatements, removeFromIndex } from './search.ts';

/** Articles in the backoffice: listing, editing and saving */

export const adminPageSize = 30;

export type StatusFilter = 'draft' | 'scheduled' | 'published' | '';

export async function listArticles({
	page,
	query,
	status,
	categoryId
}: {
	page: number;
	query: string;
	status: StatusFilter;
	categoryId: string;
}) {
	const now = new Date();
	const filters: (SQL | undefined)[] = [];
	if (query) filters.push(or(like(article.title, `%${query}%`), like(article.slug, `%${query}%`)));
	if (categoryId) filters.push(eq(article.categoryId, categoryId));
	if (status === 'draft') filters.push(eq(article.status, 'draft'));
	if (status === 'scheduled')
		filters.push(and(eq(article.status, 'published'), gt(article.publishedAt, now)));
	if (status === 'published')
		filters.push(and(eq(article.status, 'published'), lte(article.publishedAt, now)));
	const where = and(...filters);

	const [[{ total }], items] = await Promise.all([
		db().select({ total: count() }).from(article).where(where),
		db()
			.select({
				id: article.id,
				slug: article.slug,
				title: article.title,
				status: article.status,
				publishedAt: article.publishedAt,
				updatedAt: article.updatedAt,
				featured: article.featured,
				viewCount: article.viewCount,
				categoryName: category.name
			})
			.from(article)
			.innerJoin(category, eq(category.id, article.categoryId))
			.where(where)
			// Drafts (no date) first, then newest
			.orderBy(
				desc(sql`${article.publishedAt} is null`),
				desc(article.publishedAt),
				desc(article.updatedAt)
			)
			.limit(adminPageSize)
			.offset((page - 1) * adminPageSize)
	]);
	return { items, total, page, pages: Math.max(1, Math.ceil(total / adminPageSize)) };
}

export async function getArticleForEdit(id: string) {
	const found = await db().query.article.findFirst({
		where: eq(article.id, id),
		with: { cover: true }
	});
	if (!found) return null;
	// The editor shows images, so their URLs need the media host
	return { ...found, body: resolveMediaUrls(found.body, MEDIA_BASE_URL) };
}

export interface ArticleInput {
	title: string;
	slug: string;
	lead: string;
	body: string;
	categoryId: string;
	coverId: string;
	publishedAt: string;
	featured: boolean;
	sendPush: boolean;
	publish: boolean;
}

export type ArticleErrors = Partial<Record<keyof ArticleInput, string>>;

export function readArticleForm(form: FormData): ArticleInput {
	const text = (name: string) => form.get(name)?.toString().trim() ?? '';
	return {
		title: text('title'),
		slug: text('slug'),
		lead: text('lead'),
		body: form.get('body')?.toString() ?? '',
		categoryId: text('categoryId'),
		coverId: text('coverId'),
		publishedAt: text('publishedAt'),
		featured: form.get('featured') === 'on',
		sendPush: form.get('sendPush') === 'on',
		publish: form.get('intent') === 'publish'
	};
}

async function validate(input: ArticleInput) {
	const errors: ArticleErrors = {};
	if (!input.title) errors.title = 'required';
	if (input.title.length > 200) errors.title = 'too_long';
	if (input.lead.length > 400) errors.lead = 'too_long';
	if (input.publishedAt && !fromLisbonInput(input.publishedAt)) errors.publishedAt = 'invalid';
	const [cat] = input.categoryId
		? await db().select({ id: category.id }).from(category).where(eq(category.id, input.categoryId))
		: [];
	if (!cat) errors.categoryId = 'required';
	if (input.coverId) {
		const [cover] = await db()
			.select({ id: media.id })
			.from(media)
			.where(eq(media.id, input.coverId));
		if (!cover) errors.coverId = 'invalid';
	}
	return errors;
}

/**
 * Creates (`id` null) or updates an article. Returns validation errors, or the saved id.
 * Also keeps the old slug redirecting, the single featured article, and the search index in sync.
 */
export async function saveArticle(
	id: string | null,
	input: ArticleInput,
	userId: string
): Promise<{ errors: ArticleErrors } | { id: string; slug: string }> {
	const errors = await validate(input);
	if (Object.keys(errors).length) return { errors };

	const existing = id ? await db().query.article.findFirst({ where: eq(article.id, id) }) : null;
	const slug = await uniqueSlug(article, slugify(input.slug) || input.title, id ?? undefined);
	const body = sanitizeRichText(unresolveMediaUrls(input.body, MEDIA_BASE_URL));
	const publishedAt = fromLisbonInput(input.publishedAt) ?? (input.publish ? new Date() : null);

	const values = {
		title: input.title,
		slug,
		lead: input.lead || null,
		body,
		categoryId: input.categoryId,
		coverId: input.coverId || null,
		status: input.publish ? ('published' as const) : ('draft' as const),
		publishedAt,
		featured: input.featured,
		sendPush: input.sendPush,
		updatedById: userId
	};

	let savedId: string;
	if (existing) {
		await db().update(article).set(values).where(eq(article.id, existing.id));
		savedId = existing.id;
		// Readers (and search engines) may know the old address of a published article
		const wasPublic =
			existing.status === 'published' && existing.publishedAt && existing.publishedAt <= new Date();
		if (existing.slug !== slug && wasPublic) {
			await db()
				.insert(articleSlugRedirect)
				.values({ slug: existing.slug, articleId: existing.id })
				.onConflictDoUpdate({ target: articleSlugRedirect.slug, set: { articleId: existing.id } });
		}
	} else {
		const [row] = await db()
			.insert(article)
			.values({ ...values, createdById: userId })
			.returning({ id: article.id });
		savedId = row.id;
	}

	// The new slug is the article's own now, not a redirect (e.g. after renaming back)
	await db().delete(articleSlugRedirect).where(eq(articleSlugRedirect.slug, slug));
	// Only one featured article at a time
	if (input.featured) {
		await db()
			.update(article)
			.set({ featured: false })
			.where(and(eq(article.featured, true), ne(article.id, savedId)));
	}
	await env.DB.batch(
		indexStatements(env.DB, 'article', [
			{ id: savedId, title: values.title, lead: values.lead, body }
		])
	);
	// Starts the new-article notification if this save made one due
	if (values.sendPush) background(dispatchDuePushes());
	return { id: savedId, slug };
}

export async function deleteArticle(id: string) {
	await db().delete(article).where(eq(article.id, id));
	await removeFromIndex(env.DB, 'article', id);
}
