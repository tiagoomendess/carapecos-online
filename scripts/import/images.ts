import { eq } from 'drizzle-orm';
import type { DrizzleD1Database } from 'drizzle-orm/d1';
import sharp from 'sharp';
import { variantKey, variantWidthsFor } from '../../src/lib/media.ts';
import * as schema from '../../src/lib/server/db/schema.ts';
import type { Storage } from '../../src/lib/storage.ts';
import { fetchFile } from './fetch.ts';

export type Db = DrizzleD1Database<typeof schema>;
export type Media = typeof schema.media.$inferSelect;

const formats: Record<string, { ext: string; mime: string }> = {
	jpeg: { ext: 'jpg', mime: 'image/jpeg' },
	png: { ext: 'png', mime: 'image/png' },
	gif: { ext: 'gif', mime: 'image/gif' },
	webp: { ext: 'webp', mime: 'image/webp' }
};

/**
 * Downloads an image from the old site, stores the original plus resized WebP variants and
 * records it in `media`. Images already imported (same source URL) are reused.
 * Returns `null` when the image is missing or unreadable.
 */
export async function importImage(
	db: Db,
	storage: Storage,
	sourceUrl: string
): Promise<Media | null> {
	const existing = await db.query.media.findFirst({ where: eq(schema.media.sourceUrl, sourceUrl) });
	if (existing) return existing;

	// Unreachable hosts (old external images) count as missing rather than failing the article
	const data = await fetchFile(sourceUrl).catch(() => null);
	if (!data) return null;

	let meta: sharp.Metadata;
	try {
		// `autoOrient` so the stored dimensions match how the photo is displayed
		meta = await sharp(data).autoOrient().metadata();
	} catch {
		return null;
	}
	const format = formats[meta.format ?? ''];
	if (!format || !meta.width || !meta.height) return null;
	const width = meta.autoOrient?.width ?? meta.width;
	const height = meta.autoOrient?.height ?? meta.height;

	const id = crypto.randomUUID();
	const key = `media/${id}`;
	await storage.put(`${key}/original.${format.ext}`, new Uint8Array(data), format.mime);

	const variants = variantWidthsFor(width);
	for (const w of variants) {
		const webp = await sharp(data, { animated: false })
			.autoOrient()
			.resize({ width: w, withoutEnlargement: true })
			.webp({ quality: 80 })
			.toBuffer();
		await storage.put(variantKey(key, w), new Uint8Array(webp), 'image/webp');
	}

	const [row] = await db
		.insert(schema.media)
		.values({
			id,
			key,
			originalName: decodeURIComponent(new URL(sourceUrl).pathname.split('/').pop() ?? ''),
			sourceUrl,
			mimeType: format.mime,
			width,
			height,
			variants
		})
		.returning();
	return row;
}
