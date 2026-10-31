<script lang="ts">
	import { onMount, type Component } from 'svelte';
	import { Editor } from '@tiptap/core';
	import StarterKit from '@tiptap/starter-kit';
	import { TableKit } from '@tiptap/extension-table';
	import TextAlign from '@tiptap/extension-text-align';
	import { TextStyleKit } from '@tiptap/extension-text-style';
	import { Alert, Button, Input, Label, Modal } from 'flowbite-svelte';
	import {
		AlignCenterOutline,
		AlignJustifyOutline,
		AlignLeftOutline,
		AlignRightOutline,
		ChartPieOutline,
		CodeOutline,
		ImageOutline,
		LetterBoldOutline,
		LetterItalicOutline,
		LetterUnderlineOutline,
		LinkOutline,
		ListOutline,
		MinusOutline,
		OrderedListOutline,
		QuoteOutline,
		RedoOutline,
		TableColumnOutline,
		TextSlashOutline,
		UndoOutline,
		VideoCameraOutline
	} from 'flowbite-svelte-icons';
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
					heading: { levels: [2, 3, 4] },
					code: false,
					codeBlock: false,
					link: { openOnClick: false, autolink: true, HTMLAttributes: { target: null } }
				}),
				// Only colour and size: the sanitizer drops the other text styles
				TextStyleKit.configure({ backgroundColor: false, fontFamily: false, lineHeight: false }),
				TextAlign.configure({ types: ['heading', 'paragraph'] }),
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

	const blockType = $derived.by(() => {
		void revision;
		if (!editor) return 'paragraph';
		for (const level of [2, 3, 4]) if (editor.isActive('heading', { level })) return `h${level}`;
		return 'paragraph';
	});

	function setBlockType(type: string) {
		if (type === 'paragraph') chain().setParagraph().run();
		else
			chain()
				.setHeading({ level: Number(type.slice(1)) as 2 | 3 | 4 })
				.run();
	}

	const FONT_SIZES = ['12px', '14px', '16px', '18px', '20px', '24px', '28px', '32px'];
	const fontSize = $derived.by(() => {
		void revision;
		return (editor?.getAttributes('textStyle').fontSize as string | undefined) ?? '';
	});

	function setFontSize(size: string) {
		if (size) chain().setFontSize(size).run();
		else chain().unsetFontSize().run();
	}

	const color = $derived.by(() => {
		void revision;
		return (editor?.getAttributes('textStyle').color as string | undefined) ?? '#000000';
	});

	// HTML source view: the textarea edits the hidden input directly; the editor reloads it after
	let source = $state(false);

	function toggleSource() {
		if (source && editor) {
			editor.commands.setContent(html, { emitUpdate: false });
			html = editor.getHTML();
		}
		source = !source;
	}

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
		icon?: Component;
		text?: string;
		run: () => void;
		isActive?: () => boolean;
		class?: string;
	};

	const marks: Tool[] = [
		{
			label: m.admin_editor_bold(),
			icon: LetterBoldOutline,
			run: () => chain().toggleBold().run(),
			isActive: () => active('bold')
		},
		{
			label: m.admin_editor_italic(),
			icon: LetterItalicOutline,
			run: () => chain().toggleItalic().run(),
			isActive: () => active('italic')
		},
		{
			label: m.admin_editor_underline(),
			icon: LetterUnderlineOutline,
			run: () => chain().toggleUnderline().run(),
			isActive: () => active('underline')
		},
		{
			label: m.admin_editor_strike(),
			text: 'S',
			class: 'font-semibold line-through',
			run: () => chain().toggleStrike().run(),
			isActive: () => active('strike')
		},
		{
			label: m.admin_editor_link(),
			icon: LinkOutline,
			run: () => openUrlDialog('link'),
			isActive: () => active('link')
		}
	];

	const clearFormat: Tool = {
		label: m.admin_editor_clear_format(),
		icon: TextSlashOutline,
		run: () => chain().unsetAllMarks().clearNodes().unsetTextAlign().run()
	};

	const groups: Tool[][] = [
		(
			[
				['left', m.admin_editor_align_left(), AlignLeftOutline],
				['center', m.admin_editor_align_center(), AlignCenterOutline],
				['right', m.admin_editor_align_right(), AlignRightOutline],
				['justify', m.admin_editor_align_justify(), AlignJustifyOutline]
			] as const
		).map(([align, label, icon]) => ({
			label,
			icon,
			run: () => chain().setTextAlign(align).run(),
			isActive: () => active({ textAlign: align })
		})),
		[
			{
				label: m.admin_editor_bullet_list(),
				icon: ListOutline,
				run: () => chain().toggleBulletList().run(),
				isActive: () => active('bulletList')
			},
			{
				label: m.admin_editor_ordered_list(),
				icon: OrderedListOutline,
				run: () => chain().toggleOrderedList().run(),
				isActive: () => active('orderedList')
			},
			{
				label: m.admin_editor_quote(),
				icon: QuoteOutline,
				run: () => chain().toggleBlockquote().run(),
				isActive: () => active('blockquote')
			},
			{
				label: m.admin_editor_hr(),
				icon: MinusOutline,
				run: () => chain().setHorizontalRule().run()
			}
		],
		[
			{
				label: m.admin_editor_image(),
				icon: ImageOutline,
				text: m.admin_editor_image(),
				run: () => (pickerOpen = true)
			},
			{
				label: m.admin_editor_video(),
				icon: VideoCameraOutline,
				text: m.admin_editor_video(),
				run: () => openUrlDialog('video')
			},
			{
				label: m.admin_editor_poll(),
				icon: ChartPieOutline,
				text: m.admin_editor_poll(),
				run: () => (pollPickerOpen = true)
			},
			{
				label: m.admin_editor_table(),
				icon: TableColumnOutline,
				text: m.admin_editor_table(),
				run: () => chain().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
			}
		],
		[
			{ label: m.admin_editor_undo(), icon: UndoOutline, run: () => chain().undo().run() },
			{ label: m.admin_editor_redo(), icon: RedoOutline, run: () => chain().redo().run() }
		]
	];

	const tableTools: Tool[] = [
		{
			label: m.admin_editor_table_row_add(),
			text: '+ ' + m.admin_editor_table_row(),
			run: () => chain().addRowAfter().run()
		},
		{
			label: m.admin_editor_table_row_delete(),
			text: '− ' + m.admin_editor_table_row(),
			run: () => chain().deleteRow().run()
		},
		{
			label: m.admin_editor_table_column_add(),
			text: '+ ' + m.admin_editor_table_column(),
			run: () => chain().addColumnAfter().run()
		},
		{
			label: m.admin_editor_table_column_delete(),
			text: '− ' + m.admin_editor_table_column(),
			run: () => chain().deleteColumn().run()
		},
		{
			label: m.admin_editor_table_delete(),
			text: m.admin_editor_table_delete(),
			run: () => chain().deleteTable().run()
		}
	];

	const buttonClass = (on: boolean) => [
		'inline-flex h-8 min-w-8 items-center justify-center gap-1 rounded px-1.5 text-sm text-gray-800 hover:bg-gray-200 disabled:opacity-40 dark:text-gray-100 dark:hover:bg-gray-600',
		on && 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-100'
	];
	const selectClass =
		'h-8 rounded border-gray-300 bg-white py-0 ps-2 pe-7 text-sm text-gray-900 focus:border-primary-500 focus:ring-primary-500 disabled:opacity-40 dark:border-gray-600 dark:bg-gray-700 dark:text-white';
	const groupClass = 'flex items-center gap-0.5 border-l border-gray-300 pl-1 dark:border-gray-500';
</script>

{#snippet toolButton(tool: Tool)}
	{@const on = tool.isActive?.() ?? false}
	<button
		type="button"
		class={[buttonClass(on), tool.class]}
		title={tool.label}
		aria-label={tool.label}
		aria-pressed={tool.isActive ? on : undefined}
		disabled={!editor || source}
		onclick={tool.run}
	>
		{#if tool.icon}<tool.icon class="size-5 shrink-0" aria-hidden="true" />{/if}
		{#if tool.text}<span class={tool.icon && 'hidden sm:inline'}>{tool.text}</span>{/if}
	</button>
{/snippet}

<input type="hidden" {name} value={html} />

<div class="rounded-lg border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800">
	<div
		role="toolbar"
		aria-label={m.admin_editor_toolbar()}
		class="sticky top-0 z-10 flex flex-wrap items-center gap-1 rounded-t-lg border-b border-gray-200 bg-gray-50 p-1.5 dark:border-gray-600 dark:bg-gray-700"
	>
		<div class="flex items-center gap-1">
			<select
				class={selectClass}
				aria-label={m.admin_editor_block_type()}
				title={m.admin_editor_block_type()}
				value={blockType}
				disabled={!editor || source}
				onchange={(event) => setBlockType(event.currentTarget.value)}
			>
				<option value="paragraph">{m.admin_editor_paragraph()}</option>
				<option value="h2">{m.admin_editor_h2()}</option>
				<option value="h3">{m.admin_editor_h3()}</option>
				<option value="h4">{m.admin_editor_h4()}</option>
			</select>
			<select
				class={selectClass}
				aria-label={m.admin_editor_font_size()}
				title={m.admin_editor_font_size()}
				value={fontSize}
				disabled={!editor || source}
				onchange={(event) => setFontSize(event.currentTarget.value)}
			>
				<option value="">{m.admin_editor_font_size_default()}</option>
				{#each FONT_SIZES as size (size)}
					<option value={size}>{size}</option>
				{/each}
			</select>
		</div>
		<div class={groupClass}>
			{#each marks as tool (tool.label)}{@render toolButton(tool)}{/each}
			<label
				class={[
					buttonClass(false),
					'relative cursor-pointer',
					(!editor || source) && 'pointer-events-none opacity-40'
				]}
				title={m.admin_editor_color()}
			>
				<span
					class="size-4 rounded-sm border border-gray-400"
					style:background-color={color}
					aria-hidden="true"
				></span>
				<input
					type="color"
					class="absolute inset-0 cursor-pointer opacity-0"
					aria-label={m.admin_editor_color()}
					value={color}
					disabled={!editor || source}
					oninput={(event) => chain().setColor(event.currentTarget.value).run()}
				/>
			</label>
			{@render toolButton(clearFormat)}
		</div>
		{#each groups as group, i (i)}
			<div class={groupClass}>
				{#each group as tool (tool.label)}{@render toolButton(tool)}{/each}
			</div>
		{/each}
		{#if active('figureImage') && !source}
			<div class={groupClass}>
				<button type="button" class={buttonClass(false)} onclick={openCaption}>
					{m.admin_editor_image_details()}
				</button>
			</div>
		{/if}
		<button
			type="button"
			class={[buttonClass(source), 'ms-auto']}
			title={m.admin_editor_source()}
			aria-label={m.admin_editor_source()}
			aria-pressed={source}
			disabled={!editor}
			onclick={toggleSource}
		>
			<CodeOutline class="size-5" aria-hidden="true" />
		</button>
	</div>
	{#if active('table') && !source}
		<div
			role="toolbar"
			aria-label={m.admin_editor_table()}
			class="flex flex-wrap items-center gap-1 border-b border-gray-200 bg-gray-50 px-1.5 py-1 dark:border-gray-600 dark:bg-gray-700"
		>
			{#each tableTools as tool (tool.label)}{@render toolButton(tool)}{/each}
		</div>
	{/if}
	{#if source}
		<textarea
			class="block min-h-80 w-full resize-y rounded-b-lg border-0 bg-white p-4 font-mono text-sm text-gray-900 focus:ring-0 dark:bg-gray-800 dark:text-gray-100"
			aria-label={m.admin_editor_source()}
			spellcheck="false"
			bind:value={html}
			oninput={() => onchange?.()}></textarea>
	{/if}
	<div bind:this={element} class={['editor', source && 'hidden']}></div>
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
		width: 100%;
	}

	.editor :global(td),
	.editor :global(th) {
		border: 1px solid var(--color-gray-300);
		padding: 0.25rem 0.5rem;
		position: relative;
		vertical-align: top;
	}

	:global(.dark) .editor :global(td),
	:global(.dark) .editor :global(th) {
		border-color: var(--color-gray-600);
	}

	/* The cells of a multi-cell selection */
	.editor :global(.selectedCell)::after {
		background: color-mix(in srgb, var(--color-primary-500) 20%, transparent);
		content: '';
		inset: 0;
		pointer-events: none;
		position: absolute;
	}
</style>
