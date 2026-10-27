<script lang="ts">
	import { onMount } from 'svelte';
	import { Editor } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import { TableKit } from '@tiptap/extension-table';
	import { Alert, Button, Input, Label, Modal } from 'flowbite-svelte';
	import { MEDIA_BASE_URL } from '$app/env/public';
	import { m } from '#lib/paraglide/messages.js';
	import { toEmbedUrl } from '#lib/embed.ts';
	import { pickVariant, variantKey } from '#lib/media.ts';
	import { mediaUrl } from '#lib/storage.ts';
	import type { AdminMedia } from '#lib/admin/image.ts';
	import { FigureImage, PollEmbed, Video } from '#lib/admin/editor-extensions.ts';
	import MediaPicker from './MediaPicker.svelte';
	import PollPicker from './PollPicker.svelte';

	let {
		name,
		value = '',
		label,
		onchange
	}: {
		/** Name of the hidden input that carries the HTML in the form */
		name: string;
		/** Initial HTML */
		value?: string;
		label: string;
		onchange?: () => void;
	} = $props();

	let element: HTMLDivElement;
	let editor = $state.raw<Editor | null>(null);
	// The initial value seeds the hidden input; afterwards the editor owns it
	// svelte-ignore state_referenced_locally
	let html = $state(value);
	// Bumped after transactions, so toolbar states re-read the editor
	let revision = $state(0);

	// Toolbar states refresh at most once a frame, outside Svelte's update cycle, so bursts of
	// transactions (focus changes while a dialog opens, typing) can't feed back into Svelte updates
	let refreshQueued = false;
	function refreshToolbar() {
		if (refreshQueued) return;
		refreshQueued = true;
		requestAnimationFrame(() => {
			refreshQueued = false;
			revision++;
		});
	}

	onMount(() => {
		editor = new Editor({
			element,
			extensions: [
				StarterKit.configure({
					heading: { levels: [2, 3] },
					code: false,
					codeBlock: false,
					link: { openOnClick: false, autolink: true, HTMLAttributes: { target: null } }
				}),
				TableKit.configure({ table: { resizable: false } }),
				FigureImage,
				Video,
				PollEmbed
			],
			content: value,
			editorProps: {
				attributes: {
					class: 'prose prose-gray dark:prose-invert max-w-none min-h-80 p-4 focus:outline-none',
					'aria-label': label,
					'aria-multiline': 'true',
					role: 'textbox'
				}
			},
			onTransaction: refreshToolbar,
			onUpdate: ({ editor }) => {
				html = editor.getHTML();
				onchange?.();
			}
		});
		return () => editor?.destroy();
	});

	const active = (
		nameOrAttrs: string | Record<string, unknown>,
		attrs?: Record<string, unknown>
	) => {
		void revision;
		if (!editor) return false;
		return typeof nameOrAttrs === 'string'
			? editor.isActive(nameOrAttrs, attrs)
			: editor.isActive(nameOrAttrs);
	};

	const chain = () => editor!.chain().focus();

	// Link and video dialogs share one URL field
	let urlDialog = $state<'link' | 'video' | null>(null);
	let url = $state('');
	let urlError = $state<string | null>(null);

	function openUrlDialog(kind: 'link' | 'video') {
		urlDialog = kind;
		urlError = null;
		url = kind === 'link' ? (editor?.getAttributes('link').href ?? '') : '';
	}

	function applyUrl() {
		if (urlDialog === 'video') {
			const src = toEmbedUrl(url);
			if (!src) {
				urlError = m.admin_editor_video_invalid();
				return;
			}
			chain().insertVideo(src).run();
		} else if (urlDialog === 'link') {
			const href = url.trim();
			if (!href) {
				chain().extendMarkRange('link').unsetLink().run();
			} else if (!/^(https?:\/\/|mailto:|tel:|\/)/.test(href)) {
				urlError = m.admin_editor_link_invalid();
				return;
			} else if (editor!.state.selection.empty && !active('link')) {
				chain()
					.insertContent({ type: 'text', text: href, marks: [{ type: 'link', attrs: { href } }] })
					.run();
			} else {
				chain().extendMarkRange('link').setLink({ href }).run();
			}
		}
		urlDialog = null;
	}

	// Images come from the media library (or a new upload inside it)
	let pickerOpen = $state(false);

	function insertImage(media: AdminMedia) {
		const src = (w: number) => mediaUrl(MEDIA_BASE_URL, variantKey(media.key, w));
		chain()
			.insertFigureImage({
				src: src(pickVariant(media.variants)),
				srcset: media.variants.map((w) => `${src(w)} ${w}w`).join(', '),
				sizes: '(min-width: 768px) 720px, 100vw',
				width: media.width,
				height: media.height,
				alt: media.alt ?? ''
			})
			.run();
	}

	let pollPickerOpen = $state(false);

	// Caption and alt text of the selected image
	let captionOpen = $state(false);
	let caption = $state('');
	let alt = $state('');

	function openCaption() {
		const attrs = editor!.getAttributes('figureImage');
		caption = attrs.caption ?? '';
		alt = attrs.alt ?? '';
		captionOpen = true;
	}

	function applyCaption() {
		chain()
			.updateAttributes('figureImage', { caption: caption.trim() || null, alt: alt.trim() })
			.run();
		captionOpen = false;
	}

	type Tool = {
		label: string;
		text: string;
		run: () => void;
		isActive?: () => boolean;
		class?: string;
	};

	const groups: Tool[][] = [
		[
			{
				label: m.admin_editor_paragraph(),
				text: '¶',
				run: () => chain().setParagraph().run(),
				isActive: () => active('paragraph')
			},
			{
				label: m.admin_editor_h2(),
				text: 'H2',
				run: () => chain().toggleHeading({ level: 2 }).run(),
				isActive: () => active('heading', { level: 2 })
			},
			{
				label: m.admin_editor_h3(),
				text: 'H3',
				run: () => chain().toggleHeading({ level: 3 }).run(),
				isActive: () => active('heading', { level: 3 })
			}
		],
		[
			{
				label: m.admin_editor_bold(),
				text: 'B',
				class: 'font-bold',
				run: () => chain().toggleBold().run(),
				isActive: () => active('bold')
			},
			{
				label: m.admin_editor_italic(),
				text: 'I',
				class: 'italic',
				run: () => chain().toggleItalic().run(),
				isActive: () => active('italic')
			},
			{
				label: m.admin_editor_underline(),
				text: 'U',
				class: 'underline',
				run: () => chain().toggleUnderline().run(),
				isActive: () => active('underline')
			},
			{
				label: m.admin_editor_strike(),
				text: 'S',
				class: 'line-through',
				run: () => chain().toggleStrike().run(),
				isActive: () => active('strike')
			},
			{
				label: m.admin_editor_link(),
				text: '🔗',
				run: () => openUrlDialog('link'),
				isActive: () => active('link')
			}
		],
		[
			{
				label: m.admin_editor_bullet_list(),
				text: '•',
				run: () => chain().toggleBulletList().run(),
				isActive: () => active('bulletList')
			},
			{
				label: m.admin_editor_ordered_list(),
				text: '1.',
				run: () => chain().toggleOrderedList().run(),
				isActive: () => active('orderedList')
			},
			{
				label: m.admin_editor_quote(),
				text: '“',
				run: () => chain().toggleBlockquote().run(),
				isActive: () => active('blockquote')
			},
			{ label: m.admin_editor_hr(), text: '—', run: () => chain().setHorizontalRule().run() }
		],
		[
			{
				label: m.admin_editor_image(),
				text: m.admin_editor_image(),
				run: () => (pickerOpen = true)
			},
			{
				label: m.admin_editor_video(),
				text: m.admin_editor_video(),
				run: () => openUrlDialog('video')
			},
			{
				label: m.admin_editor_poll(),
				text: m.admin_editor_poll(),
				run: () => (pollPickerOpen = true)
			}
		],
		[
			{ label: m.admin_editor_undo(), text: '↶', run: () => chain().undo().run() },
			{ label: m.admin_editor_redo(), text: '↷', run: () => chain().redo().run() }
		]
	];
</script>

<input type="hidden" {name} value={html} />

<div class="rounded-lg border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800">
	<div
		role="toolbar"
		aria-label={m.admin_editor_toolbar()}
		class="sticky top-0 z-10 flex flex-wrap gap-1 rounded-t-lg border-b border-gray-200 bg-gray-50 p-1.5 dark:border-gray-600 dark:bg-gray-700"
	>
		{#each groups as group, i (i)}
			<div class="flex gap-0.5 {i ? 'border-l border-gray-300 pl-1 dark:border-gray-500' : ''}">
				{#each group as tool (tool.label)}
					{@const on = tool.isActive?.() ?? false}
					<button
						type="button"
						class="min-w-9 rounded px-2 py-1 text-sm text-gray-800 hover:bg-gray-200 disabled:opacity-40 dark:text-gray-100 dark:hover:bg-gray-600 {on
							? 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-100'
							: ''} {tool.class ?? ''}"
						title={tool.label}
						aria-label={tool.label}
						aria-pressed={tool.isActive ? on : undefined}
						disabled={!editor}
						onclick={tool.run}
					>
						{tool.text}
					</button>
				{/each}
			</div>
		{/each}
		{#if active('figureImage')}
			<div class="flex gap-0.5 border-l border-gray-300 pl-1 dark:border-gray-500">
				<button
					type="button"
					class="rounded px-2 py-1 text-sm text-gray-800 hover:bg-gray-200 dark:text-gray-100 dark:hover:bg-gray-600"
					onclick={openCaption}
				>
					{m.admin_editor_image_details()}
				</button>
			</div>
		{/if}
	</div>
	<div bind:this={element} class="editor"></div>
</div>

<MediaPicker bind:open={pickerOpen} onpick={insertImage} />
<PollPicker bind:open={pollPickerOpen} onpick={(poll) => chain().insertPoll(poll).run()} />

<Modal
	open={!!urlDialog}
	title={urlDialog === 'video' ? m.admin_editor_video() : m.admin_editor_link()}
	onclose={() => (urlDialog = null)}
	size="sm"
>
	<Label for="editor-url" class="mb-2">
		{urlDialog === 'video' ? m.admin_editor_video_prompt() : m.admin_editor_link_prompt()}
	</Label>
	<Input
		id="editor-url"
		type="url"
		bind:value={url}
		placeholder="https://"
		onkeydown={(event) => {
			if (event.key !== 'Enter') return;
			event.preventDefault();
			applyUrl();
		}}
	/>
	{#if urlError}<Alert color="red">{urlError}</Alert>{/if}
	{#snippet footer()}
		<Button type="button" onclick={applyUrl}>{m.admin_editor_insert()}</Button>
		<Button type="button" color="alternative" onclick={() => (urlDialog = null)}>
			{m.admin_cancel()}
		</Button>
	{/snippet}
</Modal>

<Modal bind:open={captionOpen} title={m.admin_editor_image_details()} size="sm">
	<div>
		<Label for="editor-caption" class="mb-2">{m.admin_editor_caption()}</Label>
		<Input id="editor-caption" bind:value={caption} />
	</div>
	<div>
		<Label for="editor-alt" class="mb-2">{m.admin_media_alt()}</Label>
		<Input id="editor-alt" bind:value={alt} />
	</div>
	{#snippet footer()}
		<Button type="button" onclick={applyCaption}>{m.admin_save()}</Button>
		<Button type="button" color="alternative" onclick={() => (captionOpen = false)}>
			{m.admin_cancel()}
		</Button>
	{/snippet}
</Modal>

<style>
	/* Embedded players shouldn't swallow clicks: the node is selected instead */
	.editor :global(iframe) {
		width: 100%;
		aspect-ratio: 16 / 9;
		pointer-events: none;
		border-radius: 0.5rem;
	}

	.editor :global(figure img) {
		border-radius: 0.5rem;
	}

	.editor :global(.ProseMirror-selectednode) {
		outline: 3px solid var(--color-primary-500);
		border-radius: 0.5rem;
	}

	.editor :global(.poll-embed) {
		padding: 1rem;
		border: 2px dashed var(--color-primary-400);
		border-radius: 0.5rem;
		font-weight: 600;
	}

	.editor :global(table) {
		border-collapse: collapse;
	}

	.editor :global(td),
	.editor :global(th) {
		border: 1px solid var(--color-gray-300);
		padding: 0.25rem 0.5rem;
	}
</style>
