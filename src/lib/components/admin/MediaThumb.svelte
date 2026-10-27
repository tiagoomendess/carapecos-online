<script lang="ts">
	import { MEDIA_BASE_URL } from '$app/env/public';
	import { variantKey } from '#lib/media.ts';
	import { mediaUrl } from '#lib/storage.ts';
	import { m } from '#lib/paraglide/messages.js';
	import type { MediaRef } from '#lib/admin/image.ts';

	let { media }: { media: Omit<MediaRef, 'id'> } = $props();

	const src = $derived(
		mediaUrl(MEDIA_BASE_URL, variantKey(media.key, Math.min(...media.variants)))
	);
</script>

<figure>
	<img
		{src}
		alt={media.alt ?? ''}
		loading="lazy"
		class="aspect-video w-full rounded-lg bg-gray-100 object-cover dark:bg-gray-700"
	/>
	<figcaption class="mt-1 truncate text-xs text-gray-500" title={media.originalName ?? ''}>
		{media.originalName ?? media.key}
		<span class="block"
			>{m.admin_media_dimensions({ width: media.width, height: media.height })}</span
		>
	</figcaption>
</figure>
