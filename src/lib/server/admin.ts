import { error } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import type { SQLiteColumn, SQLiteTable } from 'drizzle-orm/sqlite-core';
import { slugify } from '#lib/slug.ts';
import { db } from './db/worker.ts';

/**
 * Backoffice helpers. `hooks.server.ts` already sends logged-out visitors to the login page;
 * these check what the logged-in user may do.
 */

export function requireUser(locals: App.Locals) {
	if (!locals.user) error(401);
	return locals.user;
}

/** Users, categories and site settings are for admins only */
export function requireAdmin(locals: App.Locals) {
	const user = requireUser(locals);
	if (user.role !== 'admin') error(403, 'Só os administradores podem fazer isto.');
	return user;
}

/**
 * A slug for `text` that no other row of `table` uses: "festa", then "festa-2", "festa-3"…
 * `exceptId` is the row being edited, which may keep its own slug.
 */
export async function uniqueSlug(
	table: SQLiteTable & { id: SQLiteColumn; slug: SQLiteColumn },
	text: string,
	exceptId?: string
) {
	const base = slugify(text) || 'sem-titulo';
	for (let n = 1; ; n++) {
		const slug = n === 1 ? base : `${base}-${n}`;
		const [taken] = await db()
			.select({ id: table.id })
			.from(table)
			.where(eq(table.slug, slug))
			.limit(1);
		if (!taken || taken.id === exceptId) return slug;
	}
}

/** Form value as a trimmed string ('' when missing) */
export const field = (form: FormData, name: string) => form.get(name)?.toString().trim() ?? '';
