<script lang="ts">
	import { Button, Input, Modal, Spinner } from 'flowbite-svelte';
	import { m } from '#lib/paraglide/messages.js';
	import type { AdminMedia } from '#lib/admin/image.ts';
	import MediaThumb from './MediaThumb.svelte';
	import UploadButton from './UploadButton.svelte';

	let {
		open = $bindable(false),
		onpick
	}: {
		open?: boolean;
		onpick: (media: AdminMedia) => void;
	} = $props();

	let items = $state<AdminMedia[]>([]);
	let page = $state(1);
	let pages = $state(1);
	let query = $state('');
	let loading = $state(false);

	async function load() {
		loading = true;
		try {
			const params = new URLSearchParams({ pagina: String(page), q: query });
			const res = await fetch(`/admin/api/media?${params}`);
			const data = (await res.json()) as { items: AdminMedia[]; pages: number };
			items = data.items;
			pages = data.pages;
		} finally {
			loading = false;
		}
	}

	// Reload whenever the dialog opens, so new uploads show up
	$effect(() => {
		if (open) {
			page = 1;
			load();
		}
	});

	function pick(media: AdminMedia) {
		open = false;
		onpick(media);
	}

	function search() {
		page = 1;
		load();
	}

	function goTo(n: number) {
		page = n;
		load();
	}
</script>

<Modal bind:open title={m.admin_media_library()} size="xl">
	<div class="flex flex-wrap items-center gap-3">
		<!-- Not a <form>: the picker can open inside the article form -->
		<div class="flex flex-1 gap-2" role="search">
			<Input
				type="search"
				bind:value={query}
				placeholder={m.admin_media_search()}
				class="flex-1"
				onkeydown={(event) => {
					if (event.key !== 'Enter') return;
					event.preventDefault();
					search();
				}}
			/>
			<Button type="button" color="alternative" onclick={search}>{m.admin_search()}</Button>
		</div>
		<!-- An upload goes straight into the article -->
		<UploadButton onuploaded={(uploaded) => uploaded[0] && pick(uploaded[0])} />
	</div>

	{#if loading}
		<div class="grid place-items-center py-16"><Spinner /></div>
	{:else if items.length}
		<ul class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
			{#each items as item (item.id)}
				<li>
					<button
						type="button"
						class="ring-primary-500 block w-full rounded-lg text-left hover:ring-2 focus-visible:ring-2"
						onclick={() => pick(item)}
					>
						<MediaThumb media={item} />
					</button>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="py-12 text-center text-gray-500">{m.admin_media_empty()}</p>
	{/if}

	{#if pages > 1}
		<div class="flex items-center justify-between">
			<Button
				type="button"
				size="sm"
				color="alternative"
				disabled={page <= 1}
				onclick={() => goTo(page - 1)}
			>
				{m.admin_previous()}
			</Button>
			<span class="text-sm text-gray-500">{m.admin_page_status({ page, pages })}</span>
			<Button
				type="button"
				size="sm"
				color="alternative"
				disabled={page >= pages}
				onclick={() => goTo(page + 1)}
			>
				{m.admin_next()}
			</Button>
		</div>
	{/if}
</Modal>
