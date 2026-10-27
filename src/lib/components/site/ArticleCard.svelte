<script lang="ts">
	import { resolve } from '$app/paths';
	import { formatListDate } from '#lib/format.ts';
	import { coverTransitionName } from '#lib/cover-transition.svelte.ts';
	import type { ArticleCard } from '#lib/types.ts';
	import Cover from './Cover.svelte';

	let {
		article,
		variant = 'row',
		eager = false,
		headingLevel = 3
	}: {
		article: ArticleCard;
		/** `featured`: full width, title under the picture. `row`: small picture, title to its right. */
		variant?: 'featured' | 'row';
		eager?: boolean;
		headingLevel?: 2 | 3;
	} = $props();

	const href = $derived(resolve('/(site)/noticias/[slug]', { slug: article.slug }));
	const transitionName = $derived(coverTransitionName(article.slug));
</script>

<article class="card {variant}">
	<a {href} class="pressable cover-link" tabindex="-1" aria-hidden="true">
		<Cover
			image={article.cover}
			alt={article.title}
			sizes={variant === 'featured'
				? '(min-width: 1024px) 720px, 100vw'
				: '(min-width: 768px) 220px, 128px'}
			{eager}
			{transitionName}
		/>
	</a>
	<div class="text">
		<p class="meta text-caption">
			<a
				href={resolve('/(site)/categoria/[slug]', { slug: article.category.slug })}
				class="category">{article.category.name}</a
			>
			<span aria-hidden="true">·</span>
			<time datetime={article.publishedAt.toISOString()}>{formatListDate(article.publishedAt)}</time
			>
		</p>
		<svelte:element
			this={`h${headingLevel}`}
			class="title {variant === 'featured' ? 'text-title' : 'text-headline'}"
		>
			<a {href} class="title-link">{article.title}</a>
		</svelte:element>
		{#if variant === 'featured'}
			<p class="summary">{article.summary}</p>
		{/if}
	</div>
</article>

<style>
	.card {
		position: relative;
	}

	.cover-link {
		display: block;
		overflow: hidden;
		border-radius: var(--radius-card);
		/* Radius must also live on Cover (the named VT element), not only here */
		--cover-radius: var(--radius-card);
		/* Clip the image to the radius during the press scale too */
		isolation: isolate;
	}

	.meta {
		display: flex;
		flex-wrap: wrap;
		gap: 0.375rem;
		color: var(--text-2);
	}

	.category {
		color: var(--accent);
		font-weight: 600;
	}

	.title-link {
		color: inherit;
	}

	@media (hover: hover) {
		.title-link:hover {
			text-decoration: underline;
			text-decoration-thickness: 1px;
			text-underline-offset: 0.15em;
		}
	}

	.summary {
		margin-top: 0.5rem;
		color: var(--text-2);
		line-height: 1.45;
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		overflow: hidden;
	}

	.featured .text {
		margin-top: 0.875rem;
	}

	.featured .meta {
		margin-bottom: 0.375rem;
	}

	.row {
		display: grid;
		grid-template-columns: 8rem 1fr;
		gap: 0.875rem;
		align-items: start;
	}

	.row .cover-link {
		--cover-radius: 0.75rem;
		border-radius: 0.75rem;
	}

	.row .meta {
		margin-bottom: 0.25rem;
	}

	.row .title {
		display: -webkit-box;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 3;
		line-clamp: 3;
		overflow: hidden;
	}

	@media (min-width: 768px) {
		.row {
			grid-template-columns: 13.75rem 1fr;
			gap: 1.25rem;
		}

		.row .text-headline {
			font-size: 1.1875rem;
		}
	}
</style>
