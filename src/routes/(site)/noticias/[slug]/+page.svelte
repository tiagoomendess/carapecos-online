<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { m } from '#lib/paraglide/messages.js';
	import { formatDateTime } from '#lib/format.ts';
	import ArticleCard from '#lib/components/site/ArticleCard.svelte';
	import Cover from '#lib/components/site/Cover.svelte';
	import Comments from '#lib/components/site/Comments.svelte';
	import Poll from '#lib/components/site/Poll.svelte';
	import ShareButtons from '#lib/components/site/ShareButtons.svelte';
	import { coverTransitionName } from '#lib/cover-transition.svelte.ts';
	import { splitPollEmbeds } from '#lib/poll-embeds.ts';
	import Seo from '#lib/components/site/Seo.svelte';
	import { newsArticle, shareImage } from '#lib/seo.ts';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const article = $derived(data.article);
	const url = $derived(data.siteUrl + page.url.pathname);
	const parts = $derived(splitPollEmbeds(article.body));

	// One view per article per browser session, sent once the page is actually shown
	$effect(() => {
		const key = `viewed:${article.id}`;
		try {
			if (sessionStorage.getItem(key)) return;
			sessionStorage.setItem(key, '1');
		} catch {
			// Storage unavailable: count it anyway
		}
		navigator.sendBeacon('/api/vistas', article.id);
	});
</script>

<Seo
	title="{article.title} · {m.site_name()}"
	description={article.summary}
	type="article"
	image={article.cover ? shareImage(article.cover) : null}
	publishedTime={article.publishedAt}
	modifiedTime={article.updatedAt}
	section={article.category.name}
	jsonLd={newsArticle(data.siteUrl, article)}
	alternates={[{ type: 'text/markdown', href: `/noticias/${article.slug}.md` }]}
/>

<main class="mx-auto max-w-[48rem] px-(--gutter) pt-2">
	<article>
		<div class="cover">
			<Cover
				image={article.cover}
				alt={article.title}
				sizes="(min-width: 768px) 768px, 100vw"
				eager
				transitionName={coverTransitionName(article.slug, true)}
			/>
		</div>

		<header class="mt-6">
			<p class="text-caption flex flex-wrap gap-1.5 text-text-2">
				<a
					href={resolve('/(site)/categoria/[slug]', { slug: article.category.slug })}
					class="font-semibold text-accent"
				>
					{article.category.name}
				</a>
				<span aria-hidden="true">·</span>
				<time datetime={article.publishedAt.toISOString()}>
					{formatDateTime(article.publishedAt)}
				</time>
			</p>
			<h1 class="text-display mt-2">{article.title}</h1>
			{#if article.lead}
				<p class="lead">{article.lead}</p>
			{/if}
			<div class="mt-5">
				<ShareButtons {url} title={article.title} />
			</div>
		</header>

		<!-- Sanitized when saved (by the editor or the import); embedded polls are live components -->
		<div class="article-body mt-8">
			{#each parts as part, i (i)}
				{#if 'html' in part}
					<!-- eslint-disable-next-line svelte/no-at-html-tags -->
					{@html part.html}
				{:else if data.polls[part.poll]}
					<Poll poll={data.polls[part.poll]} />
				{/if}
			{/each}
		</div>
	</article>

	{#if data.related.length}
		<section class="related" aria-labelledby="related-title">
			<h2 id="related-title" class="text-title mb-5">
				{m.article_more_in({ category: article.category.name })}
			</h2>
			<ul class="grid gap-5">
				{#each data.related as related (related.id)}
					<li><ArticleCard article={related} /></li>
				{/each}
			</ul>
		</section>
	{/if}

	<Comments comments={data.comments} />
</main>

<style>
	.cover {
		margin-inline: calc(-1 * var(--gutter));
	}

	.cover :global(.cover) {
		border-radius: 0;
	}

	.lead {
		margin-top: 0.875rem;
		font-size: 1.1875rem;
		line-height: 1.45;
		letter-spacing: -0.005em;
		color: var(--text-2);
	}

	.related {
		margin-top: 3.5rem;
		padding-top: 2rem;
		border-top: 1px solid var(--separator);
	}

	@media (min-width: 768px) {
		.cover {
			margin-inline: 0;
		}

		.cover :global(.cover) {
			border-radius: var(--radius-card);
		}
	}
</style>
