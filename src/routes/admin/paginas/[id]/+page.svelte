<script lang="ts">
	import { Heading } from 'flowbite-svelte';
	import { m } from '#lib/paraglide/messages.js';
	import PageForm from '#lib/components/admin/PageForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.page.title} · {m.admin_title()}</title>
</svelte:head>

<main class="mx-auto max-w-7xl space-y-4 p-4">
	<Heading tag="h1" class="text-2xl">{m.admin_page_edit()}</Heading>
	{#key data.page.id}
		<PageForm page={data.page} errors={form?.errors} saved={form?.saved || data.justCreated} />
	{/key}
</main>
