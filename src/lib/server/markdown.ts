import { type ChildNode, isTag, isText } from 'domhandler';
import { parseDocument } from 'htmlparser2';

/**
 * Article HTML → Markdown, for the `/noticias/{slug}.md` versions that LLMs and other tools read.
 * Handles exactly what the sanitizer allows (see `sanitize.ts`).
 */

const inline = (nodes: ChildNode[], baseUrl: string): string =>
	nodes
		.map((node) => {
			if (isText(node)) return node.data.replace(/\s+/g, ' ').replace(/([*_`[\]])/g, '\\$1');
			if (!isTag(node)) return '';
			const inner = inline(node.children, baseUrl);
			switch (node.name) {
				case 'strong':
					return inner.trim() ? `**${inner.trim()}**` : '';
				case 'em':
					return inner.trim() ? `*${inner.trim()}*` : '';
				case 's':
					return inner.trim() ? `~~${inner.trim()}~~` : '';
				case 'br':
					return '  \n';
				case 'a': {
					const href = absolute(node.attribs.href ?? '', baseUrl);
					return href ? `[${inner.trim() || href}](${href})` : inner;
				}
				default:
					return inner;
			}
		})
		.join('');

const absolute = (url: string, baseUrl: string) => (url.startsWith('/') ? baseUrl + url : url);

function block(node: ChildNode, baseUrl: string): string {
	if (isText(node)) return node.data.trim() ? node.data.trim() : '';
	if (!isTag(node)) return '';
	const children = node.children;
	switch (node.name) {
		case 'p':
			return inline(children, baseUrl).trim();
		case 'h2':
			return `## ${inline(children, baseUrl).trim()}`;
		case 'h3':
			return `### ${inline(children, baseUrl).trim()}`;
		case 'hr':
			return '---';
		case 'blockquote':
			return blocks(children, baseUrl)
				.split('\n')
				.map((line) => `> ${line}`)
				.join('\n');
		case 'ul':
		case 'ol':
			return children
				.filter((child) => isTag(child) && child.name === 'li')
				.map((li, i) => {
					const text = blocks((li as { children: ChildNode[] }).children, baseUrl).replace(
						/\n+/g,
						' '
					);
					return `${node.name === 'ol' ? `${i + 1}.` : '-'} ${text}`;
				})
				.join('\n');
		case 'figure': {
			const img = node.children.find((c) => isTag(c) && c.name === 'img');
			const iframe = node.children.find((c) => isTag(c) && c.name === 'iframe');
			const caption = node.children.find((c) => isTag(c) && c.name === 'figcaption');
			const captionText = caption && isTag(caption) ? inline(caption.children, baseUrl).trim() : '';
			if (img && isTag(img)) {
				const alt = img.attribs.alt || captionText;
				return `![${alt}](${absolute(img.attribs.src ?? '', baseUrl)})${captionText ? `\n\n*${captionText}*` : ''}`;
			}
			if (iframe && isTag(iframe)) return `[Vídeo](${iframe.attribs.src})`;
			return '';
		}
		case 'table': {
			const rows = node.children
				.flatMap((c) => (isTag(c) && ['thead', 'tbody'].includes(c.name) ? c.children : [c]))
				.filter((c) => isTag(c) && c.name === 'tr');
			const cells = rows.map((row) =>
				(row as { children: ChildNode[] }).children
					.filter((c) => isTag(c) && (c.name === 'td' || c.name === 'th'))
					.map((c) =>
						blocks((c as { children: ChildNode[] }).children, baseUrl)
							.replace(/\s*\n\s*/g, ' ')
							.replace(/\|/g, '\\|')
					)
			);
			if (!cells.length) return '';
			const width = Math.max(...cells.map((r) => r.length));
			const line = (r: string[]) =>
				`| ${[...r, ...Array(width - r.length).fill('')].join(' | ')} |`;
			return [line(cells[0]), `|${' --- |'.repeat(width)}`, ...cells.slice(1).map(line)].join('\n');
		}
		case 'div':
			// Embedded poll
			return node.attribs['data-poll']
				? `[Sondagem](${baseUrl}/sondagens/${node.attribs['data-poll']})`
				: '';
		default:
			return inline([node], baseUrl).trim();
	}
}

const blocks = (nodes: ChildNode[], baseUrl: string) =>
	nodes
		.map((node) => block(node, baseUrl))
		.filter(Boolean)
		.join('\n\n');

/** `baseUrl` turns root-relative links and images into absolute ones */
export const htmlToMarkdown = (html: string, baseUrl: string) =>
	blocks(parseDocument(html).children, baseUrl.replace(/\/$/, ''));
