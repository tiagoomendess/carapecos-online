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
	afterNavigate(({ from }) => {
		if (from) cameFromSite = true;
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
		<div class="glass flex rounded-full">
			<a
				href={resolve('/(site)/pesquisa')}
				class="pressable grid size-11 place-items-center rounded-full"
				aria-label={m.nav_search()}
				title={m.nav_search()}
			>
				<Icon name="search" />
			</a>
			<ThemeToggle />
		</div>
	</div>
</header>

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
</style>
