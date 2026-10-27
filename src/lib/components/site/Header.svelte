<script lang="ts">
	import { resolve } from '$app/paths';
	import { afterNavigate } from '$app/navigation';
	import { page } from '$app/state';
	import { m } from '#lib/paraglide/messages.js';
	import type { NavPage } from '#lib/types.ts';
	import Icon from './Icon.svelte';
	import SiteMenu from './SiteMenu.svelte';
	import ThemeToggle from './ThemeToggle.svelte';

	let { menu = [] }: { menu?: NavPage[] } = $props();

	const isHome = $derived(page.url.pathname === '/');

	// Going "back" only makes sense when the previous page was on this site
	let cameFromSite = $state(false);
	// Visible near the top of the home page; hides once the reader has moved into the feed
	let scrolled = $state(false);

	function syncScroll() {
		scrolled = window.scrollY > 200;
	}

	afterNavigate(({ from }) => {
		if (from) cameFromSite = true;
		syncScroll();
	});

	function back(event: MouseEvent) {
		if (!cameFromSite || event.metaKey || event.ctrlKey || event.shiftKey) return;
		event.preventDefault();
		history.back();
	}
</script>

<!-- Floating Liquid Glass controls; content scrolls underneath -->
<header class="header">
	<div class="slot">
		{#if isHome && menu.length}
			<SiteMenu pages={menu} />
		{:else if !isHome}
			<a
				href={resolve('/(site)')}
				class="glass pressable grid size-11 place-items-center rounded-full"
				onclick={back}
				aria-label={m.nav_back()}
				title={m.nav_back()}
			>
				<Icon name="back" />
			</a>
		{/if}
	</div>

	<a
		href={resolve('/(site)')}
		class="glass pressable flex h-11 items-center gap-2 rounded-full pr-4 pl-1.5"
		aria-label={m.nav_home()}
	>
		<img src="/logo-128.webp" alt="" width="32" height="32" class="size-8" />
		<span class="text-[0.9375rem] font-semibold tracking-[-0.01em] whitespace-nowrap">
			{m.site_name()}
		</span>
	</a>

	<div class="slot justify-end">
		<ThemeToggle />
	</div>
</header>

{#if isHome}
	<a
		href={resolve('/(site)/pesquisa')}
		class={['search', 'glass', 'pressable', { away: scrolled }]}
		aria-label={m.nav_search()}
		title={m.nav_search()}
		aria-hidden={scrolled}
		inert={scrolled}
	>
		<Icon name="search" />
	</a>
{/if}

<svelte:window onscroll={syncScroll} />

<style>
	.header {
		position: sticky;
		top: 0;
		z-index: 30;
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		gap: 0.5rem;
		height: var(--header-h);
		padding-inline: max(var(--gutter), env(safe-area-inset-left));
		padding-top: env(safe-area-inset-top);
		box-sizing: content-box;
		/* Scroll edge effect: soften content that slides under the controls, no hard divider */
		background: linear-gradient(to bottom, var(--bg) 0%, transparent 100%);
	}

	.slot {
		display: flex;
		min-width: 0;
	}

	.search {
		position: fixed;
		z-index: 30;
		right: max(var(--gutter), env(safe-area-inset-right));
		bottom: calc(1rem + env(safe-area-inset-bottom));
		display: grid;
		width: 2.75rem;
		height: 2.75rem;
		place-items: center;
		border-radius: 999px;
		color: var(--text);
		transition:
			opacity 180ms var(--ease-out),
			transform 180ms var(--ease-out);
	}

	.search.away {
		opacity: 0;
		transform: translateY(0.75rem);
		pointer-events: none;
	}

	@media (prefers-reduced-motion: reduce) {
		.search {
			transition: none;
		}
	}
</style>
