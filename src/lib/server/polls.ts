import { env } from 'cloudflare:workers';
import type { Cookies, RequestEvent } from '@sveltejs/kit';
import { and, asc, count, countDistinct, desc, eq, gt, inArray, lte, sql } from 'drizzle-orm';
import { fromLisbonInput } from '#lib/format.ts';
import { slugify } from '#lib/slug.ts';
import type { PollView } from '#lib/types.ts';
import { uniqueSlug } from './admin.ts';
import { db } from './db/worker.ts';
import { poll, pollOption, pollVote } from './db/schema.ts';
import { indexStatements, removeFromIndex } from './search.ts';
import { verifyTurnstile, visitorHash } from './visitor.ts';

/**
 * Polls: anonymous votes with best-effort fraud protection (see DRAFT.md). One vote per
 * browser, remembered in a cookie (and localStorage on the page); Turnstile on every vote; and
 * a rate limit per salted hash of IP + user agent, so one connection can't vote endlessly.
 */

const votedCookie = 'sondagens';
const maxRemembered = 80;
/** Ballots a single IP + user agent may cast per poll per day (households share an IP) */
const maxBallotsPerVisitor = 5;

const shortId = (id: string) => id.replaceAll('-', '').slice(0, 12);

/** Polls this browser voted in (short ids from the cookie) */
export const votedPolls = (cookies: Cookies) =>
	new Set((cookies.get(votedCookie) ?? '').split('.').filter(Boolean));

function markVoted(cookies: Cookies, pollId: string) {
	const ids = [...votedPolls(cookies), shortId(pollId)].slice(-maxRemembered);
	cookies.set(votedCookie, ids.join('.'), {
		path: '/',
		maxAge: 60 * 60 * 24 * 365 * 2,
		httpOnly: true,
		sameSite: 'lax'
	});
}

const isPublished = () => and(eq(poll.status, 'published'), lte(poll.publishedAt, new Date()));

/** Public views of the given polls (published only), keyed by id */
async function loadViews(where: ReturnType<typeof and>, voted: Set<string>) {
	const polls = await db().select().from(poll).where(and(isPublished(), where));
	if (!polls.length) return new Map<string, PollView>();
	const ids = polls.map((p) => p.id);

	const [options, votes, voters] = await Promise.all([
		db()
			.select()
			.from(pollOption)
			.where(inArray(pollOption.pollId, ids))
			.orderBy(asc(pollOption.sortOrder)),
		db()
			.select({ optionId: pollVote.optionId, votes: count() })
			.from(pollVote)
			.where(inArray(pollVote.pollId, ids))
			.groupBy(pollVote.optionId),
		db()
			.select({ pollId: pollVote.pollId, voters: countDistinct(pollVote.ballotId) })
			.from(pollVote)
			.where(inArray(pollVote.pollId, ids))
			.groupBy(pollVote.pollId)
	]);
	const votesByOption = new Map(votes.map((v) => [v.optionId, v.votes]));
	const votersByPoll = new Map(voters.map((v) => [v.pollId, v.voters]));
	const now = new Date();

	return new Map(
		polls.map((p): [string, PollView] => {
			const closed = !!p.closesAt && p.closesAt <= now;
			const hasVoted = voted.has(shortId(p.id));
			const showResults = closed || hasVoted;
			return [
				p.id,
				{
					id: p.id,
					slug: p.slug,
					question: p.question,
					multipleChoice: p.multipleChoice,
					publishedAt: p.publishedAt ?? new Date(0),
					closesAt: p.closesAt,
					closed,
					voted: hasVoted,
					showResults,
					options: options
						.filter((o) => o.pollId === p.id)
						.map((o) => ({
							id: o.id,
							label: o.label,
							votes: showResults ? (votesByOption.get(o.id) ?? 0) : null
						})),
					voters: showResults ? (votersByPoll.get(p.id) ?? 0) : null
				}
			];
		})
	);
}

export const getPollViews = (ids: string[], voted: Set<string>) =>
	ids.length
		? loadViews(inArray(poll.id, ids), voted)
		: Promise.resolve(new Map<string, PollView>());

export async function getPollBySlug(slug: string, voted: Set<string>) {
	const views = await loadViews(eq(poll.slug, slug), voted);
	return [...views.values()][0] ?? null;
}

/** Polls embedded in an article body, keyed by slug */
export async function getPollsBySlugs(slugs: string[], voted: Set<string>) {
	if (!slugs.length) return new Map<string, PollView>();
	const views = await loadViews(inArray(poll.slug, slugs), voted);
	return new Map([...views.values()].map((v) => [v.slug, v]));
}

export type VoteError =
	'not_found' | 'closed' | 'already_voted' | 'choose' | 'bot' | 'rate_limited';

/** Records a vote from a form (`option` fields plus the Turnstile token) */
export async function castVote(
	event: RequestEvent,
	slug: string,
	form: FormData
): Promise<{ ok: true } | { ok: false; error: VoteError }> {
	const found = await db().query.poll.findFirst({
		where: and(eq(poll.slug, slug), isPublished()),
		with: { options: true }
	});
	if (!found) return { ok: false, error: 'not_found' };
	if (found.closesAt && found.closesAt <= new Date()) return { ok: false, error: 'closed' };
	if (votedPolls(event.cookies).has(shortId(found.id))) {
		return { ok: false, error: 'already_voted' };
	}

	const validIds = new Set(found.options.map((o) => o.id));
	const chosen = [...new Set(form.getAll('option').map(String))].filter((id) => validIds.has(id));
	if (!chosen.length || (!found.multipleChoice && chosen.length > 1)) {
		return { ok: false, error: 'choose' };
	}

	if (!(await verifyTurnstile(form.get('cf-turnstile-response')?.toString() ?? '', event))) {
		return { ok: false, error: 'bot' };
	}

	const voterHash = await visitorHash(event, `poll:${found.id}`, { withUserAgent: true });
	const [{ ballots }] = await db()
		.select({ ballots: countDistinct(pollVote.ballotId) })
		.from(pollVote)
		.where(
			and(
				eq(pollVote.pollId, found.id),
				eq(pollVote.voterHash, voterHash),
				gt(pollVote.createdAt, new Date(Date.now() - 24 * 60 * 60 * 1000))
			)
		);
	if (ballots >= maxBallotsPerVisitor) return { ok: false, error: 'rate_limited' };

	const ballotId = crypto.randomUUID();
	await db()
		.insert(pollVote)
		.values(chosen.map((optionId) => ({ pollId: found.id, optionId, ballotId, voterHash })));
	markVoted(event.cookies, found.id);
	return { ok: true };
}

/* Backoffice */

export async function listPolls() {
	const voters = db()
		.select({ pollId: pollVote.pollId, voters: countDistinct(pollVote.ballotId).as('voters') })
		.from(pollVote)
		.groupBy(pollVote.pollId)
		.as('voters');
	return db()
		.select({
			id: poll.id,
			slug: poll.slug,
			question: poll.question,
			status: poll.status,
			publishedAt: poll.publishedAt,
			closesAt: poll.closesAt,
			voters: sql<number>`coalesce(${voters.voters}, 0)`
		})
		.from(poll)
		.leftJoin(voters, eq(voters.pollId, poll.id))
		.orderBy(desc(sql`${poll.publishedAt} is null`), desc(poll.publishedAt), desc(poll.createdAt));
}

/** A poll with its options and full results, for editing */
export async function getPollForEdit(id: string) {
	const found = await db().query.poll.findFirst({
		where: eq(poll.id, id),
		with: { options: { orderBy: asc(pollOption.sortOrder) } }
	});
	if (!found) return null;
	const [votes, [{ voters }]] = await Promise.all([
		db()
			.select({ optionId: pollVote.optionId, votes: count() })
			.from(pollVote)
			.where(eq(pollVote.pollId, id))
			.groupBy(pollVote.optionId),
		db()
			.select({ voters: countDistinct(pollVote.ballotId) })
			.from(pollVote)
			.where(eq(pollVote.pollId, id))
	]);
	const byOption = new Map(votes.map((v) => [v.optionId, v.votes]));
	return {
		...found,
		options: found.options.map((o) => ({
			id: o.id,
			label: o.label,
			votes: byOption.get(o.id) ?? 0
		})),
		voters
	};
}

/** Published polls matching a query, for the editor's "insert poll" picker */
export const findPolls = (query: string) =>
	db()
		.select({ id: poll.id, slug: poll.slug, question: poll.question, status: poll.status })
		.from(poll)
		.where(query ? sql`${poll.question} like ${`%${query}%`}` : undefined)
		.orderBy(desc(poll.createdAt))
		.limit(20);

export interface PollInput {
	question: string;
	slug: string;
	multipleChoice: boolean;
	publishedAt: string;
	closesAt: string;
	publish: boolean;
	/** Existing options keep their id (and votes); new ones have none */
	options: { id: string; label: string }[];
}

export function readPollForm(form: FormData): PollInput {
	const text = (name: string) => form.get(name)?.toString().trim() ?? '';
	const ids = form.getAll('optionId').map(String);
	const labels = form.getAll('optionLabel').map((l) => l.toString().trim());
	return {
		question: text('question'),
		slug: text('slug'),
		multipleChoice: form.get('multipleChoice') === 'on',
		publishedAt: text('publishedAt'),
		closesAt: text('closesAt'),
		publish: form.get('intent') === 'publish',
		options: labels.map((label, i) => ({ id: ids[i] ?? '', label })).filter((o) => o.label)
	};
}

export type PollErrors = Partial<
	Record<'question' | 'options' | 'publishedAt' | 'closesAt', string>
>;

export async function savePoll(
	id: string | null,
	input: PollInput,
	userId: string
): Promise<{ errors: PollErrors } | { id: string }> {
	const errors: PollErrors = {};
	if (!input.question) errors.question = 'required';
	if (input.options.length < 2) errors.options = 'min_options';
	if (input.publishedAt && !fromLisbonInput(input.publishedAt)) errors.publishedAt = 'invalid';
	if (input.closesAt && !fromLisbonInput(input.closesAt)) errors.closesAt = 'invalid';
	if (Object.keys(errors).length) return { errors };

	const slug = await uniqueSlug(poll, slugify(input.slug) || input.question, id ?? undefined);
	const values = {
		question: input.question,
		slug,
		multipleChoice: input.multipleChoice,
		status: input.publish ? ('published' as const) : ('draft' as const),
		publishedAt: fromLisbonInput(input.publishedAt) ?? (input.publish ? new Date() : null),
		closesAt: fromLisbonInput(input.closesAt)
	};

	let pollId = id;
	if (pollId) {
		await db().update(poll).set(values).where(eq(poll.id, pollId));
	} else {
		const [row] = await db()
			.insert(poll)
			.values({ ...values, createdById: userId })
			.returning({ id: poll.id });
		pollId = row.id;
	}

	// Options: update the kept ones, add new ones, delete the removed ones (and their votes)
	const existing = await db()
		.select({ id: pollOption.id })
		.from(pollOption)
		.where(eq(pollOption.pollId, pollId));
	const kept = new Set(input.options.map((o) => o.id).filter(Boolean));
	const removed = existing.filter((o) => !kept.has(o.id)).map((o) => o.id);
	if (removed.length) await db().delete(pollOption).where(inArray(pollOption.id, removed));
	for (const [sortOrder, option] of input.options.entries()) {
		if (option.id && existing.some((o) => o.id === option.id)) {
			await db()
				.update(pollOption)
				.set({ label: option.label, sortOrder })
				.where(eq(pollOption.id, option.id));
		} else {
			await db().insert(pollOption).values({ pollId, label: option.label, sortOrder });
		}
	}

	await env.DB.batch(
		indexStatements(env.DB, 'poll', [
			{
				id: pollId,
				title: values.question,
				body: input.options.map((o) => o.label).join('. ')
			}
		])
	);
	return { id: pollId };
}

export async function deletePoll(id: string) {
	await db().delete(poll).where(eq(poll.id, id));
	await removeFromIndex(env.DB, 'poll', id);
}
