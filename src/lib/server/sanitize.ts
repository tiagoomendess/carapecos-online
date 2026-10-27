import render from 'dom-serializer';
import { type ChildNode, Element, isTag, isText } from 'domhandler';
import { textContent as textOf } from 'domutils';
import { parseDocument } from 'htmlparser2';
import { isAllowedEmbed } from '#lib/embed.ts';

/**
 * Server-side allowlist for rich-text HTML (articles and pages). The editor only produces these
 * tags, but the server can't trust what's posted, so everything is checked again before saving.
 * Tags not in the list are unwrapped (their text is kept); dangerous ones are dropped whole.
 * Pure JS (htmlparser2), so it runs on Workers without Node APIs.
 */

const allowedTags = new Set([
	'p',
	'br',
	'h2',
	'h3',
	'strong',
	'em',
	'u',
	's',
	'a',
	'ul',
	'ol',
	'li',
	'blockquote',
	'hr',
	'figure',
	'figcaption',
	'img',
	'iframe',
	'table',
	'thead',
	'tbody',
	'tr',
	'th',
	'td'
]);

/** Dropped with their content */
const droppedTags = new Set([
	'script',
	'style',
	'noscript',
	'template',
	'object',
	'embed',
	'form',
	'input',
	'button',
	'select',
	'textarea',
	'svg',
	'math',
	'head',
	'title',
	'meta',
	'link'
]);

const renamedTags: Record<string, string> = {
	b: 'strong',
	i: 'em',
	h1: 'h2',
	h4: 'h3',
	h5: 'h3',
	h6: 'h3',
	del: 's',
	strike: 's'
};

const allowedAttributes: Record<string, string[]> = {
	a: ['href'],
	img: ['src', 'srcset', 'sizes', 'alt', 'width', 'height', 'loading'],
	iframe: ['src', 'allowfullscreen', 'title'],
	th: ['colspan', 'rowspan'],
	td: ['colspan', 'rowspan']
};

const pollEmbedSlug = /^[a-z0-9-]{1,100}$/;

/** Links: web, email and phone links, or paths on this site */
const isSafeHref = (href: string) => /^(https?:|mailto:|tel:|\/(?!\/)|#)/i.test(href.trim());

/** Images: our own media (root-relative) or https */
const isSafeImageUrl = (src: string) => /^(\/media\/|https:\/\/)/.test(src.trim());

const isSafeSrcset = (srcset: string) =>
	srcset.split(',').every((candidate) => isSafeImageUrl(candidate.trim().split(/\s+/)[0] ?? ''));

function cleanAttributes(el: Element) {
	const allowed = allowedAttributes[el.name] ?? [];
	const attribs: Record<string, string> = {};
	for (const [name, value] of Object.entries(el.attribs)) {
		if (!allowed.includes(name)) continue;
		if (name === 'href' && !isSafeHref(value)) continue;
		if (name === 'src' && el.name === 'img' && !isSafeImageUrl(value)) continue;
		if (name === 'srcset' && !isSafeSrcset(value)) continue;
		if ((name === 'width' || name === 'height' || name.endsWith('span')) && !/^\d+$/.test(value))
			continue;
		if (name === 'loading' && value !== 'lazy') continue;
		attribs[name] = value;
	}
	if (el.name === 'a' && attribs.href && /^https?:/i.test(attribs.href)) {
		attribs.rel = 'noopener noreferrer';
	}
	el.attribs = attribs;
}

function cleanNodes(nodes: ChildNode[]): ChildNode[] {
	return nodes.flatMap((node): ChildNode[] => {
		if (isText(node)) return [node];
		if (!isTag(node)) return []; // comments, processing instructions, CDATA

		const name = renamedTags[node.name] ?? node.name;
		if (droppedTags.has(name)) return [];
		const children = cleanNodes(node.children);
		// A poll embedded in the body: an empty placeholder the page replaces with the poll
		if (name === 'div' && pollEmbedSlug.test(node.attribs['data-poll'] ?? '')) {
			node.attribs = { 'data-poll': node.attribs['data-poll'] };
			node.children = [];
			return [node];
		}
		if (!allowedTags.has(name)) return children; // unwrap

		node.name = name;
		cleanAttributes(node);
		if (name === 'img' && !node.attribs.src) return [];
		if (name === 'iframe' && !isAllowedEmbed(node.attribs.src ?? '')) return [];
		if (name === 'iframe') node.attribs.allowfullscreen = '';

		node.children =
			name === 'img' || name === 'iframe' || name === 'br' || name === 'hr' ? [] : children;
		for (const child of node.children) child.parent = node;
		return [node];
	});
}

export function sanitizeRichText(html: string) {
	const document = parseDocument(html);
	const nodes = cleanNodes(document.children);
	// The editor always keeps an empty paragraph at the end; it isn't content
	const isEmptyParagraph = (node: ChildNode) =>
		isTag(node) &&
		node.name === 'p' &&
		!textOf(node).trim() &&
		node.children.every((child) => !isTag(child) || child.name === 'br');
	while (
		nodes.length &&
		(isEmptyParagraph(nodes.at(-1)!) || (isText(nodes.at(-1)!) && !textOf(nodes.at(-1)!).trim()))
	) {
		nodes.pop();
	}
	return render(nodes, { encodeEntities: 'utf8', emptyAttrs: true }).trim();
}
