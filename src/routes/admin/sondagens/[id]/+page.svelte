<script lang="ts">
	import { Heading } from 'flowbite-svelte';
	import { m } from '#lib/paraglide/messages.js';
	import PollForm from '#lib/components/admin/PollForm.svelte';
	import type { PageProps } from './$types';

	let { data, form }: PageProps = $props();
</script>

<svelte:head>
	<title>{data.poll.question} · {m.admin_title()}</title>
</svelte:head>

<main class="mx-auto max-w-7xl space-y-4 p-4">
	<Heading tag="h1" class="text-2xl">{m.admin_poll_edit()}</Heading>
	<!-- Remounts when the saved options change, so new options get their ids (and avoid duplicates) -->
	{#key `${data.poll.id}:${data.poll.options.map((o) => o.id).join()}`}
		<PollForm poll={data.poll} errors={form?.errors} saved={form?.saved || data.justCreated} />
	{/key}
</main>
