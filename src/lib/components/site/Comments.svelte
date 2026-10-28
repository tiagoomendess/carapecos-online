<script lang="ts">
	import { onMount, tick } from 'svelte';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { m } from '#lib/paraglide/messages.js';
	import { formatListDate } from '#lib/format.ts';
	import type { CommentView } from '#lib/types.ts';
	import Turnstile from './Turnstile.svelte';
	import { toast } from '#lib/toast.ts';

	let { comments }: { comments: CommentView[] } = $props();

	type CommentResult = {
		comment?: {
			error?: string;
			name?: string;
			body?: string;
			parentId?: string;
			published?: string;
		};
		reported?: string;
	};
	const result = $derived(page.form as CommentResult | null);

	const total = $derived(comments.reduce((sum, c) => sum + 1 + c.replies.length, 0));

	let name = $state('');
	let body = $state('');
	let replyTo = $state<{ id: string; name: string } | null>(null);
	// The bot check loads once the reader starts writing
	let engaged = $state(false);
	let token = $state('');
	let attempt = $state(0);
	let submitting = $state(false);
	let reported = $state<string[]>([]);
	let textarea: HTMLTextAreaElement;

	onMount(() => {
		try {
			name = localStorage.getItem('commentName') ?? '';
			reported = JSON.parse(localStorage.getItem('reportedComments') ?? '[]');
		} catch {
			// Storage unavailable
		}
	});

	const errors: Record<string, () => string> = {
		name: m.comments_error_name,
		body: m.comments_error_body,
		too_many_links: m.comments_error_too_many_links,
		blocked_words: m.comments_error_blocked_words,
		bot: m.comments_error_bot,
		rate_limited: m.comments_error_rate_limited,
		not_found: m.comments_error_not_found
	};

	async function reply(comment: { id: string; authorName: string }) {
		replyTo = { id: comment.id, name: comment.authorName };
		engaged = true;
		await tick();
		textarea.focus();
		textarea.scrollIntoView({ block: 'center', behavior: 'smooth' });
	}

	// The sentence with its two links, split so the links can be real elements
	const rulesText = m
		.comments_rules({ rules: '{rules}', privacy: '{privacy}' })
		.split(/(\{rules\}|\{privacy\})/);

	function remember(key: string, value: string) {
		try {
			localStorage.setItem(key, value);
		} catch {
			// Storage unavailable
		}
	}
</script>

{#snippet item(comment: Omit<CommentView, 'replies'>, isReply: boolean, threadId: string)}
	<article id="comentario-{comment.id}" class="comment" class:reply={isReply}>
		<header class="flex flex-wrap items-baseline gap-x-2">
			<span class="font-semibold">{comment.authorName}</span>
			<time class="text-caption text-text-2" datetime={comment.createdAt.toISOString()}>
				{formatListDate(comment.createdAt)}
			</time>
		</header>
		<p class="body">{comment.body}</p>
		<div class="actions text-caption">
			<button type="button" onclick={() => reply({ id: threadId, authorName: comment.authorName })}>
				{m.comments_reply()}
			</button>
			{#if reported.includes(comment.id) || result?.reported === comment.id}
				<span class="text-text-2">{m.comments_reported()}</span>
			{:else}
				<form
					method="post"
					action="?/reportar"
					use:enhance={({ cancel }) => {
						if (!confirm(m.comments_report_confirm())) return cancel();
						reported = [...reported, comment.id];
						remember('reportedComments', JSON.stringify(reported.slice(-200)));
						return ({ update }) => update({ reset: false, refreshAll: false });
					}}
				>
					<input type="hidden" name="commentId" value={comment.id} />
					<button type="submit">{m.comments_report()}</button>
				</form>
			{/if}
		</div>
	</article>
{/snippet}

<section id="comentarios" class="comments" aria-labelledby="comments-title">
	<h2 id="comments-title" class="text-title">
		{m.comments_title()}
		{#if total}
			<span class="font-normal text-text-2">
				· {total === 1 ? m.comments_count_one() : m.comments_count_other({ count: total })}
			</span>
		{/if}
	</h2>

	{#if comments.length}
		<ol class="mt-6 grid gap-5">
			{#each comments as comment (comment.id)}
				<li>
					{@render item(comment, false, comment.id)}
					{#if comment.replies.length}
						<ol class="mt-3 grid gap-3">
							{#each comment.replies as replyItem (replyItem.id)}
								<li>{@render item(replyItem, true, comment.id)}</li>
							{/each}
						</ol>
					{/if}
				</li>
			{/each}
		</ol>
	{:else}
		<p class="mt-4 text-text-2">{m.comments_empty()}</p>
	{/if}

	<form
		method="post"
		action="?/comentar#comentarios"
		class="form"
		onfocusin={() => (engaged = true)}
		use:enhance={() => {
			submitting = true;
			remember('commentName', name);
			return async ({ result, update }) => {
				await update({ reset: false });
				submitting = false;
				attempt++;
				if (result.type === 'success') {
					const id = (result.data as CommentResult | undefined)?.comment?.published;
					if (!id) return;
					body = '';
					replyTo = null;
					toast(m.comments_published());
					await tick();
					document.getElementById(`comentario-${id}`)?.scrollIntoView({ block: 'center' });
				}
			};
		}}
	>
		{#if replyTo}
			<div class="replying text-caption">
				<span>{m.comments_reply_to({ name: replyTo.name })}</span>
				<button type="button" onclick={() => (replyTo = null)}>{m.comments_cancel_reply()}</button>
			</div>
			<input type="hidden" name="parentId" value={replyTo.id} />
		{/if}

		<label class="field">
			<span class="text-caption font-semibold">{m.comments_name()}</span>
			<input
				name="name"
				bind:value={name}
				required
				minlength={2}
				maxlength={60}
				autocomplete="nickname"
			/>
		</label>
		<label class="field">
			<span class="text-caption font-semibold">{m.comments_body()}</span>
			<textarea
				bind:this={textarea}
				name="body"
				bind:value={body}
				required
				minlength={2}
				maxlength={2000}
				rows={4}></textarea>
		</label>

		{#if engaged}
			{#key attempt}
				<Turnstile bind:token action="comment" />
			{/key}
		{/if}

		{#if result?.comment?.error}
			<p class="text-caption text-red-600" role="alert">
				{errors[result.comment.error]?.() ?? m.comments_error_body()}
			</p>
		{/if}

		<div class="flex flex-wrap items-center gap-3">
			<button type="submit" class="submit pressable" disabled={submitting || !token}>
				{m.comments_submit()}
			</button>
			<p class="text-caption text-text-2">
				{#each rulesText as part, i (i)}
					{#if part === '{rules}'}
						<a href={resolve('/(site)/[slug]', { slug: 'regras-dos-comentarios' })}>
							{m.comments_rules_link()}
						</a>
					{:else if part === '{privacy}'}
						<a href={resolve('/(site)/[slug]', { slug: 'politica-de-privacidade' })}>
							{m.comments_privacy_link()}
						</a>
					{:else}
						{part}
					{/if}
				{/each}
			</p>
		</div>
	</form>
</section>

<style>
	.comments {
		margin-top: 3.5rem;
		padding-top: 2rem;
		border-top: 1px solid var(--separator);
	}

	.comment.reply {
		margin-left: 1rem;
		padding-left: 1rem;
		border-left: 2px solid var(--separator);
	}

	.body {
		margin-top: 0.25rem;
		white-space: pre-line;
		overflow-wrap: anywhere;
		line-height: 1.5;
	}

	.actions {
		display: flex;
		gap: 1rem;
		margin-top: 0.375rem;
		color: var(--text-2);
	}

	.actions button {
		font-weight: 600;
	}

	@media (hover: hover) {
		.actions button:hover {
			color: var(--text);
		}
	}

	.form {
		display: grid;
		gap: 0.875rem;
		margin-top: 2rem;
		padding: 1.25rem;
		border-radius: var(--radius-card);
		background: var(--surface);
		box-shadow: 0 0 0 1px var(--separator);
	}

	.replying {
		display: flex;
		justify-content: space-between;
		gap: 1rem;
		padding: 0.5rem 0.75rem;
		border-radius: 0.75rem;
		background: var(--accent-soft);
	}

	.replying button {
		font-weight: 600;
		color: var(--accent);
	}

	.field {
		display: grid;
		gap: 0.375rem;
	}

	.field input,
	.field textarea {
		width: 100%;
		padding: 0.625rem 0.75rem;
		border: 0;
		border-radius: 0.75rem;
		background: var(--surface-2);
		color: var(--text);
		/* 16px or more, so iOS doesn't zoom in on focus */
		font-size: 1rem;
		font-family: inherit;
	}

	.field textarea {
		resize: vertical;
	}

	.field input:focus-visible,
	.field textarea:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 0;
	}

	.submit {
		padding: 0.625rem 1.25rem;
		border-radius: 999px;
		background: var(--text);
		color: var(--bg);
		font-weight: 600;
	}

	.submit:disabled {
		opacity: 0.4;
	}

	a {
		color: var(--accent);
		text-decoration: underline;
		text-underline-offset: 0.15em;
	}
</style>
