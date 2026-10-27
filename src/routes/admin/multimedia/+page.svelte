<script lang="ts">
	import { MEDIA_BASE_URL } from '$app/env/public';
	import { invalidateAll } from '$app/navigation';
	import { Alert, Button, Heading, Helper, Input, Label, Modal } from 'flowbite-svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { formatDateTime } from '#lib/format.ts';
	import { pickVariant, variantKey } from '#lib/media.ts';
	import { mediaUrl } from '#lib/storage.ts';
	import AdminPagination from '#lib/components/admin/AdminPagination.svelte';
	import MediaThumb from '#lib/components/admin/MediaThumb.svelte';
	import UploadButton from '#lib/components/admin/UploadButton.svelte';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	type Item = PageProps['data']['media']['items'][number];

	let selected = $state<Item | null>(null);
	let alt = $state('');
	let busy = $state(false);
	let error = $state<string | null>(null);

	function open(item: Item) {
		selected = item;
		alt = item.alt ?? '';
		error = null;
	}

	async function saveAlt() {
		if (!selected) return;
		busy = true;
		await fetch(`/admin/api/media/${selected.id}`, {
			method: 'PATCH',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ alt })
		});
		busy = false;
		selected = null;
		await invalidateAll();
	}

	async function remove() {
		if (!selected || !confirm(m.admin_confirm_delete({ title: selected.originalName ?? '' }))) {
			return;
		}
		busy = true;
		const res = await fetch(`/admin/api/media/${selected.id}`, { method: 'DELETE' });
		busy = false;
		if (!res.ok) {
			error =
				((await res.json().catch(() => null)) as { message?: string } | null)?.message ??
				res.statusText;
			return;
		}
		selected = null;
		await invalidateAll();
	}
</script>

<svelte:head>
	<title>{m.admin_media_title()} · {m.admin_title()}</title>
</svelte:head>

<main class="mx-auto max-w-6xl space-y-4 p-4">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<Heading tag="h1" class="w-auto text-2xl">{m.admin_media_title()}</Heading>
		<div><UploadButton multiple onuploaded={() => invalidateAll()} /></div>
	</div>

	<form method="get" class="flex gap-2" data-sveltekit-keepfocus>
		<Input
			type="search"
			name="q"
			value={data.query}
			placeholder={m.admin_media_search()}
			aria-label={m.admin_media_search()}
			class="flex-1"
		/>
		<Button type="submit" color="alternative">{m.admin_search()}</Button>
	</form>

	{#if data.media.items.length}
		<ul class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
			{#each data.media.items as item (item.id)}
				<li>
					<button
						type="button"
						class="ring-primary-500 block w-full rounded-lg text-left hover:ring-2 focus-visible:ring-2"
						onclick={() => open(item)}
					>
						<MediaThumb media={item} />
					</button>
				</li>
			{/each}
		</ul>
	{:else}
		<p class="py-12 text-center text-gray-500">{m.admin_media_empty()}</p>
	{/if}

	<AdminPagination page={data.media.page} pages={data.media.pages} />
</main>

<Modal
	open={!!selected}
	onclose={() => (selected = null)}
	title={m.admin_media_details()}
	size="lg"
>
	{#if selected}
		<img
			src={mediaUrl(MEDIA_BASE_URL, variantKey(selected.key, pickVariant(selected.variants)))}
			alt={selected.alt ?? ''}
			class="max-h-96 w-full rounded-lg bg-gray-100 object-contain dark:bg-gray-700"
		/>
		<p class="text-sm text-gray-500">
			{selected.originalName} ·
			{m.admin_media_dimensions({ width: selected.width, height: selected.height })} ·
			{formatDateTime(selected.createdAt)}
		</p>
		<div>
			<Label for="media-alt" class="mb-2">{m.admin_media_alt()}</Label>
			<Input id="media-alt" bind:value={alt} maxlength={300} />
			<Helper class="mt-1">{m.admin_media_alt_hint()}</Helper>
		</div>
		{#if error}<Alert color="red">{error}</Alert>{/if}
	{/if}
	{#snippet footer()}
		<div class="flex w-full justify-between gap-2">
			<Button type="button" onclick={saveAlt} disabled={busy}>{m.admin_save()}</Button>
			<Button type="button" color="red" outline onclick={remove} disabled={busy}>
				{m.admin_delete()}
			</Button>
		</div>
	{/snippet}
</Modal>
