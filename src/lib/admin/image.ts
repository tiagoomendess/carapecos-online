import { variantWidthsFor } from '#lib/media.ts';

/**
 * Browser-side image preparation for uploads: every size is made here, once, so the server
 * (a Worker, which can't resize images) only stores files. See "Images" in DRAFT.md.
 */

export interface PreparedImage {
	/** Kept as uploaded when possible; re-encoded when cropped */
	original: Blob;
	originalName: string;
	width: number;
	height: number;
	variants: { width: number; blob: Blob }[];
}

const keepAsIs = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const maxOriginalWidth = 2400;

/**
 * @param crop For covers: crop to 16:9. `position` (0–1) is where the frame sits along the
 * side that's too long: 0 = top/left, 0.5 = centered, 1 = bottom/right.
 */
export async function prepareImage(
	file: File,
	{ crop }: { crop?: { position: number } } = {}
): Promise<PreparedImage> {
	const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
	try {
		let sx = 0;
		let sy = 0;
		let sw = bitmap.width;
		let sh = bitmap.height;
		if (crop) {
			const aspect = 16 / 9;
			if (sw / sh > aspect) {
				sw = Math.round(sh * aspect);
				sx = Math.round((bitmap.width - sw) * crop.position);
			} else {
				sh = Math.round(sw / aspect);
				sy = Math.round((bitmap.height - sh) * crop.position);
			}
		}

		const draw = (width: number) => {
			const height = Math.round((sh * width) / sw);
			const canvas = document.createElement('canvas');
			canvas.width = width;
			canvas.height = height;
			const context = canvas.getContext('2d')!;
			context.imageSmoothingQuality = 'high';
			context.drawImage(bitmap, sx, sy, sw, sh, 0, 0, width, height);
			return canvas;
		};

		const variants = [];
		for (const width of variantWidthsFor(sw)) {
			variants.push({ width, blob: await toWebp(draw(width), 0.8) });
		}

		const reencode = crop || !keepAsIs.has(file.type) || sw > maxOriginalWidth * 1.5;
		const originalWidth = Math.min(sw, maxOriginalWidth);
		const original = reencode ? await toWebp(draw(originalWidth), 0.9) : file;
		const width = reencode ? originalWidth : sw;
		const height = reencode ? Math.round((sh * originalWidth) / sw) : sh;

		return { original, originalName: file.name, width, height, variants };
	} finally {
		bitmap.close();
	}
}

/** WebP from a canvas. Safari can't encode WebP natively, so it falls back to a WASM encoder. */
async function toWebp(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
	const native = await new Promise<Blob | null>((resolve) =>
		canvas.toBlob(resolve, 'image/webp', quality)
	);
	if (native?.type === 'image/webp') return native;

	const { default: encode } = await import('@jsquash/webp/encode');
	const pixels = canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height);
	const buffer = await encode(pixels, { quality: quality * 100 });
	return new Blob([buffer], { type: 'image/webp' });
}

/** Sends a prepared image to the media library; returns the stored media */
export async function uploadImage(image: PreparedImage, alt = '') {
	const form = new FormData();
	form.set('original', image.original, image.originalName);
	form.set('width', String(image.width));
	form.set('height', String(image.height));
	form.set('alt', alt);
	for (const variant of image.variants) form.set(`w${variant.width}`, variant.blob);

	const res = await fetch('/admin/api/media', { method: 'POST', body: form });
	if (!res.ok) {
		const body = (await res.json().catch(() => null)) as { message?: string } | null;
		throw new Error(body?.message ?? res.statusText);
	}
	return (await res.json()) as AdminMedia;
}

/** Media as the backoffice sees it */
export interface AdminMedia {
	id: string;
	key: string;
	originalName: string | null;
	mimeType: string;
	width: number;
	height: number;
	variants: number[];
	alt: string | null;
	createdAt: string;
}

/** What the editor needs to show and reference an image */
export type MediaRef = Pick<
	AdminMedia,
	'id' | 'key' | 'variants' | 'alt' | 'originalName' | 'width' | 'height'
>;
