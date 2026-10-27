<script lang="ts">
	import { page } from '$app/state';
	import { m } from '#lib/paraglide/messages.js';
	import Comments from '#lib/components/site/Comments.svelte';
	import Poll from '#lib/components/site/Poll.svelte';
	import ShareButtons from '#lib/components/site/ShareButtons.svelte';
	import Seo from '#lib/components/site/Seo.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const url = $derived(data.siteUrl + page.url.pathname);
</script>

<Seo
	title="{m.poll_page_title({ question: data.poll.question })} · {m.site_name()}"
	description={data.poll.question}
/>

<main class="mx-auto max-w-[40rem] px-(--gutter) pt-2">
	<h1 class="sr-only">{data.poll.question}</h1>
	<Poll poll={data.poll} headingLevel={2} linkTitle={false} />
	<div class="mt-5">
		<ShareButtons {url} title={data.poll.question} />
	</div>
	<Comments comments={data.comments} />
</main>
