import { count } from 'drizzle-orm';
import { getDb } from '#lib/server/db/index.ts';
import { user } from '#lib/server/db/schema.ts';

/** False until the first admin has been created through /admin/setup */
export async function hasUsers(d1: D1Database) {
	const [row] = await getDb(d1).select({ total: count() }).from(user);
	return row.total > 0;
}
