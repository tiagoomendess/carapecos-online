<script lang="ts">
	import { page as currentPage } from '$app/state';
	import { m } from '#lib/paraglide/messages.js';

	let { page, pages }: { page: number; pages: number } = $props();

	// Same listing (filters kept), another page
	function hrefFor(n: number) {
		const url = new URL(currentPage.url.href);
		url.searchParams.set('pagina', String(n));
		return url.pathname + url.search;
	}

	const link =
		'rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-200';
</script>

{#if pages > 1}
	<nav class="flex items-center justify-between gap-3" aria-label={m.pagination_label()}>
		{#if page > 1}
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- same page, other query -->
			<a href={hrefFor(page - 1)} class={link}>{m.admin_previous()}</a>
		{:else}
			<span></span>
		{/if}
		<span class="text-sm text-gray-500">{m.admin_page_status({ page, pages })}</span>
		{#if page < pages}
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- same page, other query -->
			<a href={hrefFor(page + 1)} class={link}>{m.admin_next()}</a>
		{:else}
			<span></span>
		{/if}
	</nav>
{/if}
