<script lang="ts">
	import { m } from '#lib/paraglide/messages.js';
	import ContactForm from '#lib/components/site/ContactForm.svelte';
	import PageMenu from '#lib/components/site/PageMenu.svelte';
	import Seo from '#lib/components/site/Seo.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<Seo title="{data.page.title} · {m.site_name()}" description={data.page.description} />

<main class="mx-auto max-w-[48rem] px-(--gutter) pt-2">
	<h1 class="text-display">{data.page.title}</h1>
	<!-- Sanitized when saved in the editor -->
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	<div class="article-body mt-6">{@html data.page.body}</div>
	{#if data.links.length}
		<PageMenu links={data.links} />
	{/if}
	{#if data.contactForm}
		<ContactForm messages={data.contactMessages} />
	{/if}
</main>
