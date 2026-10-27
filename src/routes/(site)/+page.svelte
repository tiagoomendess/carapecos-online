<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import ArticleCard from '#lib/components/site/ArticleCard.svelte';
	import CategoryChips from '#lib/components/site/CategoryChips.svelte';
	import MostRead from '#lib/components/site/MostRead.svelte';
	import Pagination from '#lib/components/site/Pagination.svelte';
	import Poll from '#lib/components/site/Poll.svelte';
	import Seo from '#lib/components/site/Seo.svelte';
	import { website } from '#lib/seo.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const title = $derived(
		data.feed.page > 1
			? m.page_title_paged({ title: m.site_name(), page: data.feed.page })
			: `${m.site_name()}: ${m.site_tagline()}`
	);
</script>

<Seo
	{title}
	jsonLd={data.feed.page === 1 ? website(data.siteUrl) : undefined}
	alternates={[{ type: 'application/rss+xml', href: '/rss.xml', title: m.site_name() }]}
/>

<CategoryChips categories={data.categories} current={null} />

<main class="mx-auto max-w-[70rem] px-(--gutter)">
	<h1 class="sr-only">{m.site_name()}</h1>

	<div class="layout">
		<div class="min-w-0">
			{#if data.featured}
				<section aria-label={m.home_featured()} class="mb-8">
					<ArticleCard article={data.featured} variant="featured" eager headingLevel={2} />
				</section>
			{/if}

			<section aria-labelledby="latest-title">
				<h2 id="latest-title" class="text-eyebrow mb-4 text-text-2">{m.home_latest()}</h2>
				{#if data.feed.items.length}
					<ul class="feed">
						{#each data.feed.items as item, i (item.kind === 'poll' ? item.poll.id : item.article.id)}
							<li>
								{#if item.kind === 'poll'}
									<Poll poll={item.poll} />
								{:else}
									<ArticleCard article={item.article} eager={!data.featured && i < 2} />
								{/if}
							</li>
						{/each}
					</ul>
				{:else}
					<p class="text-text-2">{m.feed_empty()}</p>
				{/if}
			</section>

			<div class="mt-8">
				<Pagination page={data.feed.page} pages={data.feed.pages} />
			</div>
		</div>

		<aside class="aside">
			<MostRead articles={data.mostRead} />
		</aside>
	</div>
</main>

<style>
	.layout {
		display: grid;
		gap: 2.5rem;
		padding-top: 0.5rem;
	}

	.feed {
		display: grid;
		gap: 1.25rem;
	}

	.feed > li + li {
		padding-top: 1.25rem;
		border-top: 1px solid var(--separator);
	}

	@media (min-width: 1024px) {
		.layout {
			grid-template-columns: minmax(0, 1fr) 20rem;
			gap: 3rem;
		}

		.aside {
			position: sticky;
			top: calc(var(--header-h) + 1rem);
			align-self: start;
		}
	}
</style>
