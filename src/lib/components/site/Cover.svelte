<script lang="ts">
	import { MEDIA_BASE_URL } from '$app/env/public';
	import { mediaUrl } from '#lib/storage.ts';
	import { pickVariant, variantKey } from '#lib/media.ts';
	import type { Image } from '#lib/types.ts';

	let {
		image,
		alt,
		sizes,
		eager = false,
		transitionName
	}: {
		image: Image | null;
		/** Used when the image has no alt text of its own */
		alt: string;
		sizes: string;
		/** For the image at the top of the page (the LCP element): load right away, high priority */
		eager?: boolean;
		/** `view-transition-name`, so the cover morphs between a listing and the article */
		transitionName?: string;
	} = $props();

	const url = (width: number) => mediaUrl(MEDIA_BASE_URL, variantKey(image!.key, width));
	const srcset = $derived(image?.variants.map((w) => `${url(w)} ${w}w`).join(', '));
</script>

<!-- Always 16:9, center-cropped. Articles without an image get a branded placeholder -->
<div class="cover" style:view-transition-name={transitionName}>
	{#if image && image.variants.length}
		<img
			src={url(pickVariant(image.variants))}
			{srcset}
			{sizes}
			alt={image.alt ?? alt}
			width={image.width}
			height={image.height}
			loading={eager ? 'eager' : 'lazy'}
			fetchpriority={eager ? 'high' : undefined}
			decoding="async"
		/>
	{:else}
		<div class="placeholder">
			<img src="/logo-128.webp" alt="" width="128" height="128" />
		</div>
	{/if}
</div>

<style>
	.cover {
		position: relative;
		aspect-ratio: 16 / 9;
		overflow: hidden;
		border-radius: var(--cover-radius, var(--radius-card));
		background: var(--surface-2);
		/* Lets site.css clip the morphing snapshot; radius on this node is what gets captured */
		view-transition-class: cover;
	}

	.cover > img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.placeholder {
		display: grid;
		place-items: center;
		height: 100%;
		background:
			radial-gradient(circle at 30% 20%, rgb(42 161 26 / 0.45), transparent 60%),
			linear-gradient(135deg, #0c1628, #16301a);
	}

	.placeholder img {
		width: 28%;
		max-width: 6rem;
		height: auto;
		opacity: 0.9;
	}
</style>
