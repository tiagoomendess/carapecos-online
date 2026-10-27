import * as cheerio from 'cheerio';
import { decodeLegacySegment } from '../../src/lib/legacy.ts';
import { fetchPage, readJson, writeJson } from './fetch.ts';

export const oldSite = 'http://carapecos.com';

export interface CrawlIndex {
	/** Old article ids, from the main and tag listings */
	ids: number[];
	/** Old article id → old tags */
	tags: Record<number, string[]>;
}

/** The last page number linked from a paginated listing (`.../pag/115/`) */
function lastPage(html: string, base: string) {
	const basePath = new URL(base).pathname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
	const pages = [...html.matchAll(new RegExp(`${basePath}/pag/(\\d+)/`, 'g'))].map((m) => +m[1]);
	return Math.max(1, ...pages);
}

/** Ids of the articles listed on one listing page (main or tag) */
function listedIds(html: string) {
	const $ = cheerio.load(html);
	const ids = new Set<number>();
	// Each listed article has a Facebook share link with its own URL encoded in it
	$('.divulgar a[href*="sharer.php"]').each((_, el) => {
		const match = ($(el).attr('href') ?? '').match(/carapecos\.com%2Fblog%2F(\d+)/i);
		if (match) ids.add(+match[1]);
	});
	return [...ids];
}

/** Tag URL segments from the "Arquivo" menu */
function tagSegments(html: string) {
	return [...new Set([...html.matchAll(/\/blog\/tag\/([^'"/]+)/g)].map((m) => m[1].trim()))].filter(
		Boolean
	);
}

async function crawlListing(base: string, log: (msg: string) => void) {
	const first = await fetchPage(`${base}/`);
	const pages = lastPage(first, base);
	const ids = new Set(listedIds(first));
	for (let page = 2; page <= pages; page++) {
		log(`  ${base} page ${page}/${pages}`);
		listedIds(await fetchPage(`${base}/pag/${page}/`)).forEach((id) => ids.add(id));
	}
	return { ids, html: first };
}

/** Walks the main listing and every tag listing. Cached in `.import-cache/index.json`. */
export async function crawl({ refresh = false, log = console.log } = {}) {
	if (!refresh) {
		const cached = await readJson<CrawlIndex>('index.json');
		if (cached) return cached;
	}

	log('Crawling the main listing…');
	const main = await crawlListing(`${oldSite}/blog`, log);

	const tags: Record<number, string[]> = {};
	for (const segment of tagSegments(main.html)) {
		const tag = decodeLegacySegment(segment);
		log(`Crawling tag "${tag}"…`);
		const { ids } = await crawlListing(`${oldSite}/blog/tag/${segment}`, log);
		for (const id of ids) (tags[id] ??= []).push(tag);
	}

	// A few articles only show up in tag listings
	const ids = new Set([...main.ids, ...Object.keys(tags).map(Number)]);
	const index: CrawlIndex = { ids: [...ids].sort((a, b) => a - b), tags };
	await writeJson('index.json', index);
	return index;
}
