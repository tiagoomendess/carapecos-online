<script lang="ts">
	import { page } from '$app/state';
	import { m } from '#lib/paraglide/messages.js';

	/**
	 * Head tags for search engines, social cards and LLMs: title, description, canonical URL,
	 * Open Graph / Twitter cards and JSON-LD. Pages without their own image share the brand card.
	 */
	let {
		title,
		description = m.site_description(),
		image = null,
		type = 'website',
		publishedTime,
		modifiedTime,
		section,
		jsonLd,
		noindex = false,
		alternates = []
	}: {
		/** Full `<title>`; the site name is added when it isn't the homepage */
		title: string;
		description?: string;
		image?: { url: string; width: number; height: number } | null;
		type?: 'website' | 'article';
		publishedTime?: Date;
		modifiedTime?: Date;
		section?: string;
		jsonLd?: Record<string, unknown> | Record<string, unknown>[];
		noindex?: boolean;
		alternates?: { type: string; href: string; title?: string }[];
	} = $props();

	const siteUrl = $derived((page.data.siteUrl as string | undefined) ?? page.url.origin);
	const canonical = $derived(siteUrl + page.url.pathname + page.url.search);
	const ogImage = $derived(image ?? { url: `${siteUrl}/og-default.png`, width: 1200, height: 630 });

	// `<` escaped so the JSON can't close the script tag
	const jsonLdTag = $derived(
		jsonLd
			? `<script type="application/ld+json">${JSON.stringify(jsonLd).replaceAll('<', '\\u003c')}</` +
					'script>'
			: ''
	);
</script>

<svelte:head>
	<title>{title}</title>
	<meta name="description" content={description} />
	{#if noindex}
		<meta name="robots" content="noindex" />
	{:else}
		<link rel="canonical" href={canonical} />
	{/if}

	<meta property="og:site_name" content={m.site_name()} />
	<meta property="og:locale" content="pt_PT" />
	<meta property="og:type" content={type} />
	<meta property="og:title" content={title} />
	<meta property="og:description" content={description} />
	<meta property="og:url" content={canonical} />
	<meta property="og:image" content={ogImage.url} />
	<meta property="og:image:width" content={String(ogImage.width)} />
	<meta property="og:image:height" content={String(ogImage.height)} />
	<meta name="twitter:card" content="summary_large_image" />
	{#if publishedTime}
		<meta property="article:published_time" content={publishedTime.toISOString()} />
	{/if}
	{#if modifiedTime}
		<meta property="article:modified_time" content={modifiedTime.toISOString()} />
	{/if}
	{#if section}<meta property="article:section" content={section} />{/if}

	{#each alternates as alternate (alternate.href)}
		<link rel="alternate" type={alternate.type} href={alternate.href} title={alternate.title} />
	{/each}

	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html jsonLdTag}
</svelte:head>
