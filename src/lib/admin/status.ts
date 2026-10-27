/** What the backoffice shows: a published article with a future date is "scheduled" */
export type DisplayStatus = 'draft' | 'scheduled' | 'published';

export function displayStatus(status: string, publishedAt: Date | null, now = new Date()) {
	if (status !== 'published') return 'draft';
	return publishedAt && publishedAt > now ? 'scheduled' : 'published';
}
