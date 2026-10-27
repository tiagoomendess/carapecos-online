import { MEDIA_BASE_URL } from '$app/env/public';
import { asc, eq, inArray } from 'drizzle-orm';
import { resolveMediaUrls, unresolveMediaUrls } from '#lib/media.ts';
import { normalizeMenuHref } from '#lib/menu.ts';
import { slugify } from '#lib/slug.ts';
import { uniqueSlug } from './admin.ts';
import { db } from './db/worker.ts';
import { page, pageMenuItem } from './db/schema.ts';
import { sanitizeRichText } from './sanitize.ts';

/** CMS pages in the backoffice. Pages live at `/{slug}`, so slugs of site sections are reserved. */

const reservedSlugs = new Set([
	'admin',
	'api',
	'blog',
	'categoria',
	'noticias',
	'pesquisa',
	'sondagens',
	'rss',
	'feed',
	'sitemap',
	'llms'
]);

export const listPages = () =>
	db()
		.select({
			id: page.id,
			title: page.title,
			slug: page.slug,
			status: page.status,
			showInFooter: page.showInFooter,
			showInMenu: page.showInMenu,
			updatedAt: page.updatedAt
		})
		.from(page)
		.orderBy(asc(page.title));

export async function getPageForEdit(id: string) {
	const found = await db().query.page.findFirst({
		where: eq(page.id, id),
		with: { menuItems: { orderBy: asc(pageMenuItem.sortOrder) } }
	});
	return found && { ...found, body: resolveMediaUrls(found.body, MEDIA_BASE_URL) };
}

export interface PageInput {
	title: string;
	slug: string;
	body: string;
	showInFooter: boolean;
	showInMenu: boolean;
	publish: boolean;
	menuItems: { id: string; label: string; href: string }[];
}

export function readPageForm(form: FormData): PageInput {
	const ids = form.getAll('menuItemId').map((v) => v.toString());
	const labels = form.getAll('menuItemLabel').map((v) => v.toString().trim());
	const hrefs = form.getAll('menuItemHref').map((v) => v.toString());
	return {
		title: form.get('title')?.toString().trim() ?? '',
		slug: form.get('slug')?.toString().trim() ?? '',
		body: form.get('body')?.toString() ?? '',
		showInFooter: form.get('showInFooter') === 'on',
		showInMenu: form.get('showInMenu') === 'on',
		publish: form.get('intent') === 'publish',
		menuItems: labels.flatMap((label, i) => {
			const href = normalizeMenuHref(hrefs[i] ?? '');
			if (!label || !href) return [];
			return [{ id: ids[i] ?? '', label, href }];
		})
	};
}

export async function savePage(id: string | null, input: PageInput) {
	if (!input.title) return { errors: { title: 'required' } };
	let base = slugify(input.slug) || slugify(input.title);
	if (reservedSlugs.has(base)) base = `${base}-pagina`;
	const slug = await uniqueSlug(page, base, id ?? undefined);

	const values = {
		title: input.title,
		slug,
		body: sanitizeRichText(unresolveMediaUrls(input.body, MEDIA_BASE_URL)),
		showInFooter: input.showInFooter,
		showInMenu: input.showInMenu,
		status: input.publish ? ('published' as const) : ('draft' as const)
	};

	let pageId = id;
	if (pageId) {
		await db().update(page).set(values).where(eq(page.id, pageId));
	} else {
		const [row] = await db().insert(page).values(values).returning({ id: page.id });
		pageId = row.id;
	}

	const existing = await db()
		.select({ id: pageMenuItem.id })
		.from(pageMenuItem)
		.where(eq(pageMenuItem.pageId, pageId));
	const kept = new Set(input.menuItems.map((item) => item.id).filter(Boolean));
	const removed = existing.filter((item) => !kept.has(item.id)).map((item) => item.id);
	if (removed.length) await db().delete(pageMenuItem).where(inArray(pageMenuItem.id, removed));
	for (const [sortOrder, item] of input.menuItems.entries()) {
		if (item.id && existing.some((row) => row.id === item.id)) {
			await db()
				.update(pageMenuItem)
				.set({ label: item.label, href: item.href, sortOrder })
				.where(eq(pageMenuItem.id, item.id));
		} else {
			await db()
				.insert(pageMenuItem)
				.values({ pageId, label: item.label, href: item.href, sortOrder });
		}
	}

	return { id: pageId, slug };
}

export const deletePage = (id: string) => db().delete(page).where(eq(page.id, id));
