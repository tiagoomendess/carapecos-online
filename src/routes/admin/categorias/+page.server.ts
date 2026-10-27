import { fail } from '@sveltejs/kit';
import { asc, count, eq } from 'drizzle-orm';
import { m } from '#lib/paraglide/messages.js';
import { field, requireAdmin, uniqueSlug } from '#lib/server/admin.ts';
import { db } from '#lib/server/db/worker.ts';
import { article, category } from '#lib/server/db/schema.ts';
import { slugify } from '#lib/slug.ts';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	requireAdmin(locals);
	const categories = await db()
		.select({
			id: category.id,
			name: category.name,
			slug: category.slug,
			description: category.description,
			sortOrder: category.sortOrder,
			articles: count(article.id)
		})
		.from(category)
		.leftJoin(article, eq(article.categoryId, category.id))
		.groupBy(category.id)
		.orderBy(asc(category.sortOrder), asc(category.name));
	return { categories };
};

function readForm(form: FormData) {
	return {
		name: field(form, 'name'),
		slug: field(form, 'slug'),
		description: field(form, 'description') || null,
		sortOrder: Number(field(form, 'sortOrder')) || 0
	};
}

export const actions: Actions = {
	create: async ({ locals, request }) => {
		requireAdmin(locals);
		const input = readForm(await request.formData());
		if (!input.name) return fail(400, { error: m.admin_required() });
		const slug = await uniqueSlug(category, slugify(input.slug) || input.name);
		await db()
			.insert(category)
			.values({ ...input, slug });
		return { saved: true };
	},

	update: async ({ locals, request }) => {
		requireAdmin(locals);
		const form = await request.formData();
		const id = field(form, 'id');
		const input = readForm(form);
		if (!input.name) return fail(400, { error: m.admin_required() });
		const slug = await uniqueSlug(category, slugify(input.slug) || input.name, id);
		await db()
			.update(category)
			.set({ ...input, slug })
			.where(eq(category.id, id));
		return { saved: true };
	},

	delete: async ({ locals, request }) => {
		requireAdmin(locals);
		const id = field(await request.formData(), 'id');
		const [{ total }] = await db()
			.select({ total: count() })
			.from(article)
			.where(eq(article.categoryId, id));
		if (total) return fail(409, { error: m.admin_category_in_use({ count: total }) });
		await db().delete(category).where(eq(category.id, id));
		return { saved: true };
	}
};
