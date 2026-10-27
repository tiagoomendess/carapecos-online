import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';
import sanitizeHtml from 'sanitize-html';
import { parseLegacyDate } from '../../src/lib/legacy.ts';
import { oldSite } from './crawl.ts';

export interface ParsedArticle {
	legacyId: number;
	title: string;
	publishedAt: Date;
	/** Cleaned body HTML; images and links still point at the old site */
	body: string;
	lead: string | null;
}

/** Extracts title, date and body from an old article page */
export function parseArticle(legacyId: number, html: string): ParsedArticle {
	const $ = cheerio.load(html);
	const titleEl = $('.titulo_noticias').first();
	const title = normalizeSpace(titleEl.text());
	const publishedAt = parseLegacyDate(titleEl.closest('table').text());
	if (!title || !publishedAt) throw new Error(`Article ${legacyId}: title or date not found`);

	const content = $('td.conteudo').first();
	// Everything from the share buttons onwards isn't part of the article
	const share = content.find('.divulgar').first();
	share.nextAll().remove();
	share.remove();

	const { body, lead } = cleanBody(content.html() ?? '', title);
	return { legacyId, title, publishedAt, body, lead };
}

const allowedIframeHostnames = [
	'www.youtube.com',
	'youtube.com',
	'www.youtube-nocookie.com',
	'www.facebook.com',
	'player.vimeo.com'
];

/**
 * Turns Word-pasted BlogTok HTML into clean, semantic HTML: no inline styles, fonts or
 * MSO markup; bold one-line paragraphs become subheadings; images get their own <figure>.
 */
export function cleanBody(rawHtml: string, title: string) {
	// `:INTRO::` was BlogTok's "read more" marker
	const withoutMarkers = rawHtml.replace(/:{1,2}INTRO:{1,2}/g, '');
	const sanitized = sanitizeHtml(convertOldEmbeds(withoutMarkers), {
		allowedTags: [
			'p',
			'br',
			'h2',
			'h3',
			'h4',
			'strong',
			'em',
			'u',
			'a',
			'ul',
			'ol',
			'li',
			'blockquote',
			'img',
			'iframe',
			'figure',
			'table',
			'tbody',
			'tr',
			'td',
			'th'
		],
		allowedAttributes: {
			a: ['href'],
			img: ['src', 'alt'],
			iframe: ['src', 'allowfullscreen'],
			td: ['colspan', 'rowspan'],
			th: ['colspan', 'rowspan']
		},
		allowedSchemes: ['http', 'https', 'mailto'],
		allowedIframeHostnames,
		transformTags: {
			b: 'strong',
			i: 'em',
			h1: 'h2',
			h5: 'h4',
			h6: 'h4',
			div: 'p',
			center: 'p'
		},
		// MSO junk such as <o:p> and <w:WordDocument> is dropped along with its text
		nonTextTags: ['style', 'script', 'textarea', 'option', 'noscript', 'xml', 'title', 'head']
	});

	const $ = cheerio.load(`<main>${sanitized}</main>`, null, false);
	const root = $('main');

	// <div> → <p> can nest paragraphs; keep the inner ones
	root.find('p p').each((_, el) => {
		$(el)
			.parents('p')
			.each((_, outer) => void $(outer).replaceWith($(outer).contents()));
	});

	// Images: absolute URLs, unwrap links to the image itself, own <figure> outside paragraphs
	root.find('img').each((_, el) => {
		const img = $(el);
		const src = absoluteUrl(img.attr('src'));
		if (!src) return void img.remove();
		img.attr('src', src);
		img.removeAttr('alt'); // the old alts are file names

		const link = img.parent('a');
		if (link.length && link.contents().length === 1) link.replaceWith(img);

		const block = img.closest('p, li, td, blockquote, h2, h3, h4');
		const figure = $('<figure></figure>').append(img);
		if (block.length) block.before(figure);
		else img.replaceWith(figure);
	});

	// Video embeds get their own <figure> too, with a privacy-friendly YouTube host
	root.find('iframe').each((_, el) => {
		const iframe = $(el);
		iframe.attr(
			'src',
			(iframe.attr('src') ?? '').replace(
				/^https?:\/\/(www\.)?youtube\.com\/embed\//,
				'https://www.youtube-nocookie.com/embed/'
			)
		);
		iframe.attr('allowfullscreen', '');
		const block = iframe.closest('p');
		const figure = $('<figure></figure>').append(iframe);
		if (block.length) block.before(figure);
		else iframe.replaceWith(figure);
	});

	// Tidy text: non-breaking spaces, trailing <br>s, empty blocks
	root.find('p, li, h2, h3, h4, strong, em, u').each((_, el) => {
		const node = $(el);
		node.contents().each((_, child) => {
			if (child.type === 'text') child.data = child.data.replaceAll(nbsp, ' ');
		});
		while (node.children().last().is('br') && !node.children().last()[0]?.nextSibling) {
			node.children().last().remove();
		}
		if (!normalizeSpace(node.text()) && !node.find('img, iframe').length) node.remove();
	});

	// Top level: drop stray <br>s and wrap loose text in paragraphs
	root.children('br').remove();
	root.contents().each((_, node) => {
		if (node.type !== 'text') return;
		if (isBlank(node)) $(node).remove();
		else $(node).wrap('<p></p>');
	});

	const blocks = () => root.children().toArray();

	// The old editor repeated the title as the first paragraph
	const first = blocks()[0];
	if (first && sameText($(first).text(), title)) $(first).remove();

	// A short opening paragraph becomes the lead (only when there's a body left after it)
	let lead: string | null = null;
	const opening = blocks()[0];
	const paragraphs = root.children('p').length;
	if (opening && $(opening).is('p') && paragraphs > 1) {
		const text = normalizeSpace($(opening).text());
		if (text.length <= 300 && !$(opening).find('img, iframe').length) {
			lead = text;
			$(opening).remove();
		}
	}

	// Short, fully bold paragraphs are subheadings
	root.children('p').each((_, el) => {
		const p = $(el);
		const text = normalizeSpace(p.text());
		const boldText = normalizeSpace(p.children('strong').text());
		const onlyBold = p
			.contents()
			.toArray()
			.every((c) => isBlank(c) || $(c).is('strong, br'));
		if (text && text.length <= 120 && onlyBold && boldText === text) {
			p.replaceWith($('<h2></h2>').text(text));
		}
	});

	return { body: (root.html() ?? '').trim(), lead };
}

/** Old <object>/<embed> YouTube players → iframes, before sanitizing removes them */
function convertOldEmbeds(html: string) {
	const $ = cheerio.load(html, null, false);
	$('object, embed').each((_, el) => {
		const node = $(el);
		const src =
			node.attr('src') ?? node.attr('data') ?? node.find('param[name=movie]').attr('value') ?? '';
		const id = src.match(/youtube\.com\/v\/([\w-]{11})/)?.[1];
		if (id)
			node.replaceWith(`<iframe src="https://www.youtube-nocookie.com/embed/${id}"></iframe>`);
		else if (!node.parents('object').length) node.remove();
	});
	return $.html();
}

function absoluteUrl(src: string | undefined) {
	if (!src || src.startsWith('data:')) return null;
	try {
		return new URL(src.trim(), `${oldSite}/`).href;
	} catch {
		return null;
	}
}

const isBlank = (node: AnyNode) => node.type === 'text' && !normalizeSpace(node.data);

// `\s` also matches non-breaking spaces
export const normalizeSpace = (text: string) => text.replace(/\s+/g, ' ').trim();

const nbsp = String.fromCharCode(160);

const comparable = (text: string) =>
	normalizeSpace(text)
		.toLowerCase()
		.replace(/[^\p{L}\p{N}]+/gu, '');

const sameText = (a: string, b: string) => comparable(a) === comparable(b);
