<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import ArticleCard from '#lib/components/site/ArticleCard.svelte';
	import CategoryChips from '#lib/components/site/CategoryChips.svelte';
	import Pagination from '#lib/components/site/Pagination.svelte';
	import Seo from '#lib/components/site/Seo.svelte';
	import { breadcrumbs } from '#lib/seo.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const title = $derived(
		data.feed.page > 1
			? m.page_title_paged({ title: data.category.name, page: data.feed.page })
			: data.category.name
	);
</script>

<Seo
	title="{title} · {m.site_name()}"
	description={data.category.description ?? `${data.category.name}: ${m.site_description()}`}
	jsonLd={breadcrumbs(data.siteUrl, [
		{ name: m.site_name(), path: '/' },
		{ name: data.category.name, path: `/categoria/${data.category.slug}` }
	])}
/>

<CategoryChips categories={data.categories} current={data.category.slug} />

<main class="mx-auto max-w-[48rem] px-(--gutter) pt-2">
	<h1 class="text-display mb-6">{data.category.name}</h1>

	{#if data.feed.items.length}
		<ul class="feed">
			{#each data.feed.items as article, i (article.id)}
				<li>
					<ArticleCard {article} eager={i < 2} headingLevel={2} />
				</li>
			{/each}
		</ul>
	{:else}
		<p class="text-text-2">{m.category_empty()}</p>
	{/if}

	<div class="mt-8">
		<Pagination page={data.feed.page} pages={data.feed.pages} />
	</div>
</main>

<style>
	.feed {
		display: grid;
		gap: 1.25rem;
	}

	.feed > li + li {
		padding-top: 1.25rem;
		border-top: 1px solid var(--separator);
	}
</style>
