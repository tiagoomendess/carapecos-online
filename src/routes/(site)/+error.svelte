<script lang="ts">
	import { resolve } from '$app/paths';
	import { page } from '$app/state';
	import { m } from '#lib/paraglide/messages.js';

	const notFound = $derived(page.status === 404);
</script>

<svelte:head>
	<title>{notFound ? m.error_not_found_title() : m.error_generic_title()} · {m.site_name()}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="mx-auto grid max-w-[32rem] justify-items-center px-(--gutter) pt-16 text-center">
	<p class="text-display text-accent">{page.status}</p>
	<h1 class="text-title mt-3">{notFound ? m.error_not_found_title() : m.error_generic_title()}</h1>
	<p class="mt-3 text-text-2">{notFound ? m.error_not_found_text() : m.error_generic_text()}</p>
	<a href={resolve('/(site)')} class="button pressable mt-8">{m.error_home()}</a>
</main>

<style>
	.button {
		padding: 0.75rem 1.25rem;
		border-radius: 999px;
		background: var(--text);
		color: var(--bg);
		font-weight: 600;
	}
</style>
