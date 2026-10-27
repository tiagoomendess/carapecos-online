<script lang="ts">
	import { Heading } from 'flowbite-svelte';
	import { m } from '#lib/paraglide/messages.js';
	import ArticleForm from '#lib/components/admin/ArticleForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.article.title} · {m.admin_title()}</title>
</svelte:head>

<main class="mx-auto max-w-7xl space-y-4 p-4">
	<Heading tag="h1" class="text-2xl">{m.admin_article_edit()}</Heading>
	<!-- Keyed, so the form starts fresh when moving to another article -->
	{#key data.article.id}
		<ArticleForm
			article={data.article}
			categories={data.categories}
			errors={form?.errors}
			saved={form?.saved || data.justCreated}
		/>
	{/key}
</main>
