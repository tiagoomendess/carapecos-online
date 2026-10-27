import type { RequestEvent } from '@sveltejs/kit';
import { and, asc, count, desc, eq, gt, inArray, sql } from 'drizzle-orm';
import type { CommentView } from '#lib/types.ts';
import { db } from './db/worker.ts';
import { article, comment, poll } from './db/schema.ts';
import { countLinks, hasBlockedWords, maxLinksPerComment } from './moderation.ts';
import { verifyTurnstile, visitorHash } from './visitor.ts';

/**
 * Reader comments: published right away, one level of replies, moderated afterwards
 * (hidden, deleted, or reported by readers for editors to check).
 */

/** Per IP: a burst limit and a daily limit */
const limits = [
	{ windowMs: 10 * 60 * 1000, max: 5 },
	{ windowMs: 24 * 60 * 60 * 1000, max: 30 }
];

/** A comment belongs to either an article or a poll, never both */
export type CommentTarget = { articleId: string } | { pollId: string };

const onTarget = (target: CommentTarget) =>
	'articleId' in target ? eq(comment.articleId, target.articleId) : eq(comment.pollId, target.pollId);

export async function getComments(target: CommentTarget): Promise<CommentView[]> {
	const rows = await db()
		.select({
			id: comment.id,
			parentId: comment.parentId,
			authorName: comment.authorName,
			body: comment.body,
			createdAt: comment.createdAt
		})
		.from(comment)
		.where(and(onTarget(target), eq(comment.status, 'visible')))
		.orderBy(asc(comment.createdAt));

	const threads = new Map<string, CommentView>();
	for (const row of rows) {
		if (!row.parentId) threads.set(row.id, { ...row, replies: [] });
	}
	for (const row of rows) {
		// A reply whose thread was hidden is hidden with it
		if (row.parentId) threads.get(row.parentId)?.replies.push(row);
	}
	return [...threads.values()];
}

export type CommentError =
	'name' | 'body' | 'too_many_links' | 'blocked_words' | 'bot' | 'rate_limited' | 'not_found';

export interface CommentInput {
	name: string;
	body: string;
	parentId: string;
	token: string;
}

export const readCommentForm = (form: FormData): CommentInput => ({
	name: form.get('name')?.toString().trim().replace(/\s+/g, ' ') ?? '',
	body:
		form
			.get('body')
			?.toString()
			.trim()
			.replace(/\n{3,}/g, '\n\n') ?? '',
	parentId: form.get('parentId')?.toString() ?? '',
	token: form.get('cf-turnstile-response')?.toString() ?? ''
});

export async function addComment(
	event: RequestEvent,
	target: CommentTarget,
	input: CommentInput
): Promise<{ ok: true; id: string } | { ok: false; error: CommentError }> {
	if (input.name.length < 2 || input.name.length > 60) return { ok: false, error: 'name' };
	if (input.body.length < 2 || input.body.length > 2000) return { ok: false, error: 'body' };
	if (countLinks(input.body) > maxLinksPerComment) return { ok: false, error: 'too_many_links' };
	if (hasBlockedWords(`${input.name} ${input.body}`)) return { ok: false, error: 'blocked_words' };

	if (!(await verifyTurnstile(input.token, event))) return { ok: false, error: 'bot' };

	const ipHash = await visitorHash(event, 'comment');
	for (const limit of limits) {
		const [{ recent }] = await db()
			.select({ recent: count() })
			.from(comment)
			.where(
				and(
					eq(comment.ipHash, ipHash),
					gt(comment.createdAt, new Date(Date.now() - limit.windowMs))
				)
			);
		if (recent >= limit.max) return { ok: false, error: 'rate_limited' };
	}

	// Replies attach to the top-level comment: threads are one level deep
	let parentId: string | null = null;
	if (input.parentId) {
		const parent = await db().query.comment.findFirst({
			columns: { id: true, parentId: true },
			where: and(eq(comment.id, input.parentId), onTarget(target))
		});
		if (!parent) return { ok: false, error: 'not_found' };
		parentId = parent.parentId ?? parent.id;
	}

	const [row] = await db()
		.insert(comment)
		.values({
			articleId: 'articleId' in target ? target.articleId : null,
			pollId: 'pollId' in target ? target.pollId : null,
			parentId,
			authorName: input.name,
			body: input.body,
			ipHash
		})
		.returning({ id: comment.id });
	return { ok: true, id: row.id };
}

/** A reader flags a comment for editors */
export const reportComment = (id: string) =>
	db()
		.update(comment)
		.set({ reportCount: sql`${comment.reportCount} + 1` })
		.where(and(eq(comment.id, id), eq(comment.status, 'visible')));

/* Backoffice */

export const moderationPageSize = 40;

export type CommentFilter = 'reported' | 'hidden' | '';

export async function listCommentsForModeration(filter: CommentFilter, page: number) {
	const where =
		filter === 'reported'
			? and(gt(comment.reportCount, 0), eq(comment.status, 'visible'))
			: filter === 'hidden'
				? eq(comment.status, 'hidden')
				: undefined;
	const [[{ total }], items] = await Promise.all([
		db().select({ total: count() }).from(comment).where(where),
		db()
			.select({
				id: comment.id,
				parentId: comment.parentId,
				authorName: comment.authorName,
				body: comment.body,
				status: comment.status,
				reportCount: comment.reportCount,
				createdAt: comment.createdAt,
				articleTitle: article.title,
				articleSlug: article.slug,
				pollQuestion: poll.question,
				pollSlug: poll.slug
			})
			.from(comment)
			.leftJoin(article, eq(article.id, comment.articleId))
			.leftJoin(poll, eq(poll.id, comment.pollId))
			.where(where)
			// Reported first, then newest
			.orderBy(
				desc(sql`${comment.reportCount} > 0 and ${comment.status} = 'visible'`),
				desc(comment.createdAt)
			)
			.limit(moderationPageSize)
			.offset((page - 1) * moderationPageSize)
	]);
	return { items, total, page, pages: Math.max(1, Math.ceil(total / moderationPageSize)) };
}

export const countReportedComments = () =>
	db()
		.select({ total: count() })
		.from(comment)
		.where(and(gt(comment.reportCount, 0), eq(comment.status, 'visible')))
		.then(([row]) => row.total);

/** Hide or show; hiding a comment also hides its replies on the site */
export const setCommentStatus = (id: string, status: 'visible' | 'hidden') =>
	db()
		.update(comment)
		.set({ status, ...(status === 'visible' ? { reportCount: 0 } : {}) })
		.where(eq(comment.id, id));

/** Clears the reports of a comment an editor decided to keep */
export const dismissReports = (id: string) =>
	db().update(comment).set({ reportCount: 0 }).where(eq(comment.id, id));

/** Deletes a comment and its replies */
export async function deleteComment(id: string) {
	const replies = await db()
		.select({ id: comment.id })
		.from(comment)
		.where(eq(comment.parentId, id));
	await db()
		.delete(comment)
		.where(inArray(comment.id, [id, ...replies.map((r) => r.id)]));
}

export const commentCounts = async (articleIds: string[]) => {
	if (!articleIds.length) return new Map<string, number>();
	const rows = await db()
		.select({ articleId: comment.articleId, total: count() })
		.from(comment)
		.where(and(inArray(comment.articleId, articleIds), eq(comment.status, 'visible')))
		.groupBy(comment.articleId);
	return new Map(rows.flatMap((r) => (r.articleId ? [[r.articleId, r.total] as const] : [])));
};
