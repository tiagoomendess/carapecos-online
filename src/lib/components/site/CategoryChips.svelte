<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '#lib/paraglide/messages.js';
	import type { CategoryLink } from '#lib/types.ts';

	let { categories, current }: { categories: CategoryLink[]; current: string | null } = $props();

	const chips = $derived([
		{ name: m.nav_all(), href: resolve('/(site)'), slug: null },
		...categories.map((category) => ({
			name: category.name,
			href: resolve('/(site)/categoria/[slug]', { slug: category.slug }),
			slug: category.slug
		}))
	]);

	// Center the current chip, e.g. when arriving on a category further down the list.
	// Takes the slug so it re-runs when the category changes.
	const revealCurrent = (slug: string | null) => (list: HTMLElement) => {
		const active = list.querySelector<HTMLElement>(`[data-slug="${slug ?? ''}"]`);
		if (!active) return;
		const offset =
			active.getBoundingClientRect().left - list.getBoundingClientRect().left + list.scrollLeft;
		const left = offset - (list.clientWidth - active.offsetWidth) / 2;
		const animate = list.scrollLeft && !matchMedia('(prefers-reduced-motion: reduce)').matches;
		list.scrollTo({ left: Math.max(0, left), behavior: animate ? 'smooth' : 'instant' });
	};
</script>

<nav aria-label={m.nav_categories()}>
	<ul class="chips" {@attach revealCurrent(current)}>
		{#each chips as chip (chip.href)}
			<li>
				<a
					href={chip.href}
					class="chip pressable"
					aria-current={chip.slug === current ? 'page' : undefined}
					data-slug={chip.slug ?? ''}
					data-sveltekit-noscroll
				>
					{chip.name}
				</a>
			</li>
		{/each}
	</ul>
</nav>

<style>
	nav {
		max-width: 70rem;
		margin-inline: auto;
	}

	.chips {
		display: flex;
		gap: 0.5rem;
		overflow-x: auto;
		scroll-snap-type: x proximity;
		scroll-padding-inline: var(--gutter);
		padding: 0.25rem var(--gutter) 0.75rem;
		scrollbar-width: none;
		/* Fade the edges where chips scroll out of view */
		mask-image: linear-gradient(
			to right,
			transparent,
			#000 var(--gutter),
			#000 calc(100% - var(--gutter)),
			transparent
		);
	}

	.chips::-webkit-scrollbar {
		display: none;
	}

	li {
		flex: none;
		scroll-snap-align: start;
	}

	.chip {
		display: block;
		padding: 0.5rem 0.95rem;
		border-radius: 999px;
		font-size: 0.875rem;
		font-weight: 600;
		line-height: 1.2;
		white-space: nowrap;
		background: var(--surface);
		color: var(--text);
		box-shadow: 0 0 0 1px var(--separator);
		transition:
			background-color 200ms ease,
			color 200ms ease,
			transform 160ms var(--ease-out);
	}

	.chip[aria-current='page'] {
		background: var(--text);
		color: var(--bg);
		box-shadow: none;
	}

	@media (hover: hover) {
		.chip:not([aria-current='page']):hover {
			background: var(--surface-2);
		}
	}
</style>
