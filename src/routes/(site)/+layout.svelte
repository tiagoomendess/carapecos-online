<script lang="ts">
	import './site.css';
	import { CF_ANALYTICS_TOKEN } from '$app/env/public';
	import { onNavigate, refreshAll } from '$app/navigation';
	import { tick } from 'svelte';
	import { articleSlugFromPath, setCoverMorphSlug } from '#lib/cover-transition.svelte.ts';
	import Footer from '#lib/components/site/Footer.svelte';
	import Header from '#lib/components/site/Header.svelte';
	import PullToRefresh from '#lib/components/site/PullToRefresh.svelte';
	import Toaster from '#lib/components/site/Toaster.svelte';
	import type { LayoutProps } from './$types';

	let { data, children }: LayoutProps = $props();

	// Cross-fade between pages (and morph the cover image) where View Transitions are supported.
	// Listing → listing keeps cover names off so thumbnails stay in the page (and keep their radius).
	onNavigate((navigation) => {
		if (!document.startViewTransition || matchMedia('(prefers-reduced-motion: reduce)').matches) {
			return;
		}
		const fromSlug = articleSlugFromPath(navigation.from?.url.pathname ?? '');
		const toSlug = articleSlugFromPath(navigation.to?.url.pathname ?? '');
		setCoverMorphSlug(toSlug ?? fromSlug);

		return tick().then(
			() =>
				new Promise<void>((resolve) => {
					document.startViewTransition(async () => {
						resolve();
						await navigation.complete;
					});
				})
		);
	});
</script>

<svelte:head>
	{#if CF_ANALYTICS_TOKEN}
		<!-- Cloudflare Web Analytics: cookieless, no personal data -->
		<script
			defer
			src="https://static.cloudflareinsights.com/beacon.min.js"
			data-cf-beacon={JSON.stringify({ token: CF_ANALYTICS_TOKEN })}
		></script>
	{/if}
</svelte:head>

<Toaster />

<Header menu={data.menu} />
<!-- The header stays put; the page and footer follow the finger -->
<PullToRefresh onrefresh={refreshAll}>
	<!-- At least the rest of the screen, so a short page still has its footer at the bottom -->
	<div class="flex min-h-[calc(100dvh-var(--header-h)-env(safe-area-inset-top))] flex-col">
		<div class="flex-1">
			{@render children()}
		</div>
		<Footer pages={data.footerPages} />
	</div>
</PullToRefresh>
