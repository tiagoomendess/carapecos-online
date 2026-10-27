import { type Editor, mergeAttributes, Node } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';
import { isAllowedEmbed } from '#lib/embed.ts';

/**
 * Block nodes for the article editor, matching the HTML the site renders (and the import produces):
 *   <figure><img src srcset sizes width height alt loading="lazy"><figcaption>…</figcaption></figure>
 *   <figure><iframe src allowfullscreen></iframe></figure>
 *   <div data-poll="slug"></div>   (replaced by the live poll on the site)
 */

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		figureImage: {
			insertFigureImage: (attrs: FigureImageAttrs) => ReturnType;
		};
		video: {
			insertVideo: (src: string) => ReturnType;
		};
		pollEmbed: {
			insertPoll: (poll: { slug: string; question: string }) => ReturnType;
		};
	}
}

/** Where a new block goes: after a selected image or video rather than replacing it */
function insertPosition(editor: Editor) {
	const { selection } = editor.state;
	return selection instanceof NodeSelection ? selection.to : selection.from;
}

export interface FigureImageAttrs {
	src: string;
	srcset?: string | null;
	sizes?: string | null;
	width?: number | null;
	height?: number | null;
	alt?: string | null;
	caption?: string | null;
}

const imageAttribute = (name: string) => ({
	default: null,
	parseHTML: (element: HTMLElement) =>
		(element.matches('img') ? element : element.querySelector('img'))?.getAttribute(name) ?? null
});

export const FigureImage = Node.create({
	name: 'figureImage',
	group: 'block',
	atom: true,
	draggable: true,

	addAttributes() {
		return {
			src: imageAttribute('src'),
			srcset: imageAttribute('srcset'),
			sizes: imageAttribute('sizes'),
			width: imageAttribute('width'),
			height: imageAttribute('height'),
			alt: imageAttribute('alt'),
			caption: {
				default: null,
				parseHTML: (element) => element.querySelector('figcaption')?.textContent?.trim() || null
			}
		};
	},

	parseHTML() {
		return [
			{ tag: 'figure', getAttrs: (element) => (element.querySelector('img') ? null : false) },
			{ tag: 'img[src]' }
		];
	},

	renderHTML({ HTMLAttributes }) {
		const { caption, ...img } = HTMLAttributes;
		const image = ['img', mergeAttributes(img, { loading: 'lazy' })];
		return caption ? ['figure', image, ['figcaption', caption]] : ['figure', image];
	},

	addCommands() {
		return {
			insertFigureImage:
				(attrs) =>
				({ commands, editor }) =>
					commands.insertContentAt(insertPosition(editor), { type: this.name, attrs })
		};
	}
});

export const Video = Node.create({
	name: 'video',
	group: 'block',
	atom: true,
	draggable: true,

	addAttributes() {
		return {
			src: {
				default: null,
				parseHTML: (element) =>
					(element.matches('iframe') ? element : element.querySelector('iframe'))?.getAttribute(
						'src'
					) ?? null
			}
		};
	},

	parseHTML() {
		const allowed = (element: HTMLElement) => {
			const iframe = element.matches('iframe') ? element : element.querySelector('iframe');
			return iframe && isAllowedEmbed(iframe.getAttribute('src') ?? '') ? null : false;
		};
		return [
			{ tag: 'figure', getAttrs: allowed, priority: 60 },
			{ tag: 'iframe', getAttrs: allowed }
		];
	},

	renderHTML({ HTMLAttributes }) {
		return ['figure', ['iframe', { src: HTMLAttributes.src, allowfullscreen: '' }]];
	},

	addCommands() {
		return {
			insertVideo:
				(src) =>
				({ commands, editor }) =>
					commands.insertContentAt(insertPosition(editor), { type: this.name, attrs: { src } })
		};
	}
});

export const PollEmbed = Node.create({
	name: 'pollEmbed',
	group: 'block',
	atom: true,
	draggable: true,

	addAttributes() {
		return {
			slug: {
				default: null,
				parseHTML: (element) => element.getAttribute('data-poll'),
				renderHTML: (attrs) => ({ 'data-poll': attrs.slug })
			},
			// Only for showing the question in the editor; not stored
			question: { default: null, rendered: false }
		};
	},

	parseHTML() {
		return [{ tag: 'div[data-poll]' }];
	},

	renderHTML({ HTMLAttributes }) {
		return ['div', HTMLAttributes];
	},

	addNodeView() {
		return ({ node }) => {
			const dom = document.createElement('div');
			dom.className = 'poll-embed';
			dom.textContent = `📊 ${node.attrs.question ?? node.attrs.slug}`;
			return { dom };
		};
	},

	addCommands() {
		return {
			insertPoll:
				({ slug, question }) =>
				({ commands, editor }) =>
					commands.insertContentAt(insertPosition(editor), {
						type: this.name,
						attrs: { slug, question }
					})
		};
	}
});
