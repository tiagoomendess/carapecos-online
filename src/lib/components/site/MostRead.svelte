<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import type { ArticleCard } from '#lib/types.ts';

	let { articles }: { articles: ArticleCard[] } = $props();
</script>

{#if articles.length}
	<section class="most-read" aria-labelledby="most-read-title">
		<h2 id="most-read-title" class="text-eyebrow text-text-2">{m.home_most_read()}</h2>
		<ol>
			{#each articles as article, i (article.id)}
				<li>
					<span class="rank" aria-hidden="true">{i + 1}</span>
					<a href={resolve('/(site)/noticias/[slug]', { slug: article.slug })} class="text-headline"
						>{article.title}</a
					>
				</li>
			{/each}
		</ol>
	</section>
{/if}

<style>
	.most-read {
		padding: 1.25rem;
		border-radius: var(--radius-card);
		background: var(--surface);
		box-shadow: 0 0 0 1px var(--separator);
	}

	ol {
		margin-top: 0.75rem;
	}

	li {
		display: grid;
		grid-template-columns: 1.75rem 1fr;
		gap: 0.5rem;
		padding-block: 0.75rem;
	}

	li + li {
		border-top: 1px solid var(--separator);
	}

	.rank {
		font-size: 1.375rem;
		line-height: 1.1;
		font-weight: 700;
		color: var(--accent);
		font-variant-numeric: tabular-nums;
	}

	.text-headline {
		font-size: 0.9375rem;
	}

	@media (hover: hover) {
		a:hover {
			text-decoration: underline;
			text-underline-offset: 0.15em;
		}
	}
</style>
