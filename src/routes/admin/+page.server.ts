import { and, count, desc, eq, gt, lte } from 'drizzle-orm';
import { countReportedComments } from '#lib/server/comments.ts';
import { countUnreadMessages } from '#lib/server/contact.ts';
import { db } from '#lib/server/db/worker.ts';
import { countSubscriptions } from '#lib/server/push.ts';
import { article, media } from '#lib/server/db/schema.ts';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const now = new Date();
	const total = (where?: ReturnType<typeof and>) =>
		db()
			.select({ total: count() })
			.from(article)
			.where(where)
			.then(([row]) => row.total);

	const [published, scheduled, drafts, images, reported, unread, subscribers, recent] =
		await Promise.all([
			total(and(eq(article.status, 'published'), lte(article.publishedAt, now))),
			total(and(eq(article.status, 'published'), gt(article.publishedAt, now))),
			total(eq(article.status, 'draft')),
			db()
				.select({ total: count() })
				.from(media)
				.then(([row]) => row.total),
			countReportedComments(),
			// The inbox is for admins
			locals.user?.role === 'admin' ? countUnreadMessages() : null,
			countSubscriptions(),
			db()
				.select({
					id: article.id,
					title: article.title,
					status: article.status,
					publishedAt: article.publishedAt,
					updatedAt: article.updatedAt
				})
				.from(article)
				.orderBy(desc(article.updatedAt))
				.limit(8)
		]);
	return {
		counts: { published, scheduled, drafts, images, reported, unread, subscribers },
		recent
	};
};
