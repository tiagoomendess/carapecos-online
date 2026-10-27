<script lang="ts">
	import { Badge, Input, Modal, Spinner } from 'flowbite-svelte';
	import { m } from '#lib/paraglide/messages.js';

	type PollSummary = { id: string; slug: string; question: string; status: string };

	let {
		open = $bindable(false),
		onpick
	}: { open?: boolean; onpick: (poll: { slug: string; question: string }) => void } = $props();

	let polls = $state<PollSummary[]>([]);
	let query = $state('');
	let loading = $state(false);

	async function load() {
		loading = true;
		try {
			const res = await fetch(`/admin/api/polls?${new URLSearchParams({ q: query })}`);
			polls = (await res.json()) as PollSummary[];
		} finally {
			loading = false;
		}
	}

	// Fetch when the dialog opens, so new polls show up
	$effect(() => {
		if (open) load();
	});

	function pick(poll: PollSummary) {
		open = false;
		onpick({ slug: poll.slug, question: poll.question });
	}
</script>

<Modal bind:open title={m.admin_editor_poll_pick()} size="md">
	<!-- Not a <form>: the picker opens inside the article form -->
	<Input
		type="search"
		bind:value={query}
		placeholder={m.admin_search()}
		aria-label={m.admin_search()}
		onkeydown={(event) => {
			if (event.key !== 'Enter') return;
			event.preventDefault();
			load();
		}}
	/>
	{#if loading}
		<div class="grid place-items-center py-8"><Spinner /></div>
	{:else if polls.length}
		<ul
			class="divide-y divide-gray-200 rounded-lg border border-gray-200 dark:divide-gray-600 dark:border-gray-600"
		>
			{#each polls as poll (poll.id)}
				<li>
					<button
						type="button"
						class="flex w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm text-gray-900 hover:bg-gray-100 dark:text-white dark:hover:bg-gray-600"
						onclick={() => pick(poll)}
					>
						<span>{poll.question}</span>
						{#if poll.status !== 'published'}
							<Badge color="gray">{m.admin_status_draft()}</Badge>
						{/if}
					</button>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="py-8 text-center text-gray-500">{m.admin_editor_poll_none()}</p>
	{/if}
</Modal>
