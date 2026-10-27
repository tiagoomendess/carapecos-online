<script lang="ts">
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { m } from '#lib/paraglide/messages.js';
	import { formatDateTime } from '#lib/format.ts';
	import type { PollView } from '#lib/types.ts';
	import Turnstile from './Turnstile.svelte';

	let {
		poll,
		headingLevel = 3,
		linkTitle = true
	}: { poll: PollView; headingLevel?: 2 | 3; linkTitle?: boolean } = $props();

	let selected = $state<string[]>([]);
	let token = $state('');
	let attempt = $state(0);
	let submitting = $state(false);
	// Second line of defence next to the cookie: this browser's own record of its votes
	let votedHere = $state(false);

	const storageKey = $derived(`poll:${poll.id}`);

	onMount(() => {
		try {
			votedHere = !!localStorage.getItem(storageKey);
		} catch {
			// Storage unavailable
		}
	});

	// Result of the last vote, when it was for this poll (the action may run from any page)
	const result = $derived(
		(page.form as { poll?: string; error?: string; voted?: boolean } | null)?.poll === poll.slug
			? (page.form as { error?: string; voted?: boolean })
			: null
	);

	const errorMessages: Record<string, () => string> = {
		not_found: m.poll_error_not_found,
		closed: m.poll_error_closed,
		already_voted: m.poll_error_already_voted,
		choose: m.poll_error_choose,
		bot: m.poll_error_bot,
		rate_limited: m.poll_error_rate_limited
	};

	const canVote = $derived(!poll.showResults && !poll.closed && !votedHere);
	const total = $derived(poll.options.reduce((sum, option) => sum + (option.votes ?? 0), 0));
	const percent = (votes: number | null) => (total ? Math.round(((votes ?? 0) / total) * 100) : 0);
	const leader = $derived(Math.max(...poll.options.map((o) => o.votes ?? 0)));

	const href = $derived(resolve('/(site)/sondagens/[slug]', { slug: poll.slug }));
	const titleId = $derived(`poll-${poll.id}`);
</script>

<section class="poll" aria-labelledby={titleId}>
	<p class="text-eyebrow text-accent">{m.poll_label()}</p>
	<svelte:element this={`h${headingLevel}`} id={titleId} class="text-headline mt-1">
		{#if linkTitle}
			<a {href}>{poll.question}</a>
		{:else}
			{poll.question}
		{/if}
	</svelte:element>

	{#if canVote}
		<form
			method="post"
			action="{href}?/votar"
			class="mt-4"
			use:enhance={() => {
				submitting = true;
				return async ({ result, update }) => {
					if (result.type === 'success') {
						try {
							localStorage.setItem(storageKey, '1');
						} catch {
							// Storage unavailable
						}
					}
					// Stay on the page the poll is embedded in, with refreshed results
					await update({ reset: false, refreshAll: true, navigate: false });
					submitting = false;
					attempt++;
				};
			}}
		>
			<fieldset aria-labelledby={titleId}>
				{#if poll.multipleChoice}
					<p class="text-caption mb-2 text-text-2">{m.poll_multiple_hint()}</p>
				{/if}
				<div class="grid gap-2">
					{#each poll.options as option (option.id)}
						<label class="option pressable">
							{#if poll.multipleChoice}
								<input type="checkbox" name="option" value={option.id} bind:group={selected} />
							{:else}
								<input
									type="radio"
									name="option"
									value={option.id}
									checked={selected[0] === option.id}
									onchange={() => (selected = [option.id])}
								/>
							{/if}
							<span>{option.label}</span>
						</label>
					{/each}
				</div>
			</fieldset>

			<!-- The bot check loads only once the reader picks an option -->
			{#if selected.length}
				<div class="mt-3">
					{#key attempt}
						<Turnstile bind:token action="vote" />
					{/key}
				</div>
			{/if}

			{#if result?.error}
				<p class="text-caption mt-3 text-red-600" role="alert">
					{errorMessages[result.error]?.() ?? m.poll_error_choose()}
				</p>
			{/if}

			<div class="mt-4 flex flex-wrap items-center justify-between gap-3">
				<button
					type="submit"
					class="vote pressable"
					disabled={!selected.length || !token || submitting}
				>
					{m.poll_vote()}
				</button>
				<span class="text-caption text-text-2">{m.poll_results_hidden()}</span>
			</div>
		</form>
	{:else if poll.showResults}
		<ul class="mt-4 grid gap-3">
			{#each poll.options as option (option.id)}
				{@const value = percent(option.votes)}
				<li>
					<div class="flex justify-between gap-3 text-[0.9375rem]">
						<span class:font-semibold={option.votes === leader && leader > 0}>{option.label}</span>
						<span class="font-semibold tabular-nums">{value}%</span>
					</div>
					<div class="bar" aria-hidden="true">
						<div
							class="fill"
							class:leader={option.votes === leader && leader > 0}
							style:width="{value}%"
						></div>
					</div>
				</li>
			{/each}
		</ul>
		<p class="text-caption mt-4 text-text-2">
			{poll.voters === 1 ? m.poll_voters_one() : m.poll_voters_other({ count: poll.voters ?? 0 })}
			{#if poll.closed}
				· {m.poll_closed()}
			{:else if result?.voted || poll.voted}
				· {m.poll_thanks()}
			{/if}
		</p>
	{:else}
		<!-- Voted from this browser but the cookie is gone: no second vote, no results -->
		<p class="text-caption mt-3 text-text-2">{m.poll_error_already_voted()}</p>
	{/if}

	{#if poll.closesAt && !poll.closed}
		<p class="text-caption mt-2 text-text-2">
			{m.poll_closes({ date: formatDateTime(poll.closesAt) })}
		</p>
	{/if}
</section>

<style>
	.poll {
		padding: 1.25rem;
		border-radius: var(--radius-card);
		background: var(--surface);
		box-shadow: 0 0 0 1px var(--separator);
	}

	/* `.poll` in front so these win over article body styles when embedded in an article */
	.poll a {
		color: inherit;
		text-decoration: none;
	}

	.poll ul {
		list-style: none;
		padding-left: 0;
	}

	.poll li + li {
		margin-top: 0;
	}

	.poll :is(h2, h3) {
		margin-top: 0.25rem;
		font-size: 1.0625rem;
		line-height: 1.3;
		letter-spacing: -0.01em;
		font-weight: 600;
	}

	@media (hover: hover) {
		.poll a:hover {
			text-decoration: underline;
			text-underline-offset: 0.15em;
		}
	}

	.option {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 0.9rem;
		border-radius: 0.875rem;
		background: var(--surface-2);
		cursor: pointer;
		font-size: 0.9375rem;
		line-height: 1.3;
	}

	.option:has(input:checked) {
		background: var(--accent-soft);
		box-shadow: inset 0 0 0 1.5px var(--accent);
	}

	.option input {
		width: 1.125rem;
		height: 1.125rem;
		accent-color: var(--accent);
		flex: none;
	}

	.vote {
		padding: 0.625rem 1.25rem;
		border-radius: 999px;
		background: var(--text);
		color: var(--bg);
		font-weight: 600;
		font-size: 0.9375rem;
	}

	.vote:disabled {
		opacity: 0.4;
	}

	.bar {
		margin-top: 0.375rem;
		height: 0.5rem;
		border-radius: 999px;
		background: var(--surface-2);
		overflow: hidden;
	}

	.fill {
		height: 100%;
		border-radius: inherit;
		background: var(--text-2);
		transition: width 600ms var(--ease-out);
	}

	/* Grow in from zero when the results first appear */
	@starting-style {
		.fill {
			width: 0;
		}
	}

	.fill.leader {
		background: var(--brand);
	}

	@media (prefers-reduced-motion: reduce) {
		.fill {
			transition: none;
		}
	}
</style>
