/**
 * Imports the old carapecos.com (BlogTok) articles into the local D1 database and storage.
 *
 *   npm run import                  everything
 *   npm run import -- --limit 30    only the 30 newest articles
 *   npm run import -- --only 35237,32651
 *   npm run import -- --force       re-import articles that already exist (keeps their slug)
 *   npm run import -- --refresh     re-crawl the listings (pages are cached in .import-cache/)
 *   npm run import -- --remote --env-file .env.production
 *                                   into the Cloudflare D1 in wrangler.jsonc and the storage
 *                                   (R2) configured in that env file, instead of the local ones
 *
 * Articles already imported (matched by their old id) are skipped, so it's safe to re-run.
 * The search index is rebuilt for all articles at the end of every run.
 */
import { readFileSync, rmSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';
import * as cheerio from 'cheerio';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/d1';
import { getPlatformProxy } from 'wrangler';
import { categoryForLegacyTags } from '../../src/lib/legacy.ts';
import { defaultBodyWidth, pickVariant, variantKey } from '../../src/lib/media.ts';
import * as schema from '../../src/lib/server/db/schema.ts';
import { indexStatements } from '../../src/lib/server/search.ts';
import { slugify } from '../../src/lib/slug.ts';
import { createStorage } from '../../src/lib/storage.ts';
import { type ParsedArticle, parseArticle } from './article.ts';
import { crawl, oldSite } from './crawl.ts';
import { fetchPage } from './fetch.ts';
import { type Db, importImage, type Media } from './images.ts';

const { values: args } = parseArgs({
	options: {
		limit: { type: 'string' },
		only: { type: 'string' },
		force: { type: 'boolean', default: false },
		refresh: { type: 'boolean', default: false },
		remote: { type: 'boolean', default: false },
		'env-file': { type: 'string', default: '.env' }
	}
});

const remoteConfigPath = 'wrangler.import-remote.jsonc';
const envFile = args['env-file'];
process.loadEnvFile(envFile);
const env = (name: string) => {
	const value = process.env[name];
	if (!value) throw new Error(`${name} is not set in ${envFile}`);
	return value;
};

const storage = createStorage({
	endpoint: env('S3_ENDPOINT'),
	region: env('S3_REGION'),
	bucket: env('S3_BUCKET'),
	accessKeyId: env('S3_ACCESS_KEY_ID'),
	secretAccessKey: env('S3_SECRET_ACCESS_KEY')
});

const platform = await getPlatformProxy<{ DB: D1Database }>(
	args.remote ? { configPath: remoteConfig(), remoteBindings: true } : {}
);
console.log(
	args.remote
		? `Importing into the REMOTE D1 and ${env('S3_ENDPOINT')} (bucket ${env('S3_BUCKET')}).`
		: 'Importing into the local D1.'
);
const db: Db = drizzle(platform.env.DB, { schema });

try {
	await run();
	await rebuildSearchIndex();
} finally {
	await platform.dispose();
	if (args.remote) rmSync(remoteConfigPath, { force: true });
}

async function run() {
	const index = await crawl({ refresh: args.refresh });
	console.log(`Old site lists ${index.ids.length} articles.`);

	let ids = index.ids;
	if (args.only) ids = args.only.split(',').map(Number);
	else if (args.limit) ids = ids.slice(-Number(args.limit)); // highest ids are the newest

	const existing = new Map(
		(await db.query.article.findMany({ columns: { id: true, legacyId: true, slug: true } }))
			.filter((a) => a.legacyId !== null)
			.map((a) => [a.legacyId!, a])
	);
	const todo = args.force ? ids : ids.filter((id) => !existing.has(id));
	console.log(`${todo.length} to import (${ids.length - todo.length} already imported).`);
	if (!todo.length) return;

	// Fetch and parse everything first, so slugs are known before links are rewritten
	const parsed: ParsedArticle[] = [];
	const failed: { id: number; reason: string }[] = [];
	for (const [i, id] of todo.entries()) {
		process.stdout.write(`\rFetching ${i + 1}/${todo.length}…`);
		try {
			parsed.push(parseArticle(id, await fetchPage(`${oldSite}/blog/${id}/`)));
		} catch (error) {
			failed.push({ id, reason: (error as Error).message });
		}
	}
	console.log();

	// Oldest first, so an older article keeps the plain slug when titles repeat
	parsed.sort((a, b) => a.publishedAt.getTime() - b.publishedAt.getTime());
	const slugs = await assignSlugs(parsed, existing);

	const categories = new Map((await db.query.category.findMany()).map((c) => [c.slug, c.id]));
	let imported = 0;
	let images = 0;
	let missingImages = 0;

	for (const [i, article] of parsed.entries()) {
		process.stdout.write(`\rImporting ${i + 1}/${parsed.length}…`);
		try {
			const result = await importArticle(
				article,
				slugs,
				categories,
				index.tags[article.legacyId] ?? [],
				existing.get(article.legacyId)?.id
			);
			imported++;
			images += result.images;
			missingImages += result.missingImages;
		} catch (error) {
			failed.push({ id: article.legacyId, reason: (error as Error).message });
		}
	}
	console.log();
	console.log(
		`Imported ${imported} articles with ${images} images (${missingImages} missing on the old site).`
	);
	for (const f of failed) console.log(`  ✗ ${oldSite}/blog/${f.id}/ — ${f.reason}`);
}

/**
 * A copy of wrangler.jsonc whose D1 binding points at the real (remote) database, which is how
 * `getPlatformProxy` connects to Cloudflare instead of the local copy.
 */
function remoteConfig() {
	const source = readFileSync('wrangler.jsonc', 'utf8').replace(/^\s*\/\/.*$/gm, '');
	const config = JSON.parse(source);
	for (const database of config.d1_databases) database.remote = true;
	writeFileSync(remoteConfigPath, JSON.stringify(config, null, 2));
	return remoteConfigPath;
}

/** Re-indexes every article for search. Cheap enough (~1,000 articles) to run on every import. */
async function rebuildSearchIndex() {
	const articles = await db.query.article.findMany({
		columns: { id: true, title: true, lead: true, body: true }
	});
	const d1 = platform.env.DB;
	// 50 articles (100 statements) per batch
	for (let i = 0; i < articles.length; i += 50) {
		await d1.batch(indexStatements(d1, 'article', articles.slice(i, i + 50)));
	}
	console.log(`Search index rebuilt for ${articles.length} articles.`);
}

/** Old id → slug, for the articles being imported plus the ones already in the database */
async function assignSlugs(parsed: ParsedArticle[], existing: Map<number, { slug: string }>) {
	const taken = new Set(
		(await db.query.article.findMany({ columns: { slug: true } })).map((a) => a.slug)
	);
	const slugs = new Map([...existing].map(([legacyId, a]) => [legacyId, a.slug]));
	for (const article of parsed) {
		if (slugs.has(article.legacyId)) continue;
		const base = slugify(article.title) || `artigo-${article.legacyId}`;
		let slug = base;
		for (let n = 2; taken.has(slug); n++) slug = `${base}-${n}`;
		taken.add(slug);
		slugs.set(article.legacyId, slug);
	}
	return slugs;
}

async function importArticle(
	article: ParsedArticle,
	slugs: Map<number, string>,
	categories: Map<string, string>,
	tags: string[],
	existingId: string | undefined
) {
	const $ = cheerio.load(article.body, null, false);
	let images = 0;
	let missingImages = 0;
	let cover: Media | null = null;

	for (const el of $('img').toArray()) {
		const img = $(el);
		const media = await importImage(db, storage, img.attr('src')!);
		if (!media) {
			missingImages++;
			img.closest('figure').remove();
			continue;
		}
		images++;
		if (!cover) {
			// The first image becomes the cover, shown above the article, so it leaves the body
			cover = media;
			img.closest('figure').remove();
			continue;
		}
		const variants = media.variants;
		img.attr('src', `/${variantKey(media.key, pickVariant(variants, defaultBodyWidth))}`);
		img.attr('srcset', variants.map((w) => `/${variantKey(media.key, w)} ${w}w`).join(', '));
		img.attr('sizes', '(min-width: 768px) 720px, 100vw');
		img.attr('width', String(media.width));
		img.attr('height', String(media.height));
		img.attr('alt', '');
		img.attr('loading', 'lazy');
	}

	// Links to other old articles and tags → new URLs (not yet imported ones go through the redirect)
	$('a[href]').each((_, el) => {
		const a = $(el);
		const href = a.attr('href')!;
		const articleId = href.match(/carapecos\.(?:blogtok\.)?com\/blog\/(\d+)/)?.[1];
		if (articleId) {
			const slug = slugs.get(+articleId);
			a.attr('href', slug ? `/noticias/${slug}` : `/blog/${articleId}/`);
		} else if (/carapecos\.(?:blogtok\.)?com\/blog\/tag\//.test(href)) {
			a.attr('href', new URL(href).pathname);
		}
	});

	const categorySlug = categoryForLegacyTags(tags);
	const categoryId = categories.get(categorySlug);
	if (!categoryId) throw new Error(`Category "${categorySlug}" not found; run the migrations`);

	const values = {
		slug: slugs.get(article.legacyId)!,
		title: article.title,
		lead: article.lead,
		body: $.html().trim(),
		coverId: (cover as Media | null)?.id ?? null,
		categoryId,
		status: 'published' as const,
		publishedAt: article.publishedAt,
		legacyId: article.legacyId
	};

	if (existingId) {
		await db.update(schema.article).set(values).where(eq(schema.article.id, existingId));
	} else {
		await db.insert(schema.article).values(values);
	}
	return { images, missingImages };
}
