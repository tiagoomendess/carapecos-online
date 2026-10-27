<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { m } from '#lib/paraglide/messages.js';
	import { formatDateTime } from '#lib/format.ts';
	import type { ContactMessageView } from '#lib/types.ts';
	import Turnstile from './Turnstile.svelte';

	let { messages }: { messages: ContactMessageView[] } = $props();

	type ContactResult = {
		contact?: { error?: string; sent?: boolean };
	};
	const result = $derived((page.form as ContactResult | null)?.contact);

	let name = $state('');
	let email = $state('');
	let message = $state('');
	let engaged = $state(false);
	let token = $state('');
	let attempt = $state(0);
	let submitting = $state(false);

	const errors: Record<string, () => string> = {
		name: m.contact_error_name,
		email: m.contact_error_email,
		message: m.contact_error_message,
		bot: m.contact_error_bot,
		rate_limited: m.contact_error_rate_limited
	};

	const privacyText = m.contact_privacy({ privacy: '{privacy}' }).split(/(\{privacy\})/);
</script>

<div class="contact">
	{#if result?.sent}
		<p class="sent" role="status">{m.contact_sent()}</p>
	{/if}

	{#if messages.length}
		<section class="history" aria-labelledby="contact-history-title">
			<h2 id="contact-history-title" class="text-headline">{m.contact_history()}</h2>
			<p class="hint text-caption text-text-2">{m.contact_history_hint()}</p>
			<ol>
				{#each messages as item (item.id)}
					<li>
						<header class="meta">
							<span class="status text-caption">{m.contact_status_sent()}</span>
							<time class="text-caption text-text-2" datetime={item.createdAt.toISOString()}>
								{formatDateTime(item.createdAt)}
							</time>
						</header>
						<p class="body">{item.message}</p>
					</li>
				{/each}
			</ol>
		</section>
	{/if}

	<form
		method="post"
		action="?/contactar"
		class="form"
		onfocusin={() => (engaged = true)}
		use:enhance={() => {
			submitting = true;
			return async ({ result: outcome, update }) => {
				await update({ reset: false });
				submitting = false;
				attempt++;
				if (outcome.type === 'success') message = '';
			};
		}}
	>
		<label class="field">
			<span class="text-caption font-semibold">{m.contact_name()}</span>
			<input name="name" required maxlength={100} autocomplete="name" bind:value={name} />
		</label>
		<label class="field">
			<span class="text-caption font-semibold">{m.contact_email()}</span>
			<input
				name="email"
				type="email"
				required
				maxlength={200}
				autocomplete="email"
				bind:value={email}
			/>
		</label>
		<label class="field">
			<span class="text-caption font-semibold">{m.contact_message()}</span>
			<textarea name="message" required minlength={5} maxlength={5000} rows={6} bind:value={message}
			></textarea>
		</label>

		{#if engaged}
			{#key attempt}
				<Turnstile bind:token action="contact" />
			{/key}
		{/if}

		{#if result?.error}
			<p class="text-caption text-red-600" role="alert">
				{errors[result.error]?.() ?? m.contact_error_message()}
			</p>
		{/if}

		<button type="submit" class="submit pressable" disabled={submitting || !token}>
			{m.contact_submit()}
		</button>
		<p class="text-caption text-text-2">
			{#each privacyText as part, i (i)}
				{#if part === '{privacy}'}
					<a href={resolve('/(site)/[slug]', { slug: 'politica-de-privacidade' })}>
						{m.comments_privacy_link()}
					</a>
				{:else}
					{part}
				{/if}
			{/each}
		</p>
	</form>
</div>

<style>
	.contact {
		display: grid;
		gap: 1.25rem;
		margin-top: 2rem;
	}

	.form,
	.sent,
	.history {
		padding: 1.25rem;
		border-radius: var(--radius-card);
		background: var(--surface);
		box-shadow: 0 0 0 1px var(--separator);
	}

	.form {
		display: grid;
		gap: 0.875rem;
	}

	.hint {
		margin-top: 0.25rem;
	}

	.history ol {
		margin-top: 0.75rem;
	}

	.history li {
		padding-block: 0.875rem;
	}

	.history li:first-child {
		padding-top: 0.25rem;
	}

	.history li + li {
		border-top: 1px solid var(--separator);
	}

	.history li:last-child {
		padding-bottom: 0;
	}

	.meta {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.5rem 0.75rem;
	}

	.status {
		font-weight: 600;
		color: var(--accent);
	}

	.body {
		margin-top: 0.25rem;
		white-space: pre-line;
		overflow-wrap: anywhere;
		line-height: 1.5;
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
		font-size: 1rem;
		font-family: inherit;
	}

	.field input:focus-visible,
	.field textarea:focus-visible {
		outline: 2px solid var(--accent);
		outline-offset: 0;
	}

	.submit {
		justify-self: start;
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
