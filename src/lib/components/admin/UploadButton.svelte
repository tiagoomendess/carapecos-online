<script lang="ts">
	import { Alert, Button, Spinner } from 'flowbite-svelte';
	import { m } from '#lib/paraglide/messages.js';
	import { type AdminMedia, prepareImage, uploadImage } from '#lib/admin/image.ts';

	let {
		onuploaded,
		multiple = false,
		label = m.admin_media_upload()
	}: {
		onuploaded: (media: AdminMedia[]) => void;
		multiple?: boolean;
		label?: string;
	} = $props();

	let input: HTMLInputElement;
	let progress = $state<{ done: number; total: number } | null>(null);
	let errors = $state<string[]>([]);

	/** Resizes each image in the browser, then uploads it; failures are listed, the rest go on */
	async function upload() {
		const files = [...(input.files ?? [])];
		input.value = '';
		if (!files.length) return;

		errors = [];
		progress = { done: 0, total: files.length };
		const uploaded: AdminMedia[] = [];
		for (const file of files) {
			try {
				uploaded.push(await uploadImage(await prepareImage(file)));
			} catch (error) {
				errors.push(
					m.admin_media_upload_failed({ name: file.name, reason: (error as Error).message })
				);
			}
			progress.done++;
		}
		progress = null;
		if (uploaded.length) onuploaded(uploaded);
	}
</script>

<input
	bind:this={input}
	type="file"
	accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/avif"
	{multiple}
	class="hidden"
	onchange={upload}
/>
<Button type="button" disabled={!!progress} onclick={() => input.click()}>
	{#if progress}
		<Spinner size="4" class="me-2" />
		{m.admin_media_uploading(progress)}
	{:else}
		{label}
	{/if}
</Button>

{#each errors as error (error)}
	<Alert color="red" class="mt-2 w-full">{error}</Alert>
{/each}
