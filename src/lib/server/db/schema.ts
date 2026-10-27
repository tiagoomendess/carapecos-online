import { relations, sql } from 'drizzle-orm';
import { check, index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { user } from './auth.schema';

const id = () =>
	text('id')
		.primaryKey()
		.$defaultFn(() => crypto.randomUUID());

const createdAt = () =>
	integer('created_at', { mode: 'timestamp_ms' })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.notNull();

const updatedAt = () =>
	integer('updated_at', { mode: 'timestamp_ms' })
		.default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
		.$onUpdate(() => new Date())
		.notNull();

/** Draft content is only visible in the backoffice. Published content with a future `publishedAt` is scheduled. */
export const contentStatus = ['draft', 'published'] as const;
export type ContentStatus = (typeof contentStatus)[number];

export const category = sqliteTable('category', {
	id: id(),
	name: text('name').notNull(),
	slug: text('slug').notNull().unique(),
	description: text('description'),
	sortOrder: integer('sort_order').notNull().default(0),
	createdAt: createdAt(),
	updatedAt: updatedAt()
});

/**
 * An uploaded image, stored as `{key}/original.{ext}` with resized variants as `{key}/{width}.webp`.
 * Article bodies reference images by root-relative path (`/media/...`); see `resolveMediaUrls`.
 */
export const media = sqliteTable('media', {
	id: id(),
	key: text('key').notNull().unique(),
	originalName: text('original_name'),
	/** Where an imported image was downloaded from, so the importer doesn't store it twice */
	sourceUrl: text('source_url').unique(),
	mimeType: text('mime_type').notNull(),
	width: integer('width').notNull(),
	height: integer('height').notNull(),
	/** Widths generated as WebP, e.g. [480, 960, 1600] */
	variants: text('variants', { mode: 'json' }).$type<number[]>().notNull().default([]),
	alt: text('alt'),
	uploadedById: text('uploaded_by_id').references(() => user.id, { onDelete: 'set null' }),
	createdAt: createdAt()
});

export const article = sqliteTable(
	'article',
	{
		id: id(),
		slug: text('slug').notNull().unique(),
		title: text('title').notNull(),
		lead: text('lead'),
		/** Sanitized HTML from the rich-text editor */
		body: text('body').notNull().default(''),
		coverId: text('cover_id').references(() => media.id, { onDelete: 'set null' }),
		categoryId: text('category_id')
			.notNull()
			.references(() => category.id),
		status: text('status', { enum: contentStatus }).notNull().default('draft'),
		publishedAt: integer('published_at', { mode: 'timestamp_ms' }),
		featured: integer('featured', { mode: 'boolean' }).notNull().default(false),
		sendPush: integer('send_push', { mode: 'boolean' }).notNull().default(false),
		/** When the new-article notification finished sending (it goes out in batches) */
		pushSentAt: integer('push_sent_at', { mode: 'timestamp_ms' }),
		/** Last subscription endpoint the notification was sent to, while sending */
		pushCursor: text('push_cursor'),
		viewCount: integer('view_count').notNull().default(0),
		/** Article id on the old BlogTok site, used for redirects */
		legacyId: integer('legacy_id').unique(),
		createdById: text('created_by_id').references(() => user.id, { onDelete: 'set null' }),
		updatedById: text('updated_by_id').references(() => user.id, { onDelete: 'set null' }),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(table) => [
		index('article_feed_idx').on(table.status, table.publishedAt),
		index('article_category_idx').on(table.categoryId, table.publishedAt)
	]
);

/** Old slugs that 301-redirect to an article after its slug changed */
export const articleSlugRedirect = sqliteTable('article_slug_redirect', {
	slug: text('slug').primaryKey(),
	articleId: text('article_id')
		.notNull()
		.references(() => article.id, { onDelete: 'cascade' })
});

/** Daily view counts, for the "most read in the last 30 days" list */
export const articleViewDaily = sqliteTable(
	'article_view_daily',
	{
		articleId: text('article_id')
			.notNull()
			.references(() => article.id, { onDelete: 'cascade' }),
		/** YYYY-MM-DD */
		day: text('day').notNull(),
		views: integer('views').notNull().default(0)
	},
	(table) => [
		primaryKey({ columns: [table.articleId, table.day] }),
		index('article_view_daily_day_idx').on(table.day)
	]
);

export const poll = sqliteTable(
	'poll',
	{
		id: id(),
		slug: text('slug').notNull().unique(),
		question: text('question').notNull(),
		multipleChoice: integer('multiple_choice', { mode: 'boolean' }).notNull().default(false),
		status: text('status', { enum: contentStatus }).notNull().default('draft'),
		publishedAt: integer('published_at', { mode: 'timestamp_ms' }),
		closesAt: integer('closes_at', { mode: 'timestamp_ms' }),
		createdById: text('created_by_id').references(() => user.id, { onDelete: 'set null' }),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(table) => [index('poll_feed_idx').on(table.status, table.publishedAt)]
);

export const pollOption = sqliteTable(
	'poll_option',
	{
		id: id(),
		pollId: text('poll_id')
			.notNull()
			.references(() => poll.id, { onDelete: 'cascade' }),
		label: text('label').notNull(),
		sortOrder: integer('sort_order').notNull().default(0)
	},
	(table) => [index('poll_option_poll_idx').on(table.pollId)]
);

/**
 * One row per chosen option; the rows of one vote share a `ballotId` (multiple-choice polls).
 * `voterHash` is a salted hash of IP + user agent, for rate limiting; raw IPs are never stored.
 */
export const pollVote = sqliteTable(
	'poll_vote',
	{
		id: id(),
		pollId: text('poll_id')
			.notNull()
			.references(() => poll.id, { onDelete: 'cascade' }),
		optionId: text('option_id')
			.notNull()
			.references(() => pollOption.id, { onDelete: 'cascade' }),
		ballotId: text('ballot_id').notNull().default(''),
		voterHash: text('voter_hash').notNull(),
		createdAt: createdAt()
	},
	(table) => [
		index('poll_vote_option_idx').on(table.optionId),
		index('poll_vote_ballot_idx').on(table.pollId, table.ballotId),
		index('poll_vote_voter_idx').on(table.pollId, table.voterHash)
	]
);

export const commentStatus = ['visible', 'hidden'] as const;

export const comment = sqliteTable(
	'comment',
	{
		id: id(),
		articleId: text('article_id').references(() => article.id, { onDelete: 'cascade' }),
		pollId: text('poll_id').references(() => poll.id, { onDelete: 'cascade' }),
		/** Set on replies. Replies to a reply point at the top-level comment, so threads are one level deep. */
		parentId: text('parent_id'),
		authorName: text('author_name').notNull(),
		body: text('body').notNull(),
		status: text('status', { enum: commentStatus }).notNull().default('visible'),
		reportCount: integer('report_count').notNull().default(0),
		ipHash: text('ip_hash').notNull(),
		createdAt: createdAt()
	},
	(table) => [
		index('comment_article_idx').on(table.articleId, table.createdAt),
		index('comment_poll_idx').on(table.pollId, table.createdAt),
		index('comment_ip_idx').on(table.ipHash, table.createdAt),
		index('comment_reported_idx').on(table.reportCount),
		check('comment_one_target', sql`(${table.articleId} is null) != (${table.pollId} is null)`)
	]
);

export const page = sqliteTable('page', {
	id: id(),
	slug: text('slug').notNull().unique(),
	title: text('title').notNull(),
	body: text('body').notNull().default(''),
	showInFooter: integer('show_in_footer', { mode: 'boolean' }).notNull().default(false),
	showInMenu: integer('show_in_menu', { mode: 'boolean' }).notNull().default(false),
	status: text('status', { enum: contentStatus }).notNull().default('draft'),
	createdAt: createdAt(),
	updatedAt: updatedAt()
});

/** Extra links on a page, shown in the homepage menu with that page */
export const pageMenuItem = sqliteTable(
	'page_menu_item',
	{
		id: id(),
		pageId: text('page_id')
			.notNull()
			.references(() => page.id, { onDelete: 'cascade' }),
		label: text('label').notNull(),
		href: text('href').notNull(),
		sortOrder: integer('sort_order').notNull().default(0)
	},
	(table) => [index('page_menu_item_page_idx').on(table.pageId)]
);

export const contactMessage = sqliteTable('contact_message', {
	id: id(),
	name: text('name').notNull(),
	email: text('email').notNull(),
	message: text('message').notNull(),
	ipHash: text('ip_hash').notNull(),
	readAt: integer('read_at', { mode: 'timestamp_ms' }),
	createdAt: createdAt()
});

export const pushSubscription = sqliteTable('push_subscription', {
	endpoint: text('endpoint').primaryKey(),
	p256dh: text('p256dh').notNull(),
	auth: text('auth').notNull(),
	createdAt: createdAt()
});

export const categoryRelations = relations(category, ({ many }) => ({
	articles: many(article)
}));

export const articleRelations = relations(article, ({ one, many }) => ({
	category: one(category, { fields: [article.categoryId], references: [category.id] }),
	cover: one(media, { fields: [article.coverId], references: [media.id] }),
	comments: many(comment)
}));

export const pollRelations = relations(poll, ({ many }) => ({
	options: many(pollOption),
	comments: many(comment)
}));

export const pollOptionRelations = relations(pollOption, ({ one }) => ({
	poll: one(poll, { fields: [pollOption.pollId], references: [poll.id] })
}));

export const commentRelations = relations(comment, ({ one }) => ({
	article: one(article, { fields: [comment.articleId], references: [article.id] }),
	poll: one(poll, { fields: [comment.pollId], references: [poll.id] })
}));

export const pageRelations = relations(page, ({ many }) => ({
	menuItems: many(pageMenuItem)
}));

export const pageMenuItemRelations = relations(pageMenuItem, ({ one }) => ({
	page: one(page, { fields: [pageMenuItem.pageId], references: [page.id] })
}));

export * from './auth.schema';
