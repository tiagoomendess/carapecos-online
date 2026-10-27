import { count, desc, eq, like, or } from 'drizzle-orm';
import { mediaWidths, variantKey } from '#lib/media.ts';
import { db } from './db/worker.ts';
import { article, media, page } from './db/schema.ts';
import { storage } from './storage.ts';

/** The media library: images uploaded from the backoffice (or imported), with their stored sizes */

export const mediaPageSize = 48;

const extensions: Record<string, string> = {
	'image/jpeg': 'jpg',
	'image/png': 'png',
	'image/gif': 'gif',
	'image/webp': 'webp'
};

const maxFileSize = 15 * 1024 * 1024;

export class UploadError extends Error {}

/**
 * Stores an upload prepared by the browser (`src/lib/admin/image.ts`): the original plus WebP
 * variants in fields named `w480`, `w960`, `w1600`.
 */
export async function storeUpload(form: FormData, userId: string) {
	const original = form.get('original');
	if (!(original instanceof File) || !extensions[original.type]) {
		throw new UploadError('Formato não suportado. Use JPEG, PNG, WebP ou GIF.');
	}
	if (original.size > maxFileSize) throw new UploadError('A imagem tem mais de 15 MB.');

	const width = Number(form.get('width'));
	const height = Number(form.get('height'));
	if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1) {
		throw new UploadError('Dimensões inválidas.');
	}

	const variants: { width: number; file: File }[] = [];
	for (const w of [...mediaWidths, width]) {
		const file = form.get(`w${w}`);
		if (file instanceof File && !variants.some((v) => v.width === w)) {
			if (file.type !== 'image/webp' || file.size > maxFileSize) {
				throw new UploadError('Versão redimensionada inválida.');
			}
			variants.push({ width: w, file });
		}
	}
	if (!variants.length) throw new UploadError('Faltam as versões redimensionadas.');

	const id = crypto.randomUUID();
	const key = `media/${id}`;
	await storage.put(`${key}/original.${extensions[original.type]}`, original, original.type);
	await Promise.all(
		variants.map((v) => storage.put(variantKey(key, v.width), v.file, 'image/webp'))
	);

	const [row] = await db()
		.insert(media)
		.values({
			id,
			key,
			originalName: original.name.slice(0, 200),
			mimeType: original.type,
			width,
			height,
			variants: variants.map((v) => v.width).sort((a, b) => a - b),
			alt: form.get('alt')?.toString().trim() || null,
			uploadedById: userId
		})
		.returning();
	return row;
}

export async function listMedia(pageNumber: number, query = '') {
	const where = query
		? or(like(media.originalName, `%${query}%`), like(media.alt, `%${query}%`))
		: undefined;
	const [[{ total }], items] = await Promise.all([
		db().select({ total: count() }).from(media).where(where),
		db()
			.select()
			.from(media)
			.where(where)
			.orderBy(desc(media.createdAt))
			.limit(mediaPageSize)
			.offset((pageNumber - 1) * mediaPageSize)
	]);
	return { items, total, page: pageNumber, pages: Math.max(1, Math.ceil(total / mediaPageSize)) };
}

/** How many articles and pages use an image (as cover or in the body) */
export async function mediaUsage(id: string) {
	const found = await db().query.media.findFirst({ where: eq(media.id, id) });
	if (!found) return null;
	const inBody = `%/${found.key}/%`;
	const [[articles], [pages]] = await Promise.all([
		db()
			.select({ total: count() })
			.from(article)
			.where(or(eq(article.coverId, id), like(article.body, inBody))),
		db().select({ total: count() }).from(page).where(like(page.body, inBody))
	]);
	return { media: found, uses: articles.total + pages.total };
}

/** Deletes an unused image and its stored files. Returns `false` if it's still in use. */
export async function deleteMedia(id: string) {
	const usage = await mediaUsage(id);
	if (!usage) return true;
	if (usage.uses) return false;
	const { key, mimeType, variants } = usage.media;
	await Promise.all([
		storage.delete(`${key}/original.${extensions[mimeType] ?? 'jpg'}`),
		...variants.map((w) => storage.delete(variantKey(key, w)))
	]);
	await db().delete(media).where(eq(media.id, id));
	return true;
}

export const updateMediaAlt = (id: string, alt: string) =>
	db()
		.update(media)
		.set({ alt: alt || null })
		.where(eq(media.id, id));
