<script lang="ts">
	import { page as currentPage } from '$app/state';
	import { m } from '#lib/paraglide/messages.js';
	import Icon from './Icon.svelte';

	let { page, pages }: { page: number; pages: number } = $props();

	// Keeps other query parameters (e.g. the search query); page 1 has no `pagina`
	function hrefFor(n: number) {
		const url = new URL(currentPage.url.href);
		if (n === 1) url.searchParams.delete('pagina');
		else url.searchParams.set('pagina', String(n));
		return url.pathname + url.search;
	}
</script>

{#if pages > 1}
	<nav class="pagination" aria-label={m.pagination_label()}>
		{#if page > 1}
			<!-- Same page with another `pagina`, already a full path -->
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
			<a href={hrefFor(page - 1)} class="button pressable" rel="prev">
				<Icon name="chevronLeft" size={18} />
				{m.pagination_newer()}
			</a>
		{:else}
			<span></span>
		{/if}
		<span class="status text-caption">{m.pagination_status({ page, pages })}</span>
		{#if page < pages}
			<!-- Same page with another `pagina`, already a full path -->
			<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -->
			<a href={hrefFor(page + 1)} class="button pressable" rel="next">
				{m.pagination_older()}
				<Icon name="chevronRight" size={18} />
			</a>
		{:else}
			<span></span>
		{/if}
	</nav>
{/if}

<style>
	.pagination {
		display: grid;
		grid-template-columns: 1fr auto 1fr;
		align-items: center;
		gap: 0.75rem;
	}

	.pagination > :first-child {
		justify-self: start;
	}

	.pagination > :last-child {
		justify-self: end;
	}

	.button {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.625rem 1rem;
		border-radius: 999px;
		background: var(--surface);
		box-shadow: 0 0 0 1px var(--separator);
		font-size: 0.9375rem;
		font-weight: 600;
		white-space: nowrap;
	}

	.status {
		color: var(--text-2);
		text-align: center;
	}
</style>
