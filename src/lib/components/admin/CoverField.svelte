<script lang="ts">
	import { Alert, Button, Helper, Label, Modal, Range, Spinner } from 'flowbite-svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { type MediaRef, prepareImage, uploadImage } from '#lib/admin/image.ts';
	import MediaPicker from './MediaPicker.svelte';
	import MediaThumb from './MediaThumb.svelte';

	type Cover = MediaRef;

	let { cover = $bindable(null), name = 'coverId' }: { cover?: Cover | null; name?: string } =
		$props();

	let pickerOpen = $state(false);
	let fileInput: HTMLInputElement;

	// Framing a new upload to 16:9
	let file = $state<File | null>(null);
	let preview = $state<string | null>(null);
	let landscape = $state(true);
	let position = $state(50);
	let uploading = $state(false);
	let error = $state<string | null>(null);

	function choose() {
		const chosen = fileInput.files?.[0];
		fileInput.value = '';
		if (!chosen) return;
		file = chosen;
		position = 50;
		error = null;
		preview = URL.createObjectURL(chosen);
	}

	function closeCrop() {
		if (preview) URL.revokeObjectURL(preview);
		preview = null;
		file = null;
	}

	async function useCropped() {
		if (!file) return;
		uploading = true;
		error = null;
		try {
			cover = await uploadImage(await prepareImage(file, { crop: { position: position / 100 } }));
			closeCrop();
		} catch (e) {
			error = (e as Error).message;
		} finally {
			uploading = false;
		}
	}
</script>

<div>
	<Label class="mb-2">{m.admin_field_cover()}</Label>
	<input type="hidden" {name} value={cover?.id ?? ''} />

	{#if cover}
		<div class="max-w-sm"><MediaThumb media={cover} /></div>
	{:else}
		<Helper class="mb-2">{m.admin_cover_none()}</Helper>
	{/if}

	<div class="mt-2 flex flex-wrap gap-2">
		<input bind:this={fileInput} type="file" accept="image/*" class="hidden" onchange={choose} />
		<Button type="button" size="sm" onclick={() => fileInput.click()}
			>{m.admin_media_upload()}</Button
		>
		<Button type="button" size="sm" color="alternative" onclick={() => (pickerOpen = true)}>
			{m.admin_media_library()}
		</Button>
		{#if cover}
			<Button type="button" size="sm" color="alternative" onclick={() => (cover = null)}>
				{m.admin_cover_remove()}
			</Button>
		{/if}
	</div>
</div>

<MediaPicker bind:open={pickerOpen} onpick={(media) => (cover = media)} />

<Modal open={!!preview} title={m.admin_cover_crop_title()} onclose={closeCrop} size="lg">
	<p class="text-sm text-gray-500">{m.admin_cover_crop_hint()}</p>
	{#if preview}
		<img
			src={preview}
			alt=""
			class="aspect-video w-full rounded-lg bg-gray-900 object-cover"
			style:object-position={landscape ? `${position}% 50%` : `50% ${position}%`}
			onload={(event) => {
				const img = event.currentTarget as HTMLImageElement;
				landscape = img.naturalWidth / img.naturalHeight > 16 / 9;
			}}
		/>
	{/if}
	<div>
		<Label for="cover-position" class="mb-1">{m.admin_cover_crop_position()}</Label>
		<Range id="cover-position" min={0} max={100} bind:value={position} />
	</div>
	{#if error}
		<Alert color="red">{error}</Alert>
	{/if}
	{#snippet footer()}
		<Button type="button" onclick={useCropped} disabled={uploading}>
			{#if uploading}<Spinner size="4" class="me-2" />{/if}
			{m.admin_cover_use()}
		</Button>
		<Button type="button" color="alternative" onclick={closeCrop}>{m.admin_cancel()}</Button>
	{/snippet}
</Modal>
