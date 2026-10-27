/** Shapes the public site's server loads return to its components */

export interface Image {
	key: string;
	width: number;
	height: number;
	variants: number[];
	alt: string | null;
}

export interface CategoryLink {
	name: string;
	slug: string;
}

export interface ArticleCard {
	id: string;
	slug: string;
	title: string;
	summary: string;
	publishedAt: Date;
	category: CategoryLink;
	cover: Image | null;
}

export interface Paged<T> {
	items: T[];
	page: number;
	pages: number;
	total: number;
}

export interface PollView {
	id: string;
	slug: string;
	question: string;
	multipleChoice: boolean;
	publishedAt: Date;
	closesAt: Date | null;
	closed: boolean;
	/** This browser already voted */
	voted: boolean;
	/** Results are shown once the reader voted, or the poll closed */
	showResults: boolean;
	options: { id: string; label: string; votes: number | null }[];
	/** People who voted (in multiple-choice polls each can pick several options) */
	voters: number | null;
}

/** Homepage and search mix articles and polls */
export type FeedItem = { kind: 'article'; article: ArticleCard } | { kind: 'poll'; poll: PollView };

export interface CommentView {
	id: string;
	authorName: string;
	body: string;
	createdAt: Date;
	replies: Omit<CommentView, 'replies'>[];
}

/** A message this browser already sent from /contactos (no email — that's only in the inbox) */
export interface ContactMessageView {
	id: string;
	message: string;
	createdAt: Date;
}

/** Homepage hamburger: a published page with "mostrar no menu" */
export interface NavPage {
	id: string;
	label: string;
	href: string;
}

/** A link on a CMS page's own menu. `external` links open in a new tab. */
export interface MenuLink {
	id: string;
	label: string;
	href: string;
	external: boolean;
}
