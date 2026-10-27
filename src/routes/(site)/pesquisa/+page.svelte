<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import ArticleCard from '#lib/components/site/ArticleCard.svelte';
	import Icon from '#lib/components/site/Icon.svelte';
	import Pagination from '#lib/components/site/Pagination.svelte';
	import Poll from '#lib/components/site/Poll.svelte';
	import Seo from '#lib/components/site/Seo.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<!-- Result pages are endless variations; keep them out of search engines -->
<Seo
	title="{data.query
		? m.search_results({ query: data.query })
		: m.search_title()} · {m.site_name()}"
	noindex
/>

<main class="mx-auto max-w-[48rem] px-(--gutter) pt-2">
	<h1 class="text-display">{m.search_title()}</h1>

	<form role="search" action="/pesquisa" method="get" class="search glass">
		<Icon name="search" size={20} />
		<!-- svelte-ignore a11y_autofocus -->
		<input
			type="search"
			name="q"
			value={data.query}
			placeholder={m.search_placeholder()}
			aria-label={m.search_placeholder()}
			autocomplete="off"
			enterkeyhint="search"
			autofocus={!data.query}
		/>
		<button type="submit" class="sr-only">{m.search_submit()}</button>
	</form>

	{#if data.results}
		<p class="text-caption mt-6 mb-5 text-text-2" aria-live="polite">
			{#if data.results.total}
				{m.search_results({ query: data.query })} ·
				{data.results.total === 1
					? m.search_count_one()
					: m.search_count_other({ count: data.results.total })}
			{:else}
				{m.search_empty({ query: data.query })}
			{/if}
		</p>

		<ul class="results">
			{#each data.results.items as item (item.kind === 'poll' ? item.poll.id : item.article.id)}
				<li>
					{#if item.kind === 'poll'}
						<Poll poll={item.poll} headingLevel={2} />
					{:else}
						<ArticleCard article={item.article} headingLevel={2} />
					{/if}
				</li>
			{/each}
		</ul>

		<div class="mt-8">
			<Pagination page={data.results.page} pages={data.results.pages} />
		</div>
	{:else}
		<p class="mt-4 text-text-2">{m.search_intro()}</p>
	{/if}
</main>

<style>
	.search {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-top: 1.25rem;
		padding-inline: 1rem;
		border-radius: 999px;
		color: var(--text-2);
	}

	.search:focus-within {
		outline: 2px solid var(--accent);
		outline-offset: 2px;
	}

	input {
		flex: 1;
		min-width: 0;
		height: 3rem;
		border: 0;
		background: transparent;
		color: var(--text);
		/* 16px or more, so iOS doesn't zoom in on focus */
		font-size: 1.0625rem;
		outline: none;
	}

	input::placeholder {
		color: var(--text-2);
	}

	.results {
		display: grid;
		gap: 1.25rem;
	}

	.results > li + li {
		padding-top: 1.25rem;
		border-top: 1px solid var(--separator);
	}
</style>
